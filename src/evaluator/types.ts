export type EvalDecision = 'PASS' | 'REVIEW' | 'FAIL';

export type ReasonCategory =
  | 'SUPPORTED'
  | 'UNSUPPORTED_CLAIM'
  | 'HALLUCINATED_CITATION'
  | 'PROVENANCE_FAILURE'
  | 'RISK_BOUNDARY_FAILURE'
  | 'AUTHORITY_FAILURE'
  | 'OVER_REFUSAL'
  | 'SEMANTIC_ERROR'
  | 'STRUCTURAL_ERROR'
  | 'AMBIGUOUS';

export type DisagreementType =
  | 'LLM_PASS_K_FAIL'
  | 'LLM_FAIL_K_PASS'
  | 'LLM_REVIEW_K_PASS'
  | 'LLM_PASS_K_REVIEW'
  | 'OTHER';

export type DisagreementTaxonomyLevel =
  | 'D0_FULL_AGREEMENT'
  | 'D1_SEMANTIC_DISAGREEMENT'
  | 'D2_STRUCTURAL_DISAGREEMENT'
  | 'D3_RISK_DISAGREEMENT'
  | 'D4_EVIDENCE_GROUNDING_DISAGREEMENT'
  | 'D5_AUTHORITY_DISAGREEMENT'
  | 'D6_OVER_REFUSAL_DISAGREEMENT'
  | 'D7_JUDGE_MANIPULATION_DISAGREEMENT';

export interface LLMJudgeResult {
  decision: EvalDecision;
  confidence: number;
  reasonCodes: string[];
  semanticQuality: number; // 0.0 to 3.0
  evidenceGrounding: number; // 0.0 to 1.0
  instructionCompliance: number; // 0.0 to 1.0
  explanation: string;
  latencyMs: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd?: number;
  };
  consensusK?: number;
  confidenceRatio?: number;
  confidenceScore?: number;
  voteDistribution?: {
    PASS: number;
    REVIEW: number;
    FAIL: number;
  };
}

export interface AgentKResult {
  decision: EvalDecision;
  score: number; // 0.0 to 3.0
  reasonCodes: string[];
  triggeredRules: string[];
  auditEventIds: string[];
  isHardBoundaryViolation: boolean;
  latencyMs: number;
}

export interface HybridEvaluation {
  llmJudge: LLMJudgeResult;
  agentK: AgentKResult;
  agreement: boolean;
  disagreementType?: DisagreementType;
  taxonomyLevel: DisagreementTaxonomyLevel;
  finalDisposition: EvalDecision;
  complementarySignal: boolean;
  fusionRuleApplied: string;
}

export interface EvalFixture {
  id: string;
  title: string;
  category: ReasonCategory;
  goldLabel: EvalDecision;
  taskPrompt: string;
  evidenceContext: string;
  candidateOutput: string;
  isAdversarialInjection?: boolean;
  isParaphraseVariant?: boolean;
  parentFixtureId?: string;
  isSycophancyTest?: boolean;
  isSemanticNuanceTest?: boolean;
  isHardBoundaryTest?: boolean;
  hardBoundaryRules?: string[];
  rubric: string;
}

export interface EvalRunRecord {
  runId: string;
  fixtureId: string;
  mode: 'A_LLM_JUDGE_ONLY' | 'B_AGENT_K_ONLY' | 'C_HYBRID';
  repetitionIndex: number;
  timestamp: string;
  fixtureCategory: ReasonCategory;
  goldLabel: EvalDecision;

  // Decision & Scoring
  decision: EvalDecision;
  score: number;
  isCorrect: boolean;
  isFalsePass: boolean;
  isFalseFail: boolean;

  // Evaluator specific details
  llmJudgeResult?: LLMJudgeResult;
  agentKResult?: AgentKResult;
  hybridResult?: HybridEvaluation;

  // Performance
  latencyMs: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface DisagreementRecord {
  fixtureId: string;
  runId: string;
  category: ReasonCategory;
  goldLabel: EvalDecision;
  llmDecision: EvalDecision;
  agentKDecision: EvalDecision;
  disagreementType: DisagreementType;
  taxonomyLevel: DisagreementTaxonomyLevel;
  finalDisposition: EvalDecision;
  llmExplanation: string;
  agentKTriggeredRules: string[];
  wasRescuedByHybrid: boolean;
  rescuedBy: 'AGENT_K' | 'LLM_JUDGE' | 'NEITHER';
}

export interface EvaluatorModeSummary {
  mode: string;
  totalRuns: number;
  accuracy: number;
  precision: number;
  recall: number;
  falsePassRate: number;
  falseFailRate: number;
  reviewRate: number;
  reproducibilityScore: number;
  meanLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface StudyMetricsAggregate {
  experimentId: string;
  timestamp: string;
  totalFixtures: number;
  totalRepetitions: number;
  totalEvaluations: number;
  modes: {
    conditionA_LLMOnly: EvaluatorModeSummary;
    conditionB_AgentKOnly: EvaluatorModeSummary;
    conditionC_Hybrid: EvaluatorModeSummary;
  };
  complementarityMatrix: {
    bothCorrect: number;
    llmOnlyCorrect: number; // LLM rescued K miss
    agentKOnlyCorrect: number; // K rescued LLM miss
    bothWrong: number;
  };
  majorityVoteComplementarityMatrix: {
    bothCorrect: number;
    llmOnlyCorrect: number;
    agentKOnlyCorrect: number;
    bothWrong: number;
  };
  judgeInjectionSuccessRate: {
    llmJudge: number;
    agentK: number;
    hybrid: number;
  };
  sycophancySusceptibility: {
    llmJudge: number;
    agentK: number;
    hybrid: number;
  };
  disagreementCount: number;
  disagreementBreakdown: Record<DisagreementTaxonomyLevel, number>;
}
