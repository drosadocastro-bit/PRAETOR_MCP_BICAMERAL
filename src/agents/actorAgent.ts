import { AgentHandoff, HandoffSourceType } from '../handoffs/schema.js';

export interface ActorProposalInput {
  sessionId: string;
  userPrompt: string;
  retrievedEvidence?: Array<{ id: string; text: string; sourceType: string }>;
  traceId: string;
}

export interface ActorProposalOutput {
  actorId: string;
  proposedAnswer: string;
  handoff: AgentHandoff;
}

export class ActorAgent {
  public readonly agentId: string = 'actor-agent-01';

  public async propose(input: ActorProposalInput): Promise<ActorProposalOutput> {
    const evidenceIds = (input.retrievedEvidence ?? []).map(e => e.id);
    const hasEvidence = evidenceIds.length > 0;

    const proposedAnswer = `Actor proposal for prompt: "${input.userPrompt}". Evidence attached: ${evidenceIds.join(', ') || 'None'}.`;

    const handoff: AgentHandoff = {
      handoffId: `ho-act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceAgentId: this.agentId,
      destinationAgentId: 'supervisor-agent-01',
      sourceType: hasEvidence ? HandoffSourceType.RETRIEVED_EVIDENCE : HandoffSourceType.MODEL_INFERENCE,
      content: proposedAnswer,
      evidenceIds,
      provenanceIds: hasEvidence ? evidenceIds.map(id => `prov-${id}`) : [],
      validationStatus: 'UNVALIDATED' as any,
      allowedUseScope: ['ADVISORY_PROPOSAL'],
      confidenceCap: hasEvidence ? 0.85 : 0.4,
      contradictionStatus: 'NONE' as any,
      contaminationStatus: 'CLEAN' as any,
      contaminationClass: 'C0_CLEAN' as any,
      humanReviewRequired: false,
      traceId: input.traceId,
      timestamp: new Date().toISOString()
    };

    return {
      actorId: this.agentId,
      proposedAnswer,
      handoff
    };
  }
}
