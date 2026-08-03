import { describe, expect, it } from 'vitest';

import { calculatePrototypeMetrics } from '../src/metrics.js';
import { evaluateAdvisoryPacket } from '../src/governance.js';
import { scenarioFixtures } from '../src/scenarios.js';
import type { AdvisoryPacketRecord } from '../src/types.js';

describe('governance', () => {
  it.each(scenarioFixtures)('returns the expected verdict for $name', scenario => {
    const outcome = evaluateAdvisoryPacket(scenario.packet);
    expect(outcome.verdict).toBe(scenario.expected_verdict);
  });

  it('caps weak evidence and requires human review', () => {
    const outcome = evaluateAdvisoryPacket(scenarioFixtures[1].packet);
    expect(outcome.capped_confidence).toBeLessThan(0.5);
    expect(outcome.human_review_required).toBe(true);
  });

  it('blocks mission drift language', () => {
    const outcome = evaluateAdvisoryPacket(scenarioFixtures[4].packet);
    expect(outcome.verdict).toBe('unsafe');
    expect(outcome.guardrail_results.some(result => result.check === 'mission_boundary' && result.status === 'block')).toBe(true);
  });

  it.each([
    'must replace',
    'confirmed failure',
    'maintenance action required',
    'authorized corrective action',
    'system determines',
    'safe to operate',
    'unsafe to operate'
  ])('blocks forbidden phrase: %s', phrase => {
    const outcome = evaluateAdvisoryPacket({
      ...scenarioFixtures[5].packet,
      packet_id: `PKT-DRIFT-${phrase.replace(/\s+/g, '-')}`,
      finding: phrase
    });

    expect(outcome.verdict).toBe('unsafe');
    expect(outcome.human_review_required).toBe(true);
    expect(outcome.guardrail_results.some(result => result.check === 'mission_boundary' && result.status === 'block')).toBe(true);
  });

  it('detects false consensus as untrusted', () => {
    const outcome = evaluateAdvisoryPacket(scenarioFixtures[3].packet);
    expect(outcome.verdict).toBe('untrusted');
    expect(outcome.guardrail_results.some(result => result.check === 'false_consensus' && result.status === 'flag')).toBe(true);
  });

  it('computes prototype metrics from stored packets', () => {
    const packets: AdvisoryPacketRecord[] = scenarioFixtures.map(scenario => {
      const outcome = evaluateAdvisoryPacket(scenario.packet);
      return {
        ...scenario.packet,
        source_ids: scenario.packet.supporting_evidence.map(evidence => evidence.source_id),
        evidence_summary: scenario.packet.supporting_evidence.map(evidence => `${evidence.source_id}: ${evidence.excerpt}`).join(' | '),
        contradiction_status: scenario.id === 'scenario-3' ? 'present' : 'not_detected',
        circular_evidence_status: scenario.id === 'scenario-4' ? 'present' : 'not_detected',
        integrity_verdict: outcome.verdict,
        integrity_summary: outcome.summary,
        stored_at: '2026-07-23T00:00:00.000Z',
        guardrail_results: outcome.guardrail_results
      };
    });

    const metrics = calculatePrototypeMetrics(packets);
    expect(metrics.total_packets).toBe(6);
    expect(metrics.mission_drift_blocked).toBeGreaterThanOrEqual(1);
    expect(metrics.false_consensus_detected).toBeGreaterThanOrEqual(1);
  });
});
