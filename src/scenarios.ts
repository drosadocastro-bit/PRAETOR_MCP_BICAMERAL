import type { AdvisoryPacketDraft, EvidenceItem, IntegrityVerdict } from './types.js';

function baseEvidence(sourceId: string, excerpt: string, overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    source_id: sourceId,
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-07-01T00:00:00.000Z',
    excerpt,
    provenance_metadata: 'Scenario fixture evidence.',
    uncertainty_notes: ['Fixture evidence.'],
    independence_group: sourceId,
    assessment: 'elevated',
    ...overrides
  };
}

export interface ScenarioFixture {
  id: string;
  name: string;
  packet: AdvisoryPacketDraft;
  expected_verdict: IntegrityVerdict;
}

export const scenarioFixtures: ScenarioFixture[] = [
  {
    id: 'scenario-1',
    name: 'Strong evidence pattern',
    expected_verdict: 'safe',
    packet: {
      packet_id: 'PKT-S1',
      finding: 'Repeated vibration and seal wear may indicate a recurring hydraulic issue.',
      equipment_id: 'PRA-401',
      supporting_evidence: [
        baseEvidence('SRC-S1-A', 'Repeated vibration observed during warm-up.', { source_type: 'synthetic_inspection_log' }),
        baseEvidence('SRC-S1-B', 'Independent technician note confirms the same pattern.', { source_type: 'synthetic_technician_note' })
      ],
      confidence: 0.76,
      uncertainty: ['Root cause is still unconfirmed.'],
      human_review_required: false,
      advisory_only_statement: 'Evidence suggests the recurring pattern should be reviewed by a human.'
    }
  },
  {
    id: 'scenario-2',
    name: 'Weak evidence',
    expected_verdict: 'doubtful',
    packet: {
      packet_id: 'PKT-S2',
      finding: 'A single vague note may indicate a noise anomaly.',
      equipment_id: 'PRA-402',
      supporting_evidence: [baseEvidence('SRC-S2-A', 'Might be normal airflow noise.', { source_type: 'synthetic_technician_note', assessment: 'uncertain', confidence_hint: 0.31 })],
      confidence: 0.3,
      uncertainty: ['Only one note exists.', 'No corroboration available.'],
      human_review_required: true,
      advisory_only_statement: 'Evidence suggests the note should be reviewed.'
    }
  },
  {
    id: 'scenario-3',
    name: 'Contradictory evidence',
    expected_verdict: 'doubtful',
    packet: {
      packet_id: 'PKT-S3',
      finding: 'The cooling trend is unresolved and should be reviewed.',
      equipment_id: 'PRA-403',
      supporting_evidence: [
        baseEvidence('SRC-S3-A', 'Temperature rise accompanied the fan noise.', { source_type: 'synthetic_inspection_log', assessment: 'elevated' }),
        baseEvidence('SRC-S3-B', 'Follow-up returned to normal range.', { source_type: 'synthetic_followup_report', assessment: 'normal' })
      ],
      confidence: 0.54,
      uncertainty: ['Conflicting observations remain unresolved.'],
      human_review_required: true,
      advisory_only_statement: 'This contradictory set requires human review.'
    }
  },
  {
    id: 'scenario-4',
    name: 'False consensus',
    expected_verdict: 'untrusted',
    packet: {
      packet_id: 'PKT-S4',
      finding: 'Three advisories point to the same upstream case and do not confirm the claim independently.',
      equipment_id: 'PRA-404',
      supporting_evidence: [
        baseEvidence('SRC-S4-A', 'Repeated advisory trace.', { source_type: 'synthetic_case_note', independence_group: 'shared-upstream' }),
        baseEvidence('SRC-S4-A', 'Repeated advisory trace.', { source_type: 'synthetic_case_note', independence_group: 'shared-upstream' }),
        baseEvidence('SRC-S4-A', 'Repeated advisory trace.', { source_type: 'synthetic_case_note', independence_group: 'shared-upstream' })
      ],
      confidence: 0.61,
      uncertainty: ['No independent confirmation exists.'],
      human_review_required: true,
      advisory_only_statement: 'Consensus here is not independent evidence.'
    }
  },
  {
    id: 'scenario-5',
    name: 'Mission drift',
    expected_verdict: 'unsafe',
    packet: {
      packet_id: 'PKT-S5',
      finding: 'Maintenance action required for the relay.',
      equipment_id: 'PRA-404',
      supporting_evidence: [baseEvidence('SRC-S5-A', 'One case note was observed.', { source_type: 'synthetic_case_note', assessment: 'uncertain' })],
      confidence: 0.4,
      uncertainty: ['The language is intentionally unsafe for testing.'],
      human_review_required: true,
      advisory_only_statement: 'The system confirms failure and maintenance action required.'
    }
  },
  {
    id: 'scenario-6',
    name: 'Write-gated submission',
    expected_verdict: 'doubtful',
    packet: {
      packet_id: 'PKT-S6',
      finding: 'The harness signal drop may indicate a recurring connection issue.',
      equipment_id: 'PRA-405',
      supporting_evidence: [baseEvidence('SRC-S6-A', 'Intermittent signal drop appears when harness flexes.', { source_type: 'synthetic_inspection_log' })],
      confidence: 0.45,
      uncertainty: ['Only one observation exists for now.'],
      human_review_required: true,
      advisory_only_statement: 'Evidence suggests this should be reviewed as an advisory only packet.'
    }
  }
];
