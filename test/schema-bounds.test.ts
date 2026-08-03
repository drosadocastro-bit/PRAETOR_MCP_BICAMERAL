import { describe, expect, it } from 'vitest';

import { AdvisoryPacketSchema } from '../src/schema.js';

function validPacket() {
  return {
    advisory_id: 'ADV-BOUNDS',
    equipment_id: 'PRA-BOUNDS',
    subsystem: 'hydraulic',
    component: 'pump seal',
    finding: 'Synthetic finding.',
    evidence_summary: 'Synthetic evidence summary.',
    source_ids: ['SRC-BOUNDS'],
    provenance: 'Synthetic provenance.',
    supporting_evidence: [{
      source_id: 'SRC-BOUNDS',
      source_type: 'synthetic_log',
      timestamp: '2026-07-01T00:00:00.000Z',
      excerpt: 'Synthetic excerpt.',
      provenance_metadata: 'Synthetic provenance metadata.',
      uncertainty_notes: ['Synthetic uncertainty.'],
      independence_group: 'GROUP-BOUNDS'
    }],
    confidence: 0.5,
    uncertainty: ['Synthetic uncertainty.'],
    contradiction_status: 'not_detected' as const,
    circular_evidence_status: 'not_detected' as const,
    human_review_required: true as const,
    advisory_only_statement: 'Advisory only; requires human review.',
    guardrail_results: [{
      check: 'evidence_presence' as const,
      guardrail: 'evidence presence',
      status: 'pass' as const,
      detail: 'Evidence is present.',
      severity: 'low' as const,
      reason: 'Synthetic fixture.',
      affected_fields: ['supporting_evidence'],
      recommended_action: 'Review the evidence.'
    }],
    integrity_verdict: 'doubtful' as const
  };
}

describe('advisory packet resource bounds', () => {
  it.each([
    ['uncertainty', { uncertainty: Array.from({ length: 101 }, () => 'note') }],
    ['source_ids', { source_ids: Array.from({ length: 101 }, (_, index) => `SRC-${index}`) }],
    ['guardrail_results', { guardrail_results: Array.from({ length: 51 }, () => validPacket().guardrail_results[0]) }],
    ['advisory_only_statement', { advisory_only_statement: 'x'.repeat(5001) }]
  ])('rejects an oversized %s field', (_field, override) => {
    expect(AdvisoryPacketSchema.safeParse({ ...validPacket(), ...override }).success).toBe(false);
  });

  it('rejects oversized nested evidence notes and guardrail field lists', () => {
    const packet = validPacket();
    packet.supporting_evidence[0].uncertainty_notes = Array.from({ length: 26 }, () => 'note');
    expect(AdvisoryPacketSchema.safeParse(packet).success).toBe(false);

    const guardrail = validPacket().guardrail_results[0];
    guardrail.affected_fields = Array.from({ length: 51 }, (_, index) => `field-${index}`);
    expect(AdvisoryPacketSchema.safeParse({ ...validPacket(), guardrail_results: [guardrail] }).success).toBe(false);
  });
});
