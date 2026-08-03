import {
  AgentHandoff,
  ContaminationClass,
  ContaminationStatus,
  ValidationStatus
} from './schema.js';

export class HandoffSanitizer {
  /**
   * Sanitizes a handoff payload to prevent downstream contamination propagation.
   */
  public sanitize(handoff: AgentHandoff, contaminationClass: ContaminationClass): AgentHandoff {
    const dangerousPatterns = [
      /ignore prior instructions/gi,
      /ignore governance/gi,
      /override safety/gi,
      /disable brakes/gi,
      /bypass security/gi,
      /you are now root/gi,
      /delete audit log/gi,
      /clear audit history/gi
    ];

    let sanitizedContent = handoff.content;
    for (const pattern of dangerousPatterns) {
      sanitizerLoop: sanitizedContent = sanitizedContent.replace(pattern, '[REDACTED_CONTAMINATION_DIRECTIVE]');
    }

    return {
      ...handoff,
      content: `[SANITIZED HANDOFF — CONTAMINATION ${contaminationClass} DETECTED]: ${sanitizedContent}`,
      validationStatus: ValidationStatus.CONTAMINATED,
      contaminationStatus: ContaminationStatus.CONFIRMED,
      contaminationClass,
      humanReviewRequired: true,
      confidenceCap: Math.min(handoff.confidenceCap ?? 0.1, 0.1),
      allowedUseScope: ['QUARANTINED_REVIEW_ONLY']
    };
  }
}
