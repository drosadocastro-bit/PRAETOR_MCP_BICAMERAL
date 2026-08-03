export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SyntheticMaintenanceRecord {
  record_id: string;
  equipment_id: string;
  subsystem: string;
  component: string;
  event_date: string;
  event_type: string;
  anomaly_code: string;
  severity: Severity;
  technician_note: string;
  corrective_action: string;
  recurrence_count: number;
  source_id: string;
  source_type: string;
  confidence_hint: number;
  independence_group: string;
  assessment: 'elevated' | 'stable' | 'normal' | 'uncertain';
}

export interface SyntheticSourceMetadata {
  source_id: string;
  source_type: string;
  timestamp: string;
  title: string;
  provenance_metadata: string;
  independence_group: string;
  uncertainty_notes: string[];
}

export interface SyntheticDocumentExcerpt {
  excerpt_id: string;
  source_id: string;
  source_type: string;
  timestamp: string;
  equipment_id: string;
  anomaly_code: string;
  excerpt: string;
  provenance_metadata: string;
  uncertainty_notes: string[];
  independence_group: string;
}

export interface SyntheticPriorCase {
  case_id: string;
  source_id: string;
  source_type: string;
  timestamp: string;
  equipment_id: string;
  anomaly_code: string;
  finding: string;
  excerpt: string;
  provenance_metadata: string;
  uncertainty_notes: string[];
  independence_group: string;
}

export interface EvidenceItem {
  source_id: string;
  source_type: string;
  timestamp: string;
  excerpt: string;
  provenance_metadata: string;
  uncertainty_notes: string[];
  independence_group: string;
  assessment?: 'elevated' | 'stable' | 'normal' | 'uncertain';
  confidence_hint?: number;
  derived_from_source_id?: string;
  upstream_assumption?: string;
  declared_paraphrase_group?: string;
}

export type IntegrityVerdict = 'safe' | 'doubtful' | 'unsafe' | 'untrusted';

export interface GuardrailResult {
  check:
    | 'evidence_presence'
    | 'evidence_support'
    | 'provenance_required'
    | 'generated_output_boundary'
    | 'speculation_boundary'
    | 'temporal_precision'
    | 'confidence_boundary'
    | 'human_review_boundary'
    | 'mission_boundary'
    | 'false_consensus'
    | 'contradiction_handling'
    | 'schema_validation'
    | 'evaluator_manipulation'
    | 'retry_pressure';
  guardrail: string;
  status: 'pass' | 'flag' | 'block';
  detail: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  affected_fields: string[];
  recommended_action: string;
}

export interface EvidenceIndependence {
  independent_source_count: number;
  total_evidence_count: number;
  shared_source_ids: string[];
  dependency_risk: 'low' | 'medium' | 'high';
  notes: string;
  repeated_excerpt_count?: number;
}

export interface AdvisoryPacketDraft {
  packet_id?: string;
  advisory_id?: string;
  finding: string;
  equipment_id: string;
  subsystem?: string;
  component?: string;
  evidence_summary?: string;
  source_ids?: string[];
  provenance?: string;
  supporting_evidence: EvidenceItem[];
  confidence: number;
  uncertainty: string[];
  contradiction_status?: 'present' | 'not_detected';
  circular_evidence_status?: 'present' | 'not_detected';
  human_review_required: boolean;
  advisory_only_statement: string;
  guardrail_results?: GuardrailResult[];
  integrity_verdict?: IntegrityVerdict;
  evidence_independence?: EvidenceIndependence;
  retry_count?: number;
}

export interface AdvisoryPacketRecord extends AdvisoryPacketDraft {
  advisory_id?: string;
  subsystem?: string;
  component?: string;
  evidence_summary: string;
  source_ids: string[];
  provenance?: string;
  contradiction_status: 'present' | 'not_detected';
  circular_evidence_status: 'present' | 'not_detected';
  integrity_verdict: IntegrityVerdict;
  evidence_independence?: EvidenceIndependence;
  integrity_summary: string;
  stored_at: string;
  guardrail_results: GuardrailResult[];
}

export interface IntegrityDimensionScores {
  evidence_support: number;
  provenance_integrity: number;
  confidence_discipline: number;
  contradiction_handling: number;
  human_review_boundary: number;
  mission_drift: number;
  circular_evidence_risk: number;
  reconstructability: number;
  evidence_independence: number;
}

export interface IntegrityAssessment {
  verdict: IntegrityVerdict;
  dimension_scores: IntegrityDimensionScores;
  guardrail_results: GuardrailResult[];
  summary: string;
  capped_confidence: number;
  human_review_required: boolean;
  evidence_independence: EvidenceIndependence;
}
