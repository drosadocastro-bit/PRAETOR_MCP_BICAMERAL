import * as z from 'zod/v4';

const MAX_EVIDENCE_ITEMS = 100;
const MAX_TEXT_LENGTH = 5000;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_PACKET_LIST_ITEMS = 100;
const MAX_GUARDRAIL_ITEMS = 50;
const MAX_FIELDS_PER_GUARDRAIL = 50;
const MAX_NOTES_PER_EVIDENCE = 25;

const EvidenceItemSchema = z.strictObject({
  source_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  source_type: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  timestamp: z.string().datetime(),
  excerpt: z.string().min(1).max(MAX_TEXT_LENGTH),
  provenance_metadata: z.string().min(1).max(MAX_TEXT_LENGTH),
  uncertainty_notes: z.array(z.string().min(1).max(MAX_TEXT_LENGTH)).max(MAX_NOTES_PER_EVIDENCE),
  independence_group: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  assessment: z.enum(['elevated', 'stable', 'normal', 'uncertain']).optional(),
  confidence_hint: z.number().min(0).max(1).optional(),
  derived_from_source_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH).optional(),
  upstream_assumption: z.string().min(1).max(MAX_TEXT_LENGTH).optional(),
  declared_paraphrase_group: z.string().min(1).max(MAX_IDENTIFIER_LENGTH).optional()
});

const GuardrailResultSchema = z.strictObject({
  check: z.enum([
    'evidence_presence',
    'evidence_support',
    'provenance_required',
    'generated_output_boundary',
    'speculation_boundary',
    'temporal_precision',
    'confidence_boundary',
    'human_review_boundary',
    'mission_boundary',
    'false_consensus',
    'contradiction_handling',
    'schema_validation',
    'evaluator_manipulation',
    'retry_pressure'
  ]),
  guardrail: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  status: z.enum(['pass', 'flag', 'block']),
  detail: z.string().min(1).max(MAX_TEXT_LENGTH),
  severity: z.enum(['low', 'medium', 'high']),
  reason: z.string().min(1).max(MAX_TEXT_LENGTH),
  affected_fields: z.array(z.string().min(1).max(MAX_IDENTIFIER_LENGTH)).max(MAX_FIELDS_PER_GUARDRAIL),
  recommended_action: z.string().min(1).max(MAX_TEXT_LENGTH)
});

export const EvidenceIndependenceSchema = z.strictObject({
  independent_source_count: z.number().int().nonnegative(),
  total_evidence_count: z.number().int().nonnegative(),
  shared_source_ids: z.array(z.string().min(1).max(MAX_IDENTIFIER_LENGTH)).max(MAX_PACKET_LIST_ITEMS),
  dependency_risk: z.enum(['low', 'medium', 'high']),
  notes: z.string().min(1).max(MAX_TEXT_LENGTH),
  repeated_excerpt_count: z.number().int().nonnegative().optional()
});

export const AdvisoryPacketSchema = z.strictObject({
  packet_id: z.string().min(1).optional(),
  advisory_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  equipment_id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  subsystem: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  component: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  finding: z.string().min(1).max(MAX_TEXT_LENGTH),
  evidence_summary: z.string().min(1).max(MAX_TEXT_LENGTH),
  source_ids: z.array(z.string().min(1).max(MAX_IDENTIFIER_LENGTH)).min(1).max(MAX_PACKET_LIST_ITEMS),
  provenance: z.string().min(1).max(MAX_TEXT_LENGTH),
  supporting_evidence: z.array(EvidenceItemSchema).min(1).max(MAX_EVIDENCE_ITEMS),
  confidence: z.number().min(0).max(1),
  uncertainty: z.array(z.string().min(1).max(MAX_TEXT_LENGTH)).max(MAX_PACKET_LIST_ITEMS),
  contradiction_status: z.enum(['present', 'not_detected']),
  circular_evidence_status: z.enum(['present', 'not_detected']),
  human_review_required: z.literal(true),
  advisory_only_statement: z.string().min(1).max(MAX_TEXT_LENGTH),
  guardrail_results: z.array(GuardrailResultSchema).min(1).max(MAX_GUARDRAIL_ITEMS),
  integrity_verdict: z.enum(['safe', 'doubtful', 'unsafe', 'untrusted']),
  evidence_independence: EvidenceIndependenceSchema.optional(),
  retry_count: z.number().int().nonnegative().optional()
});

export const AdvisoryPacketRecordSchema = AdvisoryPacketSchema.extend({
  integrity_summary: z.string().min(1).max(MAX_TEXT_LENGTH),
  stored_at: z.string().datetime()
}).strict();

export type AdvisoryPacketInput = z.input<typeof AdvisoryPacketSchema>;

export function validateAdvisoryPacket(packet: unknown): { valid: true; data: AdvisoryPacketInput } | { valid: false; issues: string[] } {
  const result = AdvisoryPacketSchema.safeParse(packet);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    issues: result.error.issues.map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
  };
}
