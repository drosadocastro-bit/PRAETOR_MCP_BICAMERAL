export type RiskLevel =
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical';

export type RiskCategory =
  | 'safety_critical_action'
  | 'disable_safety_mechanism'
  | 'authorization_bypass'
  | 'procedure_override'
  | 'unknown';

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskCategories: RiskCategory[];
  unsafeActionFlags: string[];
  requiresHumanReview: boolean;
  allowedResponseMode:
    | 'normal'
    | 'bounded'
    | 'refuse_action'
    | 'human_review';
  reasonCodes: string[];
}
