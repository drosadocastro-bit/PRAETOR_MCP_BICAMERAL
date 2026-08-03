import type { AdvisoryPacketDraft, EvidenceItem, GuardrailResult, IntegrityAssessment, IntegrityDimensionScores, IntegrityVerdict } from './types.js';
import { analyzeEvidenceIndependence } from './dependencyGraph.js';
import { sourceMetadata } from './data.js';

const MISSION_DRIFT_PATTERNS = [
  /must replace/i,
  /confirmed failure/i,
  /system confirms failure/i,
  /maintenance action required/i,
  /authorized corrective action/i,
  /system determines/i,
  /safe to operate/i,
  /unsafe to operate/i,
  /prototype confirms the maintenance decision/i,
  /synthetic evaluation demonstrates production readiness/i,
  /synthetic evaluation demonstrates operational readiness/i,
  /prototype validates the maintenance decision/i
];

const EVALUATOR_MANIPULATION_PATTERNS = [/ignore guardrails/i, /override integrity verdict/i, /already been reviewed/i, /mark this as safe/i];

const SAFE_LANGUAGE_SUGGESTIONS: Array<[RegExp, string]> = [
  [/must replace/i, 'should be reviewed for possible replacement'],
  [/confirmed failure/i, 'evidence may indicate a possible failure pattern'],
  [/maintenance action required/i, 'maintenance review is recommended'],
  [/authorized corrective action/i, 'should be reviewed by authorized personnel'],
  [/safe to operate/i, 'operational status must be determined by authorized personnel'],
  [/unsafe to operate/i, 'requires review by authorized personnel']
];

const PROVENANCE_POISON_PATTERNS = [/ignore (?:the )?provenance/i, /override (?:the )?guardrail/i, /already reviewed/i, /system authority/i];
const GENERATED_OUTPUT_SOURCE_PATTERNS = [/generated/i, /assistant/i, /advisory/i, /model_output/i, /model-output/i, /discourse/i];
const GENERATED_OUTPUT_PROVENANCE_PATTERNS = [/prior advisory packet/i, /generated output/i, /assistant output/i, /model output/i];
const SPECULATIVE_SOURCE_PATTERNS = [/speculat/i, /hypothes/i, /interpret/i];
const SPECULATIVE_CERTAINTY_PATTERNS = [/establishes/i, /proves/i, /confirmed/i, /demonstrates/i, /is true/i];
const IMPRECISE_DATE_PATTERNS = [/approx/i, /unknown/i, /undated/i];
const FABRICATED_TEMPORAL_PRECISION_PATTERNS = [/exactly every/i, /precisely every/i, /exact interval/i, /precise interval/i, /exact recurrence/i];
const GROUNDING_STOPWORDS = new Set(['about', 'advisory', 'and', 'evidence', 'finding', 'indicate', 'may', 'pattern', 'possible', 'recurring', 'should', 'suggests', 'the', 'this', 'with']);

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function isFullyProvenanced(evidence: EvidenceItem): boolean {
  return Boolean(evidence.source_id && evidence.source_type && evidence.timestamp && evidence.provenance_metadata);
}

function hasContradiction(evidence: EvidenceItem[]): boolean {
  const labels = new Set(evidence.map(item => item.assessment).filter(Boolean));
  return labels.has('elevated') && (labels.has('normal') || labels.has('stable'));
}

function countIndependentGroups(evidence: EvidenceItem[]): number {
  return new Set(evidence.map(item => item.independence_group)).size;
}

function meaningfulTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]{5,}/g)?.filter(token => !GROUNDING_STOPWORDS.has(token)) ?? [];
}

function findingHasEvidenceSupport(packet: AdvisoryPacketDraft): boolean {
  if (!packet.source_ids) {
    return true;
  }

  const findingTokens = meaningfulTokens(packet.finding);
  if (findingTokens.length === 0) {
    return true;
  }

  const evidenceText = packet.supporting_evidence.map(item => item.excerpt).join(' ');
  return findingTokens.some(token => evidenceText.toLowerCase().includes(token));
}

function hasValidDeclaredSources(packet: AdvisoryPacketDraft): boolean {
  if (!packet.source_ids) {
    return true;
  }

  const evidenceSourceIds = new Set(packet.supporting_evidence.map(item => item.source_id));
  return packet.source_ids.length === evidenceSourceIds.size
    && packet.source_ids.every(sourceId => evidenceSourceIds.has(sourceId) && sourceMetadata.some(source => source.source_id === sourceId));
}

function hasPoisonedProvenance(packet: AdvisoryPacketDraft): boolean {
  const provenanceFields = [packet.provenance ?? '', ...packet.supporting_evidence.map(item => item.provenance_metadata)];
  return provenanceFields.some(value => PROVENANCE_POISON_PATTERNS.some(pattern => pattern.test(value)));
}

function hasGeneratedOutputEvidence(packet: AdvisoryPacketDraft): boolean {
  return packet.supporting_evidence.some(item =>
    GENERATED_OUTPUT_SOURCE_PATTERNS.some(pattern => pattern.test(item.source_type))
    || GENERATED_OUTPUT_PROVENANCE_PATTERNS.some(pattern => pattern.test(item.provenance_metadata))
  );
}

function hasSpeculationHardenedAsFact(packet: AdvisoryPacketDraft): boolean {
  return packet.supporting_evidence.some(item =>
    SPECULATIVE_SOURCE_PATTERNS.some(pattern => pattern.test(item.source_type) || pattern.test(item.provenance_metadata))
  ) && SPECULATIVE_CERTAINTY_PATTERNS.some(pattern => pattern.test(packet.finding));
}

function hasFabricatedTemporalPrecision(packet: AdvisoryPacketDraft): boolean {
  return packet.supporting_evidence.some(item => IMPRECISE_DATE_PATTERNS.some(pattern => pattern.test(item.uncertainty_notes.join(' '))))
    && FABRICATED_TEMPORAL_PRECISION_PATTERNS.some(pattern => pattern.test(packet.finding));
}

function buildGuardrail(
  check: GuardrailResult['check'],
  status: GuardrailResult['status'],
  detail: string,
  severity: GuardrailResult['severity'],
  affected_fields: string[],
  recommended_action: string
): GuardrailResult {
  return {
    check,
    guardrail: check,
    status,
    detail,
    severity,
    reason: detail,
    affected_fields,
    recommended_action
  };
}

export function suggestSafeLanguage(text: string): string[] {
  return SAFE_LANGUAGE_SUGGESTIONS.filter(([pattern]) => pattern.test(text)).map(([, suggestion]) => suggestion);
}

export function scoreIntegrity(packet: AdvisoryPacketDraft): IntegrityAssessment {
  const evidence = packet.supporting_evidence;
  const independence = analyzeEvidenceIndependence(evidence);
  const guardrail_results: GuardrailResult[] = [];
  let verdict: IntegrityVerdict = 'safe';
  let cappedConfidence = clampConfidence(packet.confidence);
  let human_review_required = packet.human_review_required;

  if (evidence.length === 0) {
    guardrail_results.push(buildGuardrail('evidence_presence', 'block', 'No supporting evidence was supplied.', 'high', ['supporting_evidence', 'source_ids'], 'Add traceable synthetic evidence and require human review.'));
    return {
      verdict: 'untrusted',
      dimension_scores: {
        evidence_support: 0,
        provenance_integrity: 0,
        confidence_discipline: 0,
        contradiction_handling: 0,
        human_review_boundary: 0,
        mission_drift: 1,
        circular_evidence_risk: 0,
        reconstructability: 0,
        evidence_independence: 0
      },
      guardrail_results,
      summary: 'Rejected because the advisory lacks supporting evidence.',
      capped_confidence: 0,
      human_review_required: true,
      evidence_independence: independence
    };
  }

  if (!findingHasEvidenceSupport(packet)) {
    guardrail_results.push(buildGuardrail('evidence_support', 'block', 'The finding is not supported by the supplied evidence excerpts.', 'high', ['finding', 'supporting_evidence', 'evidence_summary'], 'Replace the synthesis with a finding grounded in the cited evidence or route for human review.'));
    verdict = 'untrusted';
    cappedConfidence = Math.min(cappedConfidence, 0.25);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('evidence_support', 'pass', 'The finding shares meaningful terms with the supplied evidence excerpts.', 'low', ['finding', 'supporting_evidence'], 'Retain the evidence excerpts for reviewer reconstruction.'));
  }

  if (evidence.some(item => !isFullyProvenanced(item)) || !hasValidDeclaredSources(packet) || hasPoisonedProvenance(packet)) {
    const reason = !hasValidDeclaredSources(packet)
      ? 'Declared source IDs do not match the evidence or synthetic source registry.'
      : hasPoisonedProvenance(packet)
        ? 'Provenance metadata contains evaluator-directed or authority-claiming text.'
        : 'At least one evidence item is missing provenance metadata.';
    guardrail_results.push(buildGuardrail('provenance_required', 'block', reason, 'high', ['supporting_evidence', 'source_ids', 'provenance'], 'Restore valid source lineage and provenance before submission.'));
    verdict = 'untrusted';
    cappedConfidence = Math.min(cappedConfidence, 0.3);
  } else {
    guardrail_results.push(buildGuardrail('provenance_required', 'pass', 'Every evidence item includes source metadata.', 'low', ['supporting_evidence', 'provenance'], 'Retain the provenance records for reconstruction.'));
  }

  if (hasGeneratedOutputEvidence(packet)) {
    guardrail_results.push(buildGuardrail('generated_output_boundary', 'block', 'Generated or prior advisory output cannot be treated as primary maintenance evidence.', 'high', ['supporting_evidence', 'provenance'], 'Replace generated output with traceable synthetic source evidence and require human review.'));
    verdict = 'untrusted';
    cappedConfidence = Math.min(cappedConfidence, 0.2);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('generated_output_boundary', 'pass', 'Evidence is not identified as generated or prior advisory output.', 'low', ['supporting_evidence'], 'Keep generated discourse outside the evidence set.'));
  }

  if (hasSpeculationHardenedAsFact(packet)) {
    guardrail_results.push(buildGuardrail('speculation_boundary', 'block', 'Speculative or interpretive evidence is presented as established fact.', 'high', ['finding', 'supporting_evidence'], 'Preserve the speculative status and route the finding for human review.'));
    if (verdict === 'safe') {
      verdict = 'untrusted';
    }
    cappedConfidence = Math.min(cappedConfidence, 0.25);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('speculation_boundary', 'pass', 'No speculative evidence was promoted to fact.', 'low', ['finding', 'supporting_evidence'], 'Keep interpretation and speculation explicitly labeled.'));
  }

  if (hasFabricatedTemporalPrecision(packet)) {
    guardrail_results.push(buildGuardrail('temporal_precision', 'flag', 'The finding claims exact timing from approximate or unknown evidence dates.', 'high', ['finding', 'supporting_evidence'], 'Preserve date uncertainty and require human review before making temporal claims.'));
    if (verdict === 'safe') {
      verdict = 'doubtful';
    }
    cappedConfidence = Math.min(cappedConfidence, 0.45);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('temporal_precision', 'pass', 'Temporal wording does not exceed the supplied date precision.', 'low', ['finding', 'supporting_evidence'], 'Retain the source date precision.'));
  }

  if (evidence.length < 2) {
    guardrail_results.push(buildGuardrail('confidence_boundary', 'flag', 'Single-source evidence is capped to a cautious confidence band.', 'medium', ['confidence', 'supporting_evidence'], 'Add independent evidence or keep human review required.'));
    cappedConfidence = Math.min(cappedConfidence, 0.5);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('confidence_boundary', 'pass', 'Evidence is sufficiently multi-item to support a review-only advisory.', 'low', ['confidence'], 'Keep the value explicitly synthetic and non-calibrated.'));
  }

  const driftMatch = [packet.finding, packet.advisory_only_statement].find(text => MISSION_DRIFT_PATTERNS.some(pattern => pattern.test(text)));
  if (driftMatch) {
    guardrail_results.push(buildGuardrail('mission_boundary', 'block', `Advisory language implies operational authority. Suggested alternatives: ${suggestSafeLanguage(driftMatch) .join('; ') || 'rewrite for review-only language'}.`, 'high', ['finding', 'advisory_only_statement'], 'Rewrite the advisory and require human review; do not silently rewrite it.'));
    verdict = 'unsafe';
    cappedConfidence = Math.min(cappedConfidence, 0.25);
  } else {
    guardrail_results.push(buildGuardrail('mission_boundary', 'pass', 'Advisory language stays bounded and review-only.', 'low', ['finding', 'advisory_only_statement'], 'Continue human review.'));
  }

  if (hasContradiction(evidence)) {
    guardrail_results.push(buildGuardrail('contradiction_handling', 'flag', 'Conflicting elevated and normal assessments are present.', 'high', ['supporting_evidence', 'confidence'], 'Resolve or preserve the contradiction and require human review.'));
    verdict = verdict === 'unsafe' ? verdict : 'doubtful';
    cappedConfidence = Math.min(cappedConfidence, 0.55);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('contradiction_handling', 'pass', 'No contradiction was detected in the evidence set.', 'low', ['supporting_evidence'], 'Continue monitoring for conflicting follow-up evidence.'));
  }

  const uniqueSources = new Set(evidence.map(item => item.source_id));
  const uniqueGroups = countIndependentGroups(evidence);
  const circularEvidence = independence.circular_evidence_risk || uniqueSources.size < evidence.length || uniqueGroups < Math.min(2, evidence.length);
  if (circularEvidence) {
    guardrail_results.push(buildGuardrail('false_consensus', 'flag', `${independence.notes} Independent source count: ${independence.independent_source_count}.`, 'high', ['supporting_evidence', 'source_ids', 'evidence_independence'], 'Separate source lineages or keep the packet on the human-review path.'));
    if (verdict !== 'unsafe') {
      verdict = 'untrusted';
    }
    cappedConfidence = Math.min(cappedConfidence, 0.5);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('false_consensus', 'pass', 'Evidence sources are independent enough for review-only use.', 'low', ['evidence_independence'], 'Retain the source lineage.'));
  }

  const manipulationMatch = [packet.finding, packet.advisory_only_statement, ...packet.uncertainty].find(text => EVALUATOR_MANIPULATION_PATTERNS.some(pattern => pattern.test(text)));
  if (manipulationMatch) {
    guardrail_results.push(buildGuardrail('evaluator_manipulation', 'block', 'The packet attempts to direct or override the evaluator.', 'high', ['finding', 'advisory_only_statement', 'uncertainty'], 'Remove evaluator-directed language; packet claims cannot self-clear safety.'));
    verdict = verdict === 'unsafe' ? verdict : 'untrusted';
    cappedConfidence = Math.min(cappedConfidence, 0.25);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('evaluator_manipulation', 'pass', 'No evaluator-directed instruction was detected.', 'low', ['finding', 'advisory_only_statement'], 'Keep evaluator decisions outside packet self-attestation.'));
  }

  if ((packet.retry_count ?? 0) > 0) {
    guardrail_results.push(buildGuardrail('retry_pressure', 'flag', `Packet was submitted after ${packet.retry_count} prior attempt(s).`, 'medium', ['retry_count'], 'Log the attempts and require human review before any further submission.'));
    cappedConfidence = Math.min(cappedConfidence, 0.5);
    human_review_required = true;
  } else {
    guardrail_results.push(buildGuardrail('retry_pressure', 'pass', 'No prior denied submission was recorded.', 'low', ['retry_count'], 'Record future retry pressure if it occurs.'));
  }

  const supportScore = evidence.length >= 3 ? 1 : evidence.length === 2 ? 0.8 : 0.35;
  const provenanceScore = evidence.every(isFullyProvenanced) ? 1 : 0;
  const confidenceScore = packet.confidence <= 0.4 ? 0.2 : packet.confidence <= 0.7 ? 0.7 : 1;
  const contradictionScore = hasContradiction(evidence) ? 0.2 : 1;
  const humanReviewScore = packet.human_review_required || human_review_required ? 1 : 0.5;
  const missionScore = driftMatch ? 0 : 1;
  const circularScore = circularEvidence ? 0.1 : 1;
  const reconstructabilityScore = evidence.every(item => Boolean(item.excerpt && item.source_id && item.provenance_metadata)) ? 1 : 0.4;
  const independenceScore = independence.dependency_risk === 'low' ? 1 : independence.dependency_risk === 'medium' ? 0.5 : 0.1;

  if (verdict === 'safe' && cappedConfidence < 0.55) {
    verdict = 'doubtful';
  }
  if (verdict === 'safe' && (circularEvidence || hasContradiction(evidence))) {
    verdict = 'doubtful';
  }
  if (verdict === 'doubtful' && driftMatch) {
    verdict = 'unsafe';
  }

  if (driftMatch) {
    guardrail_results.push(buildGuardrail('human_review_boundary', 'block', 'Mission-drift violations always require human review.', 'high', ['human_review_required'], 'Keep the packet blocked until the language is rewritten and reviewed.'));
    human_review_required = true;
  } else if (packet.human_review_required || human_review_required) {
    guardrail_results.push(buildGuardrail('human_review_boundary', 'flag', 'The packet must remain on the human-review path.', 'medium', ['human_review_required'], 'Route the packet to a human reviewer.'));
  } else {
    guardrail_results.push(buildGuardrail('human_review_boundary', 'pass', 'No human-review override was needed beyond the review-only posture.', 'low', ['human_review_required'], 'Review remains authoritative.'));
  }

  const dimension_scores: IntegrityDimensionScores = {
    evidence_support: supportScore,
    provenance_integrity: provenanceScore,
    confidence_discipline: confidenceScore,
    contradiction_handling: contradictionScore,
    human_review_boundary: humanReviewScore,
    mission_drift: missionScore,
    circular_evidence_risk: circularScore,
    reconstructability: reconstructabilityScore,
    evidence_independence: independenceScore
  };

  const summary =
    verdict === 'safe'
      ? 'Evidence is sufficiently supported, provenance is intact, and the packet remains review-only.'
      : verdict === 'doubtful'
        ? 'The packet is structurally usable for review, but confidence or evidence quality is constrained.'
        : verdict === 'unsafe'
          ? 'The packet violates a mission boundary and cannot be treated as a safe advisory.'
          : 'The packet cannot be trusted because provenance, evidence independence, or traceability is insufficient.';

  return {
    verdict,
    dimension_scores,
    guardrail_results,
    summary,
    capped_confidence: cappedConfidence,
    human_review_required,
    evidence_independence: independence
  };
}
