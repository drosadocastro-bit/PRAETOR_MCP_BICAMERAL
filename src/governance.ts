import type { AdvisoryPacketDraft, GuardrailResult, IntegrityAssessment } from './types.js';
import { scoreIntegrity } from './integrity.js';

export interface GovernanceOutcome extends IntegrityAssessment {
  accepted: boolean;
}

export function evaluateAdvisoryPacket(packet: AdvisoryPacketDraft): GovernanceOutcome {
  const assessment = scoreIntegrity(packet);
  const accepted = assessment.verdict === 'safe' || assessment.verdict === 'doubtful';

  return {
    ...assessment,
    accepted
  };
}

export function normalizeGuardrails(packet: AdvisoryPacketDraft, assessment: IntegrityAssessment): GuardrailResult[] {
  return packet.guardrail_results && packet.guardrail_results.length > 0 ? packet.guardrail_results : assessment.guardrail_results;
}
