import { AgentHandoff, HandoffSourceType } from '../handoffs/schema.js';
import { HandoffValidator } from '../handoffs/validator.js';

export interface SupervisorReviewInput {
  actorHandoff: AgentHandoff;
  traceId: string;
}

export interface SupervisorReviewOutput {
  supervisorId: string;
  directive: string;
  handoff: AgentHandoff;
}

export class SupervisorAgent {
  public readonly agentId: string = 'supervisor-agent-01';
  private validator = new HandoffValidator();

  public async review(input: SupervisorReviewInput): Promise<SupervisorReviewOutput> {
    const validationResult = this.validator.validate(input.actorHandoff);

    let directive = '';
    let sourceType = HandoffSourceType.POLICY_DECISION;

    if (!validationResult.isValid) {
      directive = `Supervisor Directive: REJECTED ACTOR PROPOSAL due to contamination [${validationResult.contaminationClass}]. Issue mandatory evidence boundary request and route to human review.`;
      sourceType = HandoffSourceType.POLICY_DECISION;
    } else if (input.actorHandoff.evidenceIds.length === 0) {
      directive = `Supervisor Directive: Actor proposal lacks verified evidence support. Require authorized evidence ingestion before proceeding.`;
    } else {
      directive = `Supervisor Directive: Actor proposal validated against evidence [${input.actorHandoff.evidenceIds.join(', ')}]. Forward to PRAETOR Deterministic Governance for dual boundary evaluation.`;
    }

    const handoff: AgentHandoff = {
      handoffId: `ho-sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceAgentId: this.agentId,
      destinationAgentId: 'praetor-governance-service',
      sourceType,
      content: directive,
      evidenceIds: input.actorHandoff.evidenceIds,
      provenanceIds: input.actorHandoff.provenanceIds,
      validationStatus: validationResult.isValid ? ('VALID' as any) : ('CONTAMINATED' as any),
      allowedUseScope: ['SUPERVISORY_DIRECTIVE'],
      confidenceCap: validationResult.isValid ? 0.9 : 0.1,
      contradictionStatus: 'NONE' as any,
      contaminationStatus: validationResult.isValid ? ('CLEAN' as any) : ('CONFIRMED' as any),
      contaminationClass: validationResult.contaminationClass as any,
      humanReviewRequired: !validationResult.isValid || input.actorHandoff.evidenceIds.length === 0,
      traceId: input.traceId,
      timestamp: new Date().toISOString()
    };

    return {
      supervisorId: this.agentId,
      directive,
      handoff
    };
  }
}
