import { EvidenceBoundaryService, EvidenceBoundaryServiceResult } from './evidenceBoundaryService.js';
import { RiskAssessmentService } from './riskAssessmentService.js';
import type { RiskAssessmentInput } from './riskAssessmentService.js';
import type { GovernanceDecision, GovernanceDecisionType } from '../types/governance.js';
import type { EvidenceBoundaryInput } from '../cortex/evidenceGate.js';
import { AuditEventSink, FileAuditEventSink, createAuditEventId, hashPrompt } from '../audit.js';

export class GovernanceDecisionService {
  private evidenceService: EvidenceBoundaryService;
  private riskService: RiskAssessmentService;
  private auditSink?: AuditEventSink;

  constructor(auditSink?: AuditEventSink) {
    this.auditSink = auditSink ?? new FileAuditEventSink();
    this.evidenceService = new EvidenceBoundaryService(this.auditSink);
    this.riskService = new RiskAssessmentService();
  }

  public async evaluateCompoundGovernance(input: EvidenceBoundaryInput): Promise<GovernanceDecision> {
    // 1. Evaluate Evidence Boundary independently
    const evidenceEval = await this.evidenceService.evaluate(input);
    const { result: evidenceBoundary } = evidenceEval;

    // 2. Evaluate Risk Assessment independently
    const riskInput: RiskAssessmentInput = {
      userPrompt: input.userPrompt,
      draftAnswer: input.draftAnswer,
      domain: input.domain
    };
    const riskAssessment = this.riskService.evaluate(riskInput);

    // 3. Compose Governance Decision
    let decision: GovernanceDecisionType = 'allow_bounded_response';
    const reasons: string[] = [];

    const isHighRisk = riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical';
    const isUnsupportedEvidence = evidenceBoundary.unsupportedClaims.length > 0 || evidenceBoundary.missingAuthorizedSource;

    if (isHighRisk && isUnsupportedEvidence) {
      decision = 'block_action_and_request_authorized_evidence';
      reasons.push('High-risk action request detected (safety critical).');
      reasons.push('Maintenance claim lacks authorized supporting evidence.');
    } else if (isHighRisk && !isUnsupportedEvidence) {
      decision = 'block_unsafe_action';
      reasons.push('High-risk action request detected (safety critical).');
      if (evidenceEval.verifiedClaims.length > 0) {
        reasons.push('Supported factual conclusions preserved, but actionable unsafe guidance is withheld.');
      }
    } else if (!isHighRisk && isUnsupportedEvidence) {
      decision = 'request_authorized_ingestion';
      reasons.push('Claim lacks authorized retrieved evidence; requesting source ingestion.');
    } else {
      decision = 'allow_bounded_response';
      reasons.push('Request is within safe operational boundaries and supported by evidence.');
    }

    if (riskAssessment.requiresHumanReview && decision === 'allow_bounded_response') {
      decision = 'require_human_review';
    }

    // Build compound boundary response text
    const responseParts: string[] = [];

    if (isHighRisk) {
      responseParts.push(`Action Refusal: The requested action involving [${riskAssessment.unsafeActionFlags.join(', ')}] is safety-critical and cannot be instructed, authorized, or performed.`);
    }

    if (isUnsupportedEvidence) {
      responseParts.push('Evidence Boundary: I cannot present this as a verified Praetor/MCP conclusion. The claim lacks authorized supporting evidence from retrieved maintenance records.');
    } else if (evidenceEval.verifiedClaims.length > 0) {
      responseParts.push(`Factual Status: ${evidenceEval.verifiedClaims.length} claim(s) are supported by retrieved evidence.`);
    }

    if (isHighRisk || isUnsupportedEvidence) {
      responseParts.push('Recommendation: A qualified human review and authorized source ingestion are required before taking any operational or maintenance action.');
    } else {
      responseParts.push('Bounded Advisory: Findings reflect available retrieved evidence.');
    }

    const boundaryResponse = responseParts.join(' ');

    const finalDecision: GovernanceDecision = {
      evidence: evidenceBoundary,
      risk: riskAssessment,
      decision,
      reasons: [...reasons, ...evidenceBoundary.reasons],
      boundaryResponse,
      sessionId: input.sessionId ?? 'session-default'
    };

    // Log compound audit event
    if (this.auditSink) {
      try {
        await this.auditSink.append({
          event_id: createAuditEventId(),
          timestamp: new Date().toISOString(),
          session_id: input.sessionId ?? 'unknown-session',
          event_type: 'compound_governance_evaluation',
          severity: isHighRisk ? 'high' : isUnsupportedEvidence ? 'medium' : 'low',
          domain: input.domain ?? 'operational_maintenance',
          source_boundary: isUnsupportedEvidence ? 'authorized_evidence_missing' : 'evidence_boundary',
          claim_source: 'user_prompt',
          authorized_evidence_available: !evidenceBoundary.missingAuthorizedSource,
          tool_calls_used: input.toolCallsUsed ?? [],
          shouldLog: true,
          eventLogged: true,
          recommended_action: decision,
          explanation: reasons.join('; '),
          prompt_hash: hashPrompt(input.userPrompt),
          answer_decision: decision,
          evidence_boundary_decision: evidenceBoundary.decision,
          risk_level: riskAssessment.riskLevel,
          risk_flags: riskAssessment.unsafeActionFlags,
          final_governance_decision: decision,
          reason_codes: riskAssessment.reasonCodes,
          trace_id: `trace-${Date.now()}`
        });
      } catch (err) {
        // Audit log failure handled silently to avoid failing evaluation
      }
    }

    return finalDecision;
  }
}
