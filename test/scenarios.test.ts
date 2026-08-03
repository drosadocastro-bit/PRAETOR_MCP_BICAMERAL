import { describe, expect, it } from 'vitest';

import { evaluateAdvisoryPacket } from '../src/governance.js';
import { scenarioFixtures } from '../src/scenarios.js';

describe('scenario battery', () => {
  it('covers the six fixed prototype scenarios', () => {
    expect(scenarioFixtures).toHaveLength(6);
  });

  it.each(scenarioFixtures)('keeps $name aligned with the battery', scenario => {
    const outcome = evaluateAdvisoryPacket(scenario.packet);
    expect(outcome.verdict).toBe(scenario.expected_verdict);
    expect(outcome.summary.length).toBeGreaterThan(0);
  });
});
