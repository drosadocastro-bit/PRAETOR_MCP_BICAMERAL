/**
 * Standardized Evidence data structure for evidence comparison and governance evaluation.
 */
export interface Evidence {
  id: string;
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
  provenance?: string;
  sourceLineage?: string[];
  timestamp?: string;
  sourceDomain?: string;
  sourceId?: string;
}

export interface EvidenceComparisonResult {
  evidenceId: string;
  claimId: string;
  supported: boolean;
  confidence: number;
  notes?: string;
}
