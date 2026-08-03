import { AuditEventSink, createAuditEventId, hashPrompt } from '../audit.js';

export enum SourceType {
  MCP_RETRIEVED = 'MCP_RETRIEVED',
  TOOL_RETRIEVED = 'TOOL_RETRIEVED',
  CHAT_CLAIM = 'CHAT_CLAIM',
  MODEL_INFERENCE = 'MODEL_INFERENCE',
  UNKNOWN = 'UNKNOWN'
}

export type EvidenceBoundaryDecision =
  | 'allow'
  | 'revise_with_boundary'
  | 'refuse_evidence_based_answer'
  | 'request_authorized_ingestion'
  | 'recommend_audit_log_only';

export type DomainRisk = 'low' | 'high';

export interface EvidenceItem {
  id: string;
  text: string;
  sourceType: SourceType;
  sourceId?: string;
  sourceDomain?: string;
  provenance?: string;
}

export interface ClaimItem {
  id: string;
  text: string;
  sourceType: SourceType;
  supportedByEvidenceIds: string[];
  verified: boolean;
}

export interface EvidenceBoundaryInput {
  userPrompt: string;
  retrievedEvidence: EvidenceItem[];
  draftAnswer?: string;
  domain?: string;
  sessionId?: string;
  toolCallsUsed?: string[];
}

export interface EvidenceBoundaryResult {
  decision: EvidenceBoundaryDecision;
  domainRisk: DomainRisk;
  claims: ClaimItem[];
  modelInferences: ClaimItem[];
  unsupportedClaims: ClaimItem[];
  missingAuthorizedSource: boolean;
  unsafeInferenceFlags: string[];
  capabilityHonestyFlags: string[];
  reasons: string[];
  boundaryResponse: string;
  audit: {
    eventType: string;
    eventLogged: boolean;
    shouldLog: boolean;
    explanation: string;
    reason?: string;
    eventId?: string;
  };
}

const HIGH_RISK_PATTERNS = [
  /medical|radiolog|x[- ]?ray|patient|diagnos|treatment|clinical/i,
  /legal|court|contract|liability|compliance/i,
  /financial|investment|loan|credit|tax|accounting/i,
  /aviation|aircraft|flight|radar|airworthiness/i,
  /maintenance|equipment|machinery|safety|safe to operate|unrestricted|clearance|fire alarm|disable alarm|bypass alarm/i
];

const AUTHORIZED_SOURCE_PATTERNS = [
  /report/i,
  /x[- ]?ray/i,
  /radiolog/i,
  /manual/i,
  /procedure/i,
  /maintenance record/i,
  /maintenance log/i,
  /inspection/i,
  /clinical record/i,
  /source/i
];

const UNSAFE_INFERENCE_PATTERNS: Array<[RegExp, string]> = [
  [/stable (?:finding|condition).{0,80}(?:resolved|no longer relevant)/i, 'stable finding treated as resolved condition'],
  [/no pain.{0,80}(?:no risk|risk[- ]free|safe)/i, 'absence of pain treated as absence of risk'],
  [/(?:performance|workout|tolerance).{0,100}(?:unrestricted|clearance|safe to progress|no restrictions)/i, 'performance tolerance treated as unrestricted clearance'],
  [/synthetic data.{0,80}(?:validates|proves|confirms).{0,80}(?:real|production|operational)/i, 'synthetic data treated as real-world validation'],
  [/(?:snippet|excerpt).{0,80}(?:full report|full document|entire document) reviewed/i, 'retrieved excerpt treated as a fully reviewed source'],
  [/(?:chat|user).{0,80}(?:verified|authoritative|confirmed) (?:evidence|source|report)/i, 'chat text treated as verified source'],
  [/(?:disable|bypass|silence|deactivate).{0,50}fire alarm/i, 'request to disable a fire alarm crosses a safety boundary']
];

const CAPABILITY_PATTERNS = [
  /Agent K logged this/i,
  /audit event was logged/i,
  /logged (?:the )?(?:claim|incident|event)/i
];

const STOPWORDS = new Set(['about', 'after', 'based', 'because', 'could', 'from', 'have', 'into', 'that', 'their', 'this', 'with', 'would']);

function meaningfulTokens(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter(token => !STOPWORDS.has(token)) ?? [])];
}

function overlapScore(left: string, right: string): number {
  const rightTokens = new Set(meaningfulTokens(right));
  return meaningfulTokens(left).filter(token => rightTokens.has(token)).length;
}

function detectDomainRisk(input: EvidenceBoundaryInput): DomainRisk {
  const haystack = `${input.domain ?? ''} ${input.userPrompt} ${input.draftAnswer ?? ''}`;
  return HIGH_RISK_PATTERNS.some(pattern => pattern.test(haystack)) ? 'high' : 'low';
}

function sourceMatchesPrompt(item: EvidenceItem, prompt: string): boolean {
  if (item.sourceType !== SourceType.MCP_RETRIEVED && item.sourceType !== SourceType.TOOL_RETRIEVED) {
    return false;
  }
  const sourceText = `${item.sourceDomain ?? ''} ${item.sourceType} ${item.sourceId ?? ''} ${item.text}`;
  return overlapScore(prompt, sourceText) >= 2;
}

function extractChatClaims(prompt: string, retrievedEvidence: EvidenceItem[]): ClaimItem[] {
  const sentences = prompt.split(/(?<=[.!?])\s+|\n+/).map(text => text.trim()).filter(Boolean);
  return sentences
    .filter(sentence => meaningfulTokens(sentence).length >= 3)
    .map((sentence, index) => {
      const supportingIds = retrievedEvidence
        .filter(item => (item.sourceType === SourceType.MCP_RETRIEVED || item.sourceType === SourceType.TOOL_RETRIEVED)
          && overlapScore(sentence, item.text) >= 2)
        .map(item => item.id);
      return {
        id: `chat-claim-${index + 1}`,
        text: sentence,
        sourceType: SourceType.CHAT_CLAIM,
        supportedByEvidenceIds: supportingIds,
        verified: supportingIds.length > 0
      };
    });
}

function buildBoundaryResponse(missingAuthorizedSource: boolean, unsafeInferenceFlags: string[], capabilityHonestyFlags: string[]): string {
  const parts = [
    'I cannot present this as a verified Praetor/MCP conclusion from the available evidence.'
  ];
  if (missingAuthorizedSource) {
    parts.push('The referenced source was not retrieved from the MCP server or an authorized tool, so the chat-provided claim remains an unverified external claim.');
  }
  if (unsafeInferenceFlags.length > 0) {
    parts.push(`The requested reasoning contains an unsafe inference boundary: ${unsafeInferenceFlags.join('; ')}.`);
  }
  if (capabilityHonestyFlags.length > 0) {
    parts.push('No audit event is claimed as logged because no logging sink was called successfully. Agent K should log this only when an actual audit tool or event sink exists.');
  }
  parts.push('A qualified human should review the authoritative source before any high-risk conclusion or action.');
  return parts.join(' ');
}

export class CortexEvidenceGate {
  constructor(private readonly auditSink?: AuditEventSink) {}

  evaluate(input: EvidenceBoundaryInput): EvidenceBoundaryResult {
    const domainRisk = detectDomainRisk(input);
    const claims = extractChatClaims(input.userPrompt, input.retrievedEvidence);
    const modelInferences: ClaimItem[] = input.draftAnswer?.trim()
      ? [{
          id: 'model-inference-1',
          text: input.draftAnswer.trim(),
          sourceType: SourceType.MODEL_INFERENCE,
          supportedByEvidenceIds: [],
          verified: false
        }]
      : [];
    const unsupportedClaims = claims.filter(claim => !claim.verified);
    const sourceRequested = AUTHORIZED_SOURCE_PATTERNS.some(pattern => pattern.test(input.userPrompt));
    const matchingEvidence = input.retrievedEvidence.filter(item => sourceMatchesPrompt(item, input.userPrompt));
    const missingAuthorizedSource = sourceRequested && matchingEvidence.length === 0;
    const unsafeInferenceFlags = UNSAFE_INFERENCE_PATTERNS
      .filter(([pattern]) => pattern.test(`${input.userPrompt}\n${input.draftAnswer ?? ''}`))
      .map(([, label]) => label);
    const eventLogged = false;
    const capabilityHonestyFlags = CAPABILITY_PATTERNS
      .filter(pattern => pattern.test(input.draftAnswer ?? '') && !eventLogged)
      .map(() => 'draft claims an audit event was logged without a verified logging call');
    const reasons: string[] = [];

    if (unsupportedClaims.length > 0) {
      reasons.push(`${unsupportedClaims.length} chat-provided claim(s) lack matching retrieved evidence.`);
    }
    if (missingAuthorizedSource) {
      reasons.push('A referenced report, record, or procedure is absent from authorized retrieved context.');
    }
    if (unsafeInferenceFlags.length > 0) {
      reasons.push('The draft crosses from observed tolerance or supplied text into an unsupported safety or authority conclusion.');
    }
    if (capabilityHonestyFlags.length > 0) {
      reasons.push('The draft claims audit capability that was not actually invoked.');
    }

    const shouldLog = unsupportedClaims.length > 0 || missingAuthorizedSource || unsafeInferenceFlags.length > 0 || capabilityHonestyFlags.length > 0;
    const audit = {
      eventType: shouldLog ? 'evidence_boundary_violation' : 'none',
      eventLogged,
      shouldLog,
      explanation: eventLogged
        ? 'An audit event was reported as logged because the configured logging capability was available and called.'
        : shouldLog
          ? 'No audit event was logged; an actual event sink is unavailable or was not called. This is a future logging recommendation only.'
          : 'No boundary event required logging.'
    };

    let decision: EvidenceBoundaryDecision = 'allow';
    if (capabilityHonestyFlags.length > 0) {
      decision = 'recommend_audit_log_only';
    } else if (missingAuthorizedSource && domainRisk === 'high') {
      decision = 'request_authorized_ingestion';
    } else if ((missingAuthorizedSource || unsafeInferenceFlags.length > 0) && domainRisk === 'high') {
      decision = 'refuse_evidence_based_answer';
    } else if (unsupportedClaims.length > 0 || missingAuthorizedSource || unsafeInferenceFlags.length > 0) {
      decision = 'revise_with_boundary';
    }

    return {
      decision,
      domainRisk,
      claims,
      modelInferences,
      unsupportedClaims,
      missingAuthorizedSource,
      unsafeInferenceFlags,
      capabilityHonestyFlags,
      reasons,
      boundaryResponse: buildBoundaryResponse(missingAuthorizedSource, unsafeInferenceFlags, capabilityHonestyFlags),
      audit
    };
  }

  async evaluateAndAudit(input: EvidenceBoundaryInput): Promise<EvidenceBoundaryResult> {
    const result = this.evaluate(input);
    if (!result.audit.shouldLog) {
      return result;
    }

    const eventId = createAuditEventId();
    const event = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      session_id: input.sessionId ?? 'unknown-session',
      event_type: result.audit.eventType,
      severity: result.domainRisk === 'high' || result.unsafeInferenceFlags.length > 0 ? 'high' as const : 'medium' as const,
      domain: input.domain?.trim() || 'unspecified',
      source_boundary: result.missingAuthorizedSource ? 'authorized_evidence_missing' : 'evidence_boundary',
      claim_source: result.unsupportedClaims.length > 0 || input.userPrompt.trim().length > 0 ? SourceType.CHAT_CLAIM : SourceType.MODEL_INFERENCE,
      authorized_evidence_available: !result.missingAuthorizedSource,
      tool_calls_used: input.toolCallsUsed ?? [],
      shouldLog: true as const,
      eventLogged: true as const,
      recommended_action: result.decision === 'request_authorized_ingestion'
        ? 'Request authorized source ingestion before an evidence-based conclusion.'
        : 'Preserve human review and retain the boundary response.',
      explanation: result.reasons.join(' ') || result.audit.explanation,
      prompt_hash: hashPrompt(input.userPrompt),
      answer_decision: result.decision
    };

    if (!this.auditSink) {
      return {
        ...result,
        audit: {
          ...result.audit,
          eventLogged: false,
          reason: 'No audit-event sink available',
          explanation: 'No audit event was logged; no audit-event sink is available.'
        }
      };
    }

    try {
      await this.auditSink.append(event);
      return {
        ...result,
        audit: {
          ...result.audit,
          eventLogged: true,
          eventId,
          explanation: 'Audit event was persisted successfully.'
        }
      };
    } catch {
      return {
        ...result,
        audit: {
          ...result.audit,
          eventLogged: false,
          eventId,
          reason: 'No audit-event sink available',
          explanation: 'No audit event was logged; the audit-event sink was unavailable or failed.'
        }
      };
    }
  }
}
