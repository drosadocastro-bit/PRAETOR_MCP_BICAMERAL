import type { EvidenceItem } from '../types.js';

const MAX_EVIDENCE_ITEMS = 32;
const MAX_EXCERPT_LENGTH = 4000;
const AUTHORIZED_SOURCE_TYPES = new Set(['MCP_RETRIEVED', 'TOOL_RETRIEVED']);
const MISSION_DRIFT_PATTERNS = [
  /safe to operate/i,
  /unsafe to operate/i,
  /maintenance action required/i,
  /must replace/i,
  /authorized corrective action/i,
  /create (?:a )?work order/i,
  /determine (?:equipment|aircraft) safety/i
];

export interface EvidenceComparisonResult {
  status: 'compared' | 'refused';
  confidence: number;
  human_review_required: true;
  authoritative: false;
  source_ids: string[];
  independence_groups: string[];
  contradiction_detected: boolean;
  duplicate_lineage_detected: boolean;
  provenance_incomplete: boolean;
  disallowed_origin_detected: boolean;
  mission_drift_detected: boolean;
  flags: string[];
  summary: string;
}

export interface ComparisonHandoff {
  handoff_type: 'untrusted_comparison_analysis';
  status: EvidenceComparisonResult['status'];
  confidence: number;
  human_review_required: true;
  authoritative: false;
  independent_corroboration: false;
  source_ids: string[];
  independence_groups: string[];
  flags: string[];
  summary: string;
}

export function compareEvidence(evidence: readonly EvidenceItem[]): EvidenceComparisonResult {
  const boundedEvidence = evidence.slice(0, MAX_EVIDENCE_ITEMS);
  const flags: string[] = [];
  if (evidence.length > MAX_EVIDENCE_ITEMS) {
    flags.push('evidence_count_exceeded');
  }

  const provenanceIncomplete = boundedEvidence.some(item => !hasRequiredProvenance(item));
  const disallowedOriginDetected = boundedEvidence.some(item => !AUTHORIZED_SOURCE_TYPES.has(item.source_type));
  const missionDriftDetected = boundedEvidence.some(item => MISSION_DRIFT_PATTERNS.some(pattern => pattern.test(`${item.excerpt} ${item.upstream_assumption ?? ''}`.slice(0, MAX_EXCERPT_LENGTH))));
  const duplicateLineageDetected = hasDuplicateLineage(boundedEvidence);
  const contradictionDetected = hasContradiction(boundedEvidence);

  if (provenanceIncomplete) flags.push('provenance_incomplete');
  if (disallowedOriginDetected) flags.push('disallowed_evidence_origin');
  if (missionDriftDetected) flags.push('mission_drift_detected');
  if (duplicateLineageDetected) flags.push('duplicate_or_derived_lineage');
  if (contradictionDetected) flags.push('contradictory_assessments');

  const authorizedEvidence = boundedEvidence.filter(item => AUTHORIZED_SOURCE_TYPES.has(item.source_type) && hasRequiredProvenance(item));
  const sourceIds = [...new Set(authorizedEvidence.map(item => item.source_id))];
  const independentEvidence = uniqueLineage(authorizedEvidence);
  const independenceGroups = [...new Set(independentEvidence.map(item => item.independence_group))];
  const refused = authorizedEvidence.length === 0 || provenanceIncomplete || missionDriftDetected;
  if (authorizedEvidence.length === 0) flags.push('no_authorized_evidence');

  return {
    status: refused ? 'refused' : 'compared',
    confidence: refused ? 0 : Math.min(0.49, independenceGroups.length > 1 ? 0.4 : 0.2),
    human_review_required: true,
    authoritative: false,
    source_ids: sourceIds,
    independence_groups: independenceGroups,
    contradiction_detected: contradictionDetected,
    duplicate_lineage_detected: duplicateLineageDetected,
    provenance_incomplete: provenanceIncomplete,
    disallowed_origin_detected: disallowedOriginDetected,
    mission_drift_detected: missionDriftDetected,
    flags,
    summary: refused
      ? 'Comparison refused; the supplied material is not sufficient for an untrusted comparison analysis.'
      : 'Untrusted comparison only; observed agreement or disagreement requires human review and is not independent corroboration.'
  };
}

export function createComparisonHandoff(result: EvidenceComparisonResult): ComparisonHandoff {
  return {
    handoff_type: 'untrusted_comparison_analysis',
    status: result.status,
    confidence: Math.min(0.49, Math.max(0, result.confidence)),
    human_review_required: true,
    authoritative: false,
    independent_corroboration: false,
    source_ids: [...result.source_ids],
    independence_groups: [...result.independence_groups],
    flags: [...result.flags],
    summary: result.summary
  };
}

export function validateComparisonHandoff(value: unknown): value is ComparisonHandoff {
  if (typeof value !== 'object' || value === null) return false;
  const handoff = value as Partial<ComparisonHandoff>;
  return handoff.handoff_type === 'untrusted_comparison_analysis'
    && (handoff.status === 'compared' || handoff.status === 'refused')
    && typeof handoff.confidence === 'number'
    && Number.isFinite(handoff.confidence)
    && handoff.confidence >= 0
    && handoff.confidence <= 0.49
    && handoff.human_review_required === true
    && handoff.authoritative === false
    && handoff.independent_corroboration === false
    && Array.isArray(handoff.source_ids)
    && handoff.source_ids.every(item => typeof item === 'string')
    && Array.isArray(handoff.independence_groups)
    && handoff.independence_groups.every(item => typeof item === 'string')
    && Array.isArray(handoff.flags)
    && handoff.flags.every(item => typeof item === 'string')
    && typeof handoff.summary === 'string';
}

function hasRequiredProvenance(item: EvidenceItem): boolean {
  return item.source_id.trim().length > 0
    && item.source_type.trim().length > 0
    && item.timestamp.trim().length > 0
    && item.provenance_metadata.trim().length > 0
    && item.independence_group.trim().length > 0;
}

function hasDuplicateLineage(evidence: readonly EvidenceItem[]): boolean {
  return uniqueLineage(evidence).length !== evidence.length;
}

function uniqueLineage(evidence: readonly EvidenceItem[]): EvidenceItem[] {
  const lineage = new Set<string>();
  return evidence.filter(item => {
    const key = item.derived_from_source_id?.trim() || item.source_id.trim();
    if (lineage.has(key)) return false;
    lineage.add(key);
    return true;
  });
}

function hasContradiction(evidence: readonly EvidenceItem[]): boolean {
  const assessments = new Set(evidence.map(item => item.assessment).filter(Boolean));
  return (assessments.has('elevated') && assessments.has('normal'))
    || (assessments.has('elevated') && assessments.has('stable'));
}
