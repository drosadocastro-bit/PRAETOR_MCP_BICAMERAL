import { describe, it, expect } from 'vitest';
import { LLMJudgeEvaluator } from '../src/evaluator/llmJudgeEvaluator.js';
import { EVAL_CORPUS_FIXTURES } from '../src/evaluator/corpus.js';

describe('PRAETOR-EVAL-001: k=3 Parallel LLM Judge Microbenchmark', () => {
  const judge = new LLMJudgeEvaluator();

  it('measures wall-clock latency, token usage, and majority-vote stabilization across k=3 fan-out', async () => {
    const targetFixtureIds = ['EVAL-001', 'EVAL-007', 'EVAL-012', 'EVAL-018', 'EVAL-019', 'EVAL-023', 'EVAL-027'];

    for (const id of targetFixtureIds) {
      const fixture = EVAL_CORPUS_FIXTURES.find(f => f.id === id)!;

      // Single call (rep 1)
      const singleRes = await judge.evaluate(fixture, 1);

      // Concurrent k=3 parallel calls
      const t0 = Date.now();
      const k3Res = await Promise.all([
        judge.evaluate(fixture, 1),
        judge.evaluate(fixture, 2),
        judge.evaluate(fixture, 3)
      ]);
      const fanOutWallClockMs = Date.now() - t0;

      const singleTokens = singleRes.tokenUsage.totalTokens;
      const k3Tokens = k3Res.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0);

      // Confirm ~3x token scaling (within completion token variance)
      expect(Math.abs(k3Tokens - singleTokens * 3)).toBeLessThanOrEqual(15);

      // Compute majority vote among the 3 calls
      const counts: Record<string, number> = { PASS: 0, REVIEW: 0, FAIL: 0 };
      k3Res.forEach(r => counts[r.decision]++);
      let k3Mode = 'FAIL';
      let maxCount = -1;
      for (const d of ['FAIL', 'REVIEW', 'PASS']) {
        if (counts[d] > maxCount) {
          maxCount = counts[d];
          k3Mode = d;
        }
      }

      // Compute k=20 majority vote
      const k20Res = await Promise.all(
        Array.from({ length: 20 }, (_, i) => judge.evaluate(fixture, i + 1))
      );
      const k20Counts: Record<string, number> = { PASS: 0, REVIEW: 0, FAIL: 0 };
      k20Res.forEach(r => k20Counts[r.decision]++);
      let k20Mode = 'FAIL';
      let maxK20 = -1;
      for (const d of ['FAIL', 'REVIEW', 'PASS']) {
        if (k20Counts[d] > maxK20) {
          maxK20 = k20Counts[d];
          k20Mode = d;
        }
      }

      // Check concordance: k=3 majority vote matches k=20 majority vote
      expect(k3Mode).toBe(k20Mode);

      // Verify known noisy fixtures (EVAL-007, 012, 023, 027) evaluate to FAIL under k=3 majority vote
      if (['EVAL-007', 'EVAL-012', 'EVAL-023', 'EVAL-027'].includes(id)) {
        expect(k3Mode).toBe('FAIL');
      }
    }
  });
});
