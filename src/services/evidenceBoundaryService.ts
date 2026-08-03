import { CortexEvidenceGate, EvidenceBoundaryInput, EvidenceBoundaryResult, EvidenceBoundaryDecision, ClaimItem } from '../cortex/evidenceGate.js';
import type { AuditEventSink } from '../audit.js';

export interface EvidenceBoundaryServiceResult {
  verifiedClaims: ClaimItem[];
  unsupportedClaims: ClaimItem[];
  missingAuthorizedSource: boolean;
  provenanceFailures: string[];
  evidenceDecision: EvidenceBoundaryDecision;
  result: EvidenceBoundaryResult;
}

export class EvidenceBoundaryService {
  private gate: CortexEvidenceGate;

  constructor(auditSink?: AuditEventSink) {
    this.gate = new CortexEvidenceGate(auditSink);
  }

  public async evaluate(input: EvidenceBoundaryInput): Promise<EvidenceBoundaryServiceResult> {
    const boundaryResult = await this.gate.evaluateAndAudit(input);

    const verifiedClaims = boundaryResult.claims.filter(c => c.verified);
    const unsupportedClaims = boundaryResult.unsupportedClaims;
    const missingAuthorizedSource = boundaryResult.missingAuthorizedSource;

    const provenanceFailures: string[] = [];
    if (missingAuthorizedSource) {
      provenanceFailures.push('Referenced report, record, or procedure is absent from authorized retrieved evidence.');
    }
    for (const claim of unsupportedClaims) {
      provenanceFailures.push(`Claim "${claim.text}" lacks authorized supporting evidence.`);
    }

    return {
      verifiedClaims,
      unsupportedClaims,
      missingAuthorizedSource,
      provenanceFailures,
      evidenceDecision: boundaryResult.decision,
      result: boundaryResult
    };
  }
}
