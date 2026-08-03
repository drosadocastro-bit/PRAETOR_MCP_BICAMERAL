import { describe, expect, it } from 'vitest';

import { compareEvidence, createComparisonHandoff, validateComparisonHandoff } from '../src/agent/evidenceComparison.js';
import type { EvidenceItem } from '../src/types.js';

function evidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    source_id: 'REC-001',
    source_type: 'MCP_RETRIEVED',
    timestamp: '2026-07-29T12:00:00.000Z',
    excerpt: 'Synthetic inspection observed recurring vibration.',
    provenance_metadata: 'Synthetic fixture provenance.',
    uncertainty_notes: ['Root cause not established.'],
    independence_group: 'inspection-2026-07',
    assessment: 'elevated',
    ...overrides
  };
}

describe('bounded evidence comparison experiment', () => {
  it('flags contradictory assessments without producing authority', () => {
    const result = compareEvidence([
      evidence(),
      evidence({ source_id: 'REC-002', independence_group: 'maintenance-2026-07', assessment: 'normal' })
    ]);

    expect(result.status).toBe('compared');
    expect(result.contradiction_detected).toBe(true);
    expect(result.authoritative).toBe(false);
    expect(result.human_review_required).toBe(true);
  });

  it('does not count duplicate lineage as independent corroboration', () => {
    const result = compareEvidence([
      evidence(),
      evidence({ source_id: 'SUMMARY-001', derived_from_source_id: 'REC-001', independence_group: 'summary-2026-07' })
    ]);

    expect(result.duplicate_lineage_detected).toBe(true);
    expect(result.independence_groups).toEqual(['inspection-2026-07']);
    expect(result.flags).toContain('duplicate_or_derived_lineage');
  });

  it('refuses incomplete provenance', () => {
    const result = compareEvidence([evidence({ provenance_metadata: '' })]);

    expect(result.status).toBe('refused');
    expect(result.provenance_incomplete).toBe(true);
    expect(result.confidence).toBe(0);
  });

  it('refuses chat, model, and unknown origins as authorized evidence', () => {
    const result = compareEvidence([evidence({ source_type: 'CHAT_CLAIM' })]);

    expect(result.status).toBe('refused');
    expect(result.disallowed_origin_detected).toBe(true);
    expect(result.flags).toContain('no_authorized_evidence');
  });

  it('refuses mission-drift authority language', () => {
    const result = compareEvidence([evidence({ excerpt: 'The equipment is safe to operate.' })]);

    expect(result.status).toBe('refused');
    expect(result.mission_drift_detected).toBe(true);
    expect(result.summary).not.toMatch(/safe to operate/i);
  });

  it('bounds oversized evidence collections', () => {
    const result = compareEvidence(Array.from({ length: 40 }, (_, index) => evidence({ source_id: `REC-${index}` })));

    expect(result.flags).toContain('evidence_count_exceeded');
    expect(result.source_ids).toHaveLength(32);
  });

  it('returns only bounded, non-authoritative analysis for valid evidence', () => {
    const result = compareEvidence([evidence()]);

    expect(result.status).toBe('compared');
    expect(result.confidence).toBeLessThanOrEqual(0.49);
    expect(result.authoritative).toBe(false);
    expect(result.summary).toContain('Untrusted comparison only');
  });

  it('hands off analysis without creating an evidence or authority channel', () => {
    const handoff = createComparisonHandoff(compareEvidence([evidence()]));

    expect(validateComparisonHandoff(handoff)).toBe(true);
    expect(handoff.handoff_type).toBe('untrusted_comparison_analysis');
    expect(handoff.independent_corroboration).toBe(false);
    expect(handoff.authoritative).toBe(false);
  });

  it('rejects a forged handoff that launders authority or confidence', () => {
    const handoff = createComparisonHandoff(compareEvidence([evidence()]));

    expect(validateComparisonHandoff({ ...handoff, authoritative: true })).toBe(false);
    expect(validateComparisonHandoff({ ...handoff, human_review_required: false })).toBe(false);
    expect(validateComparisonHandoff({ ...handoff, confidence: 0.9 })).toBe(false);
    expect(validateComparisonHandoff({ ...handoff, independent_corroboration: true })).toBe(false);
  });
});
