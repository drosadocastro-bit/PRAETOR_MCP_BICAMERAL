import type { RiskAssessment, RiskCategory, RiskLevel } from '../types/risk.js';

export interface RiskAssessmentInput {
  userPrompt: string;
  draftAnswer?: string;
  domain?: string;
}

interface RiskRule {
  id: string;
  flag: string;
  category: RiskCategory;
  level: RiskLevel;
  pattern: RegExp;
  reasonCode: string;
  description: string;
}

const RISK_RULES: RiskRule[] = [
  {
    id: 'R001',
    flag: 'DISABLE_SAFETY_MECHANISM',
    category: 'disable_safety_mechanism',
    level: 'high',
    pattern: /disable (?:[a-z\s]+)?(?:brakes?|fire alarm|alarm|safety|interlock)|how (?:i |can i |to )?disable (?:[a-z\s]+)?brakes?/i,
    reasonCode: 'REQ_DISABLE_SAFETY_MECHANISM',
    description: 'Request asks to disable operational brakes or safety mechanism.'
  },
  {
    id: 'R002',
    flag: 'SAFETY_CRITICAL_ACTION',
    category: 'safety_critical_action',
    level: 'high',
    pattern: /(?:disable|disconnect|cut|override|turn off|remove) (?:[a-z\s]+)?(?:brakes?|emergency stop|safety valve|interlock|coolant|hydraulic pump|fire alarm|alarm)/i,
    reasonCode: 'REQ_SAFETY_CRITICAL_ACTION',
    description: 'Request involves unsafe or safety-critical equipment modification.'
  },
  {
    id: 'R003',
    flag: 'DISABLE_SAFETY_MECHANISM',
    category: 'disable_safety_mechanism',
    level: 'high',
    pattern: /bypass (?:[a-z\s]+)?(?:interlock|safety|alarm|valve)|silence (?:[a-z\s]+)?(?:fire )?alarm|deactivate (?:[a-z\s]+)?alarm/i,
    reasonCode: 'REQ_BYPASS_INTERLOCK',
    description: 'Request asks to bypass safety interlock or deactivate warning systems.'
  },
  {
    id: 'R004',
    flag: 'AUTHORIZATION_BYPASS',
    category: 'authorization_bypass',
    level: 'high',
    pattern: /(?:fake|claimed|chat-provided) (?:human )?approval|bypass authorization|skip (?:supervisor|manager|human) review|without authorization/i,
    reasonCode: 'REQ_AUTHORIZATION_BYPASS',
    description: 'Request attempts to claim unverified authorization or bypass review procedures.'
  },
  {
    id: 'R005',
    flag: 'PROCEDURE_OVERRIDE',
    category: 'procedure_override',
    level: 'high',
    pattern: /override (?:[a-z\s]+)?(?:safety mechanism|operating procedure|procedure|protocol)|force (?:the )?override|ignore (?:the )?safety protocol/i,
    reasonCode: 'REQ_PROCEDURE_OVERRIDE',
    description: 'Request attempts to override standard operating procedures or safety controls.'
  }
];

export class RiskAssessmentService {
  public evaluate(input: RiskAssessmentInput): RiskAssessment {
    const haystack = `${input.userPrompt} ${input.draftAnswer ?? ''}`;

    const matchedRules = RISK_RULES.filter(rule => rule.pattern.test(haystack));

    if (matchedRules.length === 0) {
      return {
        riskLevel: 'low',
        riskCategories: [],
        unsafeActionFlags: [],
        requiresHumanReview: false,
        allowedResponseMode: 'normal',
        reasonCodes: []
      };
    }

    const unsafeActionFlags = [...new Set(matchedRules.map(r => r.flag))];
    const riskCategories = [...new Set(matchedRules.map(r => r.category))];
    const reasonCodes = [...new Set(matchedRules.map(r => r.reasonCode))];

    // Determine highest risk level
    let riskLevel: RiskLevel = 'low';
    if (matchedRules.some(r => r.level === 'critical')) {
      riskLevel = 'critical';
    } else if (matchedRules.some(r => r.level === 'high')) {
      riskLevel = 'high';
    } else if (matchedRules.some(r => r.level === 'moderate')) {
      riskLevel = 'moderate';
    }

    const requiresHumanReview = riskLevel === 'high' || riskLevel === 'critical';
    const allowedResponseMode = riskLevel === 'high' || riskLevel === 'critical' ? 'refuse_action' : 'bounded';

    return {
      riskLevel,
      riskCategories,
      unsafeActionFlags,
      requiresHumanReview,
      allowedResponseMode,
      reasonCodes
    };
  }
}
