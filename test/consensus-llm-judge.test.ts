import { describe, it, expect } from 'vitest';
import { ConsensusLLMJudgeEvaluator, LLMJudgeEvaluator } from '../src/evaluator/llmJudgeEvaluator.js';
import { EVAL_CORPUS_FIXTURES } from '../src/evaluator/corpus.js';
import { EvalFixture, LLMJudgeResult } from '../src/evaluator/types.js';

describe('ConsensusLLMJudgeEvaluator', () => {
  const baseJudge = new LLMJudgeEvaluator();
  const consensusJudge = new ConsensusLLMJudgeEvaluator(baseJudge, 3);

  it('executes k=3 fan-out and attaches voteDistribution, consensusK, and confidenceRatio', async () => {
    const fixture = EVAL_CORPUS_FIXTURES.find(f => f.id === 'EVAL-001')!;
    const res = await consensusJudge.evaluate(fixture, 1);

    expect(res.consensusK).toBe(3);
    expect(res.confidenceRatio).toBeGreaterThanOrEqual(0.67);
    expect(res.voteDistribution).toBeDefined();
    expect(res.voteDistribution?.PASS).toBeDefined();
    expect(res.voteDistribution?.REVIEW).toBeDefined();
    expect(res.voteDistribution?.FAIL).toBeDefined();

    const sumVotes =
      (res.voteDistribution?.PASS || 0) +
      (res.voteDistribution?.REVIEW || 0) +
      (res.voteDistribution?.FAIL || 0);
    expect(sumVotes).toBe(3);
  });

  it('falls back to REVIEW on a 3-way tie when no decision reaches majority threshold', async () => {
    // Mock base judge that returns PASS on rep 1, REVIEW on rep 2, FAIL on rep 3
    const mockBaseJudge = {
      evaluate: async (_fixture: EvalFixture, rep: number): Promise<LLMJudgeResult> => {
        const decisions: ('PASS' | 'REVIEW' | 'FAIL')[] = ['PASS', 'REVIEW', 'FAIL'];
        const decision = decisions[(rep - 1) % 3];
        return {
          decision,
          confidence: 0.8,
          reasonCodes: [`TEST_${decision}`],
          semanticQuality: 2.0,
          evidenceGrounding: 0.8,
          instructionCompliance: 0.8,
          explanation: `Mock decision ${decision}`,
          latencyMs: 50,
          tokenUsage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 }
        };
      }
    } as LLMJudgeEvaluator;

    const tieJudge = new ConsensusLLMJudgeEvaluator(mockBaseJudge, 3);
    const fixture = EVAL_CORPUS_FIXTURES[0];
    const res = await tieJudge.evaluate(fixture, 1);

    expect(res.decision).toBe('REVIEW'); // Explicit fallback on 3-way tie
    expect(res.voteDistribution).toEqual({ PASS: 1, REVIEW: 1, FAIL: 1 });
    expect(res.consensusK).toBe(3);
    expect(res.confidenceRatio).toBe(0.33);
  });

  it('aggregates tokens accurately across k=3 fan-out workers', async () => {
    const fixture = EVAL_CORPUS_FIXTURES[0];
    const singleRes = await baseJudge.evaluate(fixture, 1);
    const consensusRes = await consensusJudge.evaluate(fixture, 1);

    // Sum of tokens across 3 workers
    expect(consensusRes.tokenUsage.totalTokens).toBeGreaterThanOrEqual(singleRes.tokenUsage.totalTokens * 2.5);
  });

  it('calculates confidenceScore correctly: 1.0 for unanimous 3-0 and 0.66 for 2-1 split', async () => {
    // Unanimous 3-0 mock
    const unanimousMock = {
      evaluate: async (): Promise<LLMJudgeResult> => ({
        decision: 'PASS',
        confidence: 0.9,
        reasonCodes: [],
        semanticQuality: 3.0,
        evidenceGrounding: 1.0,
        instructionCompliance: 1.0,
        explanation: 'PASS',
        latencyMs: 50,
        tokenUsage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 }
      })
    } as LLMJudgeEvaluator;

    const judge3_0 = new ConsensusLLMJudgeEvaluator(unanimousMock, 3);
    const res3_0 = await judge3_0.evaluate(EVAL_CORPUS_FIXTURES[0], 1);
    expect(res3_0.confidenceScore).toBe(1.0);

    // 2-1 split mock (PASS, PASS, FAIL)
    const splitMock = {
      evaluate: async (_f: EvalFixture, rep: number): Promise<LLMJudgeResult> => ({
        decision: rep === 3 ? 'FAIL' : 'PASS',
        confidence: 0.8,
        reasonCodes: [],
        semanticQuality: 2.5,
        evidenceGrounding: 0.9,
        instructionCompliance: 0.9,
        explanation: 'Decided',
        latencyMs: 50,
        tokenUsage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 }
      })
    } as LLMJudgeEvaluator;

    const judge2_1 = new ConsensusLLMJudgeEvaluator(splitMock, 3);
    const res2_1 = await judge2_1.evaluate(EVAL_CORPUS_FIXTURES[0], 1);
    expect(res2_1.voteDistribution).toEqual({ PASS: 2, REVIEW: 0, FAIL: 1 });
    expect(res2_1.confidenceScore).toBe(0.66);
  });

  it('retries worker calls on transient error with exponential backoff and succeeds', async () => {
    const attemptsPerWorker: Record<number, number> = {};

    const flakyMock = {
      evaluate: async (_f: EvalFixture, rep: number): Promise<LLMJudgeResult> => {
        attemptsPerWorker[rep] = (attemptsPerWorker[rep] || 0) + 1;
        // Worker 2 fails on first attempt with 503 Transient Error, then succeeds
        if (rep === 2 && attemptsPerWorker[rep] === 1) {
          throw new Error('503 Service Unavailable (Transient Error)');
        }
        return {
          decision: 'PASS',
          confidence: 0.9,
          reasonCodes: [],
          semanticQuality: 3.0,
          evidenceGrounding: 1.0,
          instructionCompliance: 1.0,
          explanation: `Worker ${rep} success`,
          latencyMs: 40,
          tokenUsage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 }
        };
      }
    } as LLMJudgeEvaluator;

    const retryJudge = new ConsensusLLMJudgeEvaluator(flakyMock, 3, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffFactor: 2
    });

    const res = await retryJudge.evaluate(EVAL_CORPUS_FIXTURES[0], 1);
    expect(res.decision).toBe('PASS');
    expect(res.confidenceScore).toBe(1.0);
    expect(attemptsPerWorker[2]).toBe(2); // Worker 2 retried once and succeeded
  });

  it('throws error when maxRetries is exceeded on persistent failure', async () => {
    const failingMock = {
      evaluate: async (): Promise<LLMJudgeResult> => {
        throw new Error('500 Internal Server Error');
      }
    } as LLMJudgeEvaluator;

    const failJudge = new ConsensusLLMJudgeEvaluator(failingMock, 3, {
      maxRetries: 2,
      initialDelayMs: 5,
      backoffFactor: 2
    });

    await expect(failJudge.evaluate(EVAL_CORPUS_FIXTURES[0], 1)).rejects.toThrow('500 Internal Server Error');
  });

  it('tracks cumulative token usage and estimated cost overhead across multiple evaluations', async () => {
    const fixture = EVAL_CORPUS_FIXTURES[0];
    const judge = new ConsensusLLMJudgeEvaluator(baseJudge, 3);

    const res1 = await judge.evaluate(fixture, 1);
    expect(res1.tokenUsage.estimatedCostUsd).toBeGreaterThan(0);

    const res2 = await judge.evaluate(fixture, 2);
    expect(res2.tokenUsage.estimatedCostUsd).toBeGreaterThan(0);

    const metrics = judge.getUsageMetrics();
    expect(metrics.totalEvaluations).toBe(2);
    expect(metrics.totalTokens).toBe(res1.tokenUsage.totalTokens + res2.tokenUsage.totalTokens);
    expect(metrics.estimatedCostUsd).toBeGreaterThan(0);
    expect(metrics.averageTokensPerEval).toBeGreaterThan(0);

    const middleware = judge.getUsageMiddleware();
    const logOutput = middleware.logSummary('EVAL-TEST');
    expect(logOutput).toContain('[Consensus Usage Overhead - EVAL-TEST]');
    expect(logOutput).toContain('Estimated Cost');
  });

  it('monitors rolling average confidence score over 50 requests and triggers system alert when below 0.7', async () => {
    let alertTriggeredCount = 0;
    let lastAlertMessage = '';

    const lowConfidenceMock = {
      evaluate: async (_f: EvalFixture, rep: number): Promise<LLMJudgeResult> => {
        // rep 1: PASS, rep 2: REVIEW, rep 3: FAIL => 3-way tie gives confidenceScore = 0.33
        const decisions: ('PASS' | 'REVIEW' | 'FAIL')[] = ['PASS', 'REVIEW', 'FAIL'];
        const decision = decisions[(rep - 1) % 3];
        return {
          decision,
          confidence: 0.5,
          reasonCodes: [],
          semanticQuality: 2.0,
          evidenceGrounding: 0.5,
          instructionCompliance: 0.5,
          explanation: 'Low confidence test',
          latencyMs: 30,
          tokenUsage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 }
        };
      }
    } as LLMJudgeEvaluator;

    const judge = new ConsensusLLMJudgeEvaluator(lowConfidenceMock, 3, {
      confidenceMonitorOptions: {
        windowSize: 50,
        alertThreshold: 0.7,
        onAlert: (alert) => {
          alertTriggeredCount++;
          lastAlertMessage = alert.message;
        }
      }
    });

    const monitor = judge.getConfidenceMonitor();

    // Evaluate once: score will be 0.33 (< 0.7 threshold)
    await judge.evaluate(EVAL_CORPUS_FIXTURES[0], 1);

    expect(monitor.getAverageConfidence()).toBe(0.33);
    expect(monitor.isAlertActive()).toBe(true);
    expect(alertTriggeredCount).toBe(1);
    expect(lastAlertMessage).toContain('SYSTEM ALERT');

    // Simulate filling buffer with high confidence scores (1.0)
    for (let i = 0; i < 50; i++) {
      monitor.record(1.0);
    }

    expect(monitor.getAverageConfidence()).toBe(1.0);
    expect(monitor.isAlertActive()).toBe(false);

    // Now record 50 scores of 0.66 (below 0.7 threshold)
    for (let i = 0; i < 50; i++) {
      monitor.record(0.66);
    }

    expect(monitor.getAverageConfidence()).toBe(0.66);
    expect(monitor.isAlertActive()).toBe(true);
    const status = monitor.getAlertStatus();
    expect(status.isAlert).toBe(true);
    expect(status.threshold).toBe(0.7);
    expect(status.windowSize).toBe(50);
  });

  it('generates a CSV export of cumulative token usage and cost overhead data for audit purposes', async () => {
    const fixture = EVAL_CORPUS_FIXTURES[0];
    const judge = new ConsensusLLMJudgeEvaluator(baseJudge, 3);

    await judge.evaluate(fixture, 1);
    await judge.evaluate(fixture, 2);

    const csvOutput = judge.exportUsageCSV();
    expect(csvOutput).toContain('Metric,Value,Unit,Description');
    expect(csvOutput).toContain('Consensus_K_Workers,3,workers');
    expect(csvOutput).toContain('Total_Evaluations,2,evaluations');
    expect(csvOutput).toContain('Total_Prompt_Tokens');
    expect(csvOutput).toContain('Total_Completion_Tokens');
    expect(csvOutput).toContain('Total_Tokens');
    expect(csvOutput).toContain('Total_Estimated_Cost_USD');
    expect(csvOutput).toContain('Average_Tokens_Per_Eval');
    expect(csvOutput).toContain('Average_Cost_Per_Eval_USD');
    expect(csvOutput).toContain('Audit_Export_Timestamp');

    const middleware = judge.getUsageMiddleware();
    const directCsv = middleware.exportCSV(3);
    expect(directCsv).toContain('Consensus_K_Workers,3,workers');
    expect(directCsv).toContain('Total_Evaluations,2,evaluations');
  });
});
