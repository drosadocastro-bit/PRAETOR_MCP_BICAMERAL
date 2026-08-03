import { z } from 'zod';

export enum HandoffSourceType {
  RETRIEVED_EVIDENCE = 'RETRIEVED_EVIDENCE',
  MODEL_INFERENCE = 'MODEL_INFERENCE',
  SYSTEM_OBSERVATION = 'SYSTEM_OBSERVATION',
  POLICY_DECISION = 'POLICY_DECISION',
  HUMAN_DECISION = 'HUMAN_DECISION'
}

export enum ValidationStatus {
  UNVALIDATED = 'UNVALIDATED',
  VALID = 'VALID',
  INVALID = 'INVALID',
  CONTAMINATED = 'CONTAMINATED'
}

export enum ContradictionStatus {
  NONE = 'NONE',
  WEAK = 'WEAK',
  STRONG = 'STRONG'
}

export enum ContaminationStatus {
  CLEAN = 'CLEAN',
  SUSPECTED = 'SUSPECTED',
  CONFIRMED = 'CONFIRMED'
}

export enum ContaminationClass {
  C0_CLEAN = 'C0_CLEAN',
  C1_UNSUPPORTED_INFERENCE_PROPAGATION = 'C1_UNSUPPORTED_INFERENCE_PROPAGATION',
  C2_PROVENANCE_LOSS = 'C2_PROVENANCE_LOSS',
  C3_INDIRECT_PROMPT_INJECTION = 'C3_INDIRECT_PROMPT_INJECTION',
  C4_SHARED_SOURCE_FALSE_CONSENSUS = 'C4_SHARED_SOURCE_FALSE_CONSENSUS',
  C5_AUTHORITY_ESCALATION = 'C5_AUTHORITY_ESCALATION',
  C6_MEMORY_STATE_CONTAMINATION = 'C6_MEMORY_STATE_CONTAMINATION',
  C7_TOOL_RESULT_CONTAMINATION = 'C7_TOOL_RESULT_CONTAMINATION',
  C8_SUPERVISOR_CONTAMINATION = 'C8_SUPERVISOR_CONTAMINATION',
  C9_CIRCULAR_REINFORCEMENT = 'C9_CIRCULAR_REINFORCEMENT',
  C10_AUDIT_TAMPERING_ATTEMPT = 'C10_AUDIT_TAMPERING_ATTEMPT'
}

export const AgentHandoffSchema = z.object({
  handoffId: z.string().describe('Unique identifier for this agent-to-agent handoff event.'),
  sourceAgentId: z.string().describe('ID of the agent initiating the handoff.'),
  destinationAgentId: z.string().describe('ID of the receiving agent.'),
  sourceType: z.nativeEnum(HandoffSourceType).describe('The underlying origin of the handoff payload.'),
  content: z.string().describe('Payload text passed between agents.'),
  evidenceIds: z.array(z.string()).default([]).describe('IDs of explicitly attached evidence records.'),
  provenanceIds: z.array(z.string()).default([]).describe('Lineage / provenance identifiers backing the payload.'),
  validationStatus: z.nativeEnum(ValidationStatus).default(ValidationStatus.UNVALIDATED),
  allowedUseScope: z.array(z.string()).default(['ADVISORY_ONLY']),
  confidenceCap: z.number().min(0).max(1).optional(),
  contradictionStatus: z.nativeEnum(ContradictionStatus).default(ContradictionStatus.NONE),
  contaminationStatus: z.nativeEnum(ContaminationStatus).default(ContaminationStatus.CLEAN),
  contaminationClass: z.nativeEnum(ContaminationClass).default(ContaminationClass.C0_CLEAN),
  humanReviewRequired: z.boolean().default(false),
  traceId: z.string().describe('Correlation trace ID for cross-agent execution tracking.'),
  timestamp: z.string().default(() => new Date().toISOString())
});

export type AgentHandoff = z.infer<typeof AgentHandoffSchema>;
