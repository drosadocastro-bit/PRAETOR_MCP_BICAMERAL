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
});
