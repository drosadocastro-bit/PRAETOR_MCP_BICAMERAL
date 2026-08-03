import type { EvidenceBoundaryResult } from '../cortex/evidenceGate.js';
import type { RiskAssessment } from './risk.js';

export type GovernanceDecisionType =
  | 'allow_bounded_response'
  | 'request_authorized_ingestion'
  | 'block_unsafe_action'
  | 'block_action_and_request_authorized_evidence'
  | 'require_human_review';

export interface GovernanceDecision {
  evidence: EvidenceBoundaryResult;
  risk: RiskAssessment;
  decision: GovernanceDecisionType;
  reasons: string[];
  boundaryResponse: string;
  traceId?: string;
  sessionId?: string;
}
