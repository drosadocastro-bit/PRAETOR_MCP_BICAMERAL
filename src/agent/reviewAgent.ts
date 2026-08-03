import { analyzeEvidenceIndependence } from '../dependencyGraph.js';
import { compareEvidence, createComparisonHandoff, validateComparisonHandoff, type ComparisonHandoff } from './evidenceComparison.js';
import type { AdvisoryPacketDraft, EvidenceItem, SyntheticMaintenanceRecord } from '../types.js';

export interface RuntimeToolInvocation {
  sessionId: string;
  traceId: string;
  toolName: string;
  actionType: 'retrieve' | 'submit';
  argumentSummary: string;
  arguments: Record<string, unknown>;
}

export interface RuntimeToolInvoker {
  callTool(request: RuntimeToolInvocation): Promise<unknown>;
}

interface AnomalyContext {
  record: SyntheticMaintenanceRecord | null;
  evidence: EvidenceItem[];
}

export interface ReviewRequest {
  sessionId: string;
  equipmentId: string;
  anomalyCode?: string;
  question?: string;
}

export interface ReviewResult {
  packet: AdvisoryPacketDraft;
  submitted: unknown;
}

export interface ReviewBlockedResult {
  status: 'blocked';
  code: string;
  reason: string;
  submitted: false;
  humanReviewRequired: true;
  outputMode: 'blocked';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readToolPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('PRAETOR tool returned a non-object payload.');
  }
  return value;
}

function isBlockedResult(value: unknown): boolean {
  return isRecord(value) && (value.status === 'blocked' || value.code === 'protocol_66_quarantine');
}

function readContext(value: unknown): AnomalyContext {
  const payload = readToolPayload(value);
  const record = payload.record;
  const evidence = payload.evidence;
  if (record !== null && !isRecord(record)) {
    throw new Error('PRAETOR anomaly context returned an invalid record.');
  }
  if (!Array.isArray(evidence) || !evidence.every(isRecord)) {
    throw new Error('PRAETOR anomaly context returned invalid evidence.');
  }
  return {
    record: record as SyntheticMaintenanceRecord | null,
    evidence: evidence as unknown as EvidenceItem[]
  };
}

function buildPacket(request: ReviewRequest, context: AnomalyContext): AdvisoryPacketDraft {
  if (!context.record || context.evidence.length === 0) {
    throw new Error('Insufficient synthetic evidence for a review packet.');
  }

  const independence = analyzeEvidenceIndependence(context.evidence);
  const publicIndependence = {
    independent_source_count: independence.independent_source_count,
    total_evidence_count: independence.total_evidence_count,
    shared_source_ids: independence.shared_source_ids,
    dependency_risk: independence.dependency_risk,
    notes: independence.notes,
    repeated_excerpt_count: independence.repeated_excerpt_count
  };
  const sourceIds = [...new Set(context.evidence.map(item => item.source_id))];
  const contradiction = new Set(context.evidence.map(item => item.assessment).filter(Boolean)).has('normal')
    && new Set(context.evidence.map(item => item.assessment).filter(Boolean)).has('elevated');
  const uncertainty = [
    'Synthetic evidence only; root cause is not established.',
    ...context.evidence.flatMap(item => item.uncertainty_notes)
  ].filter((note, index, notes) => notes.indexOf(note) === index);
  const finding = `Evidence suggests ${context.record.technician_note} This possible recurring pattern for ${context.record.equipment_id} and ${context.record.anomaly_code} should be reviewed by a human.`;

  return {
    packet_id: `PKT-${request.sessionId}`,
    advisory_id: `ADV-${request.sessionId}`,
    finding,
    equipment_id: context.record.equipment_id,
    subsystem: context.record.subsystem,
    component: context.record.component,
    evidence_summary: context.evidence.map(item => `${item.source_id}: ${item.excerpt}`).join(' | '),
    source_ids: sourceIds,
    provenance: 'Evidence retrieved from the local synthetic PRAETOR MCP dataset by the bounded review agent.',
    supporting_evidence: context.evidence,
    confidence: Math.min(0.49, Math.max(0.1, context.evidence.length * 0.1)),
    uncertainty,
    contradiction_status: contradiction ? 'present' : 'not_detected',
    circular_evidence_status: independence.circular_evidence_risk ? 'present' : 'not_detected',
    human_review_required: true,
    advisory_only_statement: 'Advisory only. The evidence should be reviewed by a qualified human; no maintenance action is authorized.',
    guardrail_results: [{
      check: 'evidence_presence',
      guardrail: 'evidence_presence',
      status: 'pass',
      detail: 'The bounded agent supplied retrieved synthetic evidence for governance recomputation.',
      severity: 'low',
      reason: 'Retrieved evidence is present.',
      affected_fields: ['supporting_evidence'],
      recommended_action: 'Review the authoritative governance output.'
    }],
    integrity_verdict: 'doubtful',
    evidence_independence: publicIndependence,
    retry_count: 0
  };
}

function evidenceBoundaryArguments(request: ReviewRequest, packet: AdvisoryPacketDraft, comparisonHandoff: ComparisonHandoff): Record<string, unknown> {
  return {
    session_id: request.sessionId,
    user_prompt: request.question ?? `Review synthetic evidence for ${request.equipmentId}.`,
    draft_answer: packet.finding,
    domain: 'synthetic aviation maintenance advisory',
    retrieved_evidence: packet.supporting_evidence.map((item, index) => ({
      id: `mcp-evidence-${index + 1}`,
      text: item.excerpt,
      source_type: 'MCP_RETRIEVED',
      source_id: item.source_id,
      source_domain: 'synthetic aviation maintenance',
      provenance: item.provenance_metadata
    })),
    comparison_handoff: comparisonHandoff
  };
}

export class ReviewAgent {
  constructor(readonly runtime: RuntimeToolInvoker) {}

  async buildAndSubmit(request: ReviewRequest): Promise<ReviewResult | ReviewBlockedResult> {
    const contextTraceId = `${request.sessionId}-context`;
    const contextResult = await this.runtime.callTool({
      sessionId: request.sessionId,
      traceId: contextTraceId,
      toolName: 'retrieve_anomaly_context',
      actionType: 'retrieve',
      argumentSummary: `context for ${request.equipmentId}`,
      arguments: { equipment_id: request.equipmentId, anomaly_code: request.anomalyCode }
    });
    if (isBlockedResult(contextResult)) {
      return blockedResult(contextResult);
    }

    const context = readContext(contextResult);
    const packet = buildPacket(request, context);
    const comparisonResult = compareEvidence(context.evidence.map(item => ({
      ...item,
      source_type: 'MCP_RETRIEVED'
    })));
    const comparisonHandoff = createComparisonHandoff(comparisonResult);
    if (!validateComparisonHandoff(comparisonHandoff)) {
      return {
        status: 'blocked',
        code: 'comparison_handoff_invalid',
        reason: 'The comparison analysis handoff failed deterministic validation.',
        submitted: false,
        humanReviewRequired: true,
        outputMode: 'blocked'
      };
    }
    if (comparisonHandoff.status === 'refused') {
      return {
        status: 'blocked',
        code: 'comparison_refused',
        reason: comparisonHandoff.summary,
        submitted: false,
        humanReviewRequired: true,
        outputMode: 'blocked'
      };
    }
    const boundaryTraceId = `${request.sessionId}-evidence-boundary`;
    const boundaryResult = await this.runtime.callTool({
      sessionId: request.sessionId,
      traceId: boundaryTraceId,
      toolName: 'evaluate_evidence_boundary',
      actionType: 'retrieve',
      argumentSummary: 'validate evidence provenance and claim boundary',
      arguments: evidenceBoundaryArguments(request, packet, comparisonHandoff)
    });
    if (isBlockedResult(boundaryResult)) {
      return blockedResult(boundaryResult);
    }
    const boundaryPayload = readToolPayload(boundaryResult);
    if (boundaryPayload.decision !== 'allow' && boundaryPayload.decision !== 'revise_with_boundary') {
      return {
        status: 'blocked',
        code: 'evidence_boundary_refused',
        reason: `PRAETOR evidence boundary rejected packet preparation: ${String(boundaryPayload.decision ?? 'unknown')}.`,
        submitted: false,
        humanReviewRequired: true,
        outputMode: 'blocked'
      };
    }

    const submitTraceId = `${request.sessionId}-submit`;
    const submitted = await this.runtime.callTool({
      sessionId: request.sessionId,
      traceId: submitTraceId,
      toolName: 'submit_review_advisory_packet',
      actionType: 'submit',
      argumentSummary: 'review-only advisory packet',
      arguments: packet as unknown as Record<string, unknown>
    });
    if (isBlockedResult(submitted)) {
      return blockedResult(submitted);
    }

    return { packet, submitted };
  }
}

function blockedResult(value: unknown): ReviewBlockedResult {
  const record = isRecord(value) ? value : {};
  return {
    status: 'blocked',
    code: String(record.code ?? 'protocol_66_quarantine'),
    reason: String(record.reason ?? 'Review-agent execution was blocked by the host runtime.'),
    submitted: false,
    humanReviewRequired: true,
    outputMode: 'blocked'
  };
}
