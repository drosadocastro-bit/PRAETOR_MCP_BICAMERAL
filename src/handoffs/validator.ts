import {
  AgentHandoff,
  AgentHandoffSchema,
  ContaminationClass,
  ContaminationStatus,
  HandoffSourceType,
  ValidationStatus
} from './schema.js';

export interface HandoffValidationResult {
  isValid: boolean;
  handoff: AgentHandoff;
  contaminationDetected: boolean;
  contaminationClass: ContaminationClass;
  issues: string[];
}

export class HandoffValidator {
  /**
   * Evaluates an AgentHandoff contract and detects cross-agent contamination vectors.
   */
  public validate(rawHandoff: unknown): HandoffValidationResult {
    const issues: string[] = [];
    const parseResult = AgentHandoffSchema.safeParse(rawHandoff);

    if (!parseResult.success) {
      return {
        isValid: false,
        handoff: rawHandoff as AgentHandoff,
        contaminationDetected: true,
        contaminationClass: ContaminationClass.C10_AUDIT_TAMPERING_ATTEMPT,
        issues: parseResult.error.issues.map(e => `${e.path.map(String).join('.')}: ${e.message}`)
      };
    }

    const handoff = parseResult.data;
    const contentLower = handoff.content.toLowerCase();

    // 0. Check for Pre-Flagged Contamination Class
    if (
      handoff.contaminationClass &&
      handoff.contaminationClass !== ContaminationClass.C0_CLEAN
    ) {
      issues.push(`Contamination ${handoff.contaminationClass}: Pre-flagged contamination in handoff payload.`);
      return this.buildResult(handoff, handoff.contaminationClass, issues);
    }

    // 1. Check for Indirect Prompt Injection (C3)
    const injectionPatterns = [
      'ignore prior instructions',
      'ignore governance',
      'override safety',
      'disable brakes',
      'bypass security',
      'system prompt:',
      'you are now root',
      'ignore boundary'
    ];
    if (injectionPatterns.some(p => contentLower.includes(p))) {
      issues.push('Contamination C3: Indirect prompt injection directive detected in handoff content.');
      return this.buildResult(handoff, ContaminationClass.C3_INDIRECT_PROMPT_INJECTION, issues);
    }

    // 2. Check for Audit Tampering Attempt (C10)
    const auditTamperingPatterns = [
      'delete audit log',
      'clear audit history',
      'modify score artifact',
      'alter audit',
      'wipe log'
    ];
    if (auditTamperingPatterns.some(p => contentLower.includes(p))) {
      issues.push('Contamination C10: Audit tampering instruction detected in handoff.');
      return this.buildResult(handoff, ContaminationClass.C10_AUDIT_TAMPERING_ATTEMPT, issues);
    }

    // 3. Check for False Authority Escalation (C5)
    const authorityEscalationClaims = [
      'supervisor approved',
      'human approved',
      'agent k cleared',
      'already authorized',
      'governance bypassed',
      'pre-approved'
    ];
    const claimsAuthority = authorityEscalationClaims.some(c => contentLower.includes(c));
    const hasAuthoritySource =
      handoff.sourceType === HandoffSourceType.HUMAN_DECISION ||
      handoff.sourceType === HandoffSourceType.POLICY_DECISION;

    if (claimsAuthority && (!hasAuthoritySource || handoff.provenanceIds.length === 0)) {
      issues.push('Contamination C5: Unbacked authority escalation claim without HUMAN_DECISION/POLICY_DECISION artifact.');
      return this.buildResult(handoff, ContaminationClass.C5_AUTHORITY_ESCALATION, issues);
    }

    // 4. Check for Memory State Contamination (C6)
    if (contentLower.includes('re-executing prior instruction') || contentLower.includes('prior instruction')) {
      issues.push('Contamination C6: Memory/State contamination reappearing from prior turn.');
      return this.buildResult(handoff, ContaminationClass.C6_MEMORY_STATE_CONTAMINATION, issues);
    }

    // 5. Check for Provenance Loss (C2)
    if (
      handoff.sourceType === HandoffSourceType.RETRIEVED_EVIDENCE &&
      handoff.evidenceIds.length === 0 &&
      handoff.provenanceIds.length === 0
    ) {
      issues.push('Contamination C2: Handoff claims RETRIEVED_EVIDENCE source type but lacks evidence and provenance IDs.');
      return this.buildResult(handoff, ContaminationClass.C2_PROVENANCE_LOSS, issues);
    }

    // 6. Check for Unsupported Inference Propagation (C1)
    if (
      handoff.sourceType === HandoffSourceType.MODEL_INFERENCE &&
      (handoff.confidenceCap === undefined || handoff.confidenceCap > 0.7) &&
      handoff.evidenceIds.length === 0
    ) {
      issues.push('Contamination C1: Unsupported inference model payload propagated without evidence grounding or confidence cap.');
      return this.buildResult(handoff, ContaminationClass.C1_UNSUPPORTED_INFERENCE_PROPAGATION, issues);
    }

    // Clean handoff
    return {
      isValid: true,
      handoff: {
        ...handoff,
        validationStatus: ValidationStatus.VALID,
        contaminationStatus: ContaminationStatus.CLEAN,
        contaminationClass: ContaminationClass.C0_CLEAN
      },
      contaminationDetected: false,
      contaminationClass: ContaminationClass.C0_CLEAN,
      issues: []
    };
  }

  private buildResult(
    handoff: AgentHandoff,
    contaminationClass: ContaminationClass,
    issues: string[]
  ): HandoffValidationResult {
    return {
      isValid: false,
      handoff: {
        ...handoff,
        validationStatus: ValidationStatus.CONTAMINATED,
        contaminationStatus: ContaminationStatus.CONFIRMED,
        contaminationClass,
        humanReviewRequired: true,
        confidenceCap: Math.min(handoff.confidenceCap ?? 0.2, 0.2)
      },
      contaminationDetected: true,
      contaminationClass,
      issues
    };
  }
}
