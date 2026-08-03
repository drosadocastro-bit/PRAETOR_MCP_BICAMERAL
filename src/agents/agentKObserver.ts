import { AgentHandoff, ContaminationClass, ContaminationStatus } from '../handoffs/schema.js';
import type { AuditEventSink } from '../audit.js';
import { hashPrompt } from '../audit.js';

export type AgentKReactionState = 'NORMAL' | 'ELEVATED' | 'PROTOCOL_66';

export interface ObservationTrace {
  actorId: string;
  supervisorId?: string;
  handoffId: string;
  sourceType: string;
  provenanceIds: string[];
  toolCall?: string;
  toolResult?: unknown;
  authorityRequest?: string;
  authorityGranted?: boolean;
  riskFlags?: string[];
  contaminationFlags?: string[];
  boundaryResult?: string;
  finalGovernanceDecision?: string;
}

export class AgentKObserver {
  private reactionState: AgentKReactionState = 'NORMAL';
  private observationHistory: ObservationTrace[] = [];

  constructor(private auditSink?: AuditEventSink) {}

  public get currentState(): AgentKReactionState {
    return this.reactionState;
  }

  public get history(): ReadonlyArray<ObservationTrace> {
    return this.observationHistory;
  }

  /**
   * Observes an agent handoff and determines if containment state transitions are warranted.
   */
  public async observeHandoff(handoff: AgentHandoff, contextFlags: string[] = []): Promise<AgentKReactionState> {
    const trace: ObservationTrace = {
      actorId: handoff.sourceAgentId,
      supervisorId: handoff.destinationAgentId,
      handoffId: handoff.handoffId,
      sourceType: handoff.sourceType,
      provenanceIds: handoff.provenanceIds,
      contaminationFlags: [handoff.contaminationClass, ...contextFlags]
    };

    this.observationHistory.push(trace);

    // Tier 1 Hard Triggers -> PROTOCOL_66
    const tier1Classes = [
      ContaminationClass.C3_INDIRECT_PROMPT_INJECTION,
      ContaminationClass.C5_AUTHORITY_ESCALATION,
      ContaminationClass.C6_MEMORY_STATE_CONTAMINATION,
      ContaminationClass.C10_AUDIT_TAMPERING_ATTEMPT
    ];

    if (tier1Classes.includes(handoff.contaminationClass as ContaminationClass)) {
      this.reactionState = 'PROTOCOL_66';
    } else if (
      handoff.contaminationStatus === ContaminationStatus.CONFIRMED ||
      handoff.contaminationClass === ContaminationClass.C4_SHARED_SOURCE_FALSE_CONSENSUS ||
      handoff.contaminationClass === ContaminationClass.C9_CIRCULAR_REINFORCEMENT
    ) {
      // Tier 2 Soft Triggers -> ELEVATED
      if (this.reactionState !== 'PROTOCOL_66') {
        this.reactionState = 'ELEVATED';
      }
    }

    if (this.auditSink) {
      const severity = this.reactionState === 'PROTOCOL_66' ? 'critical' : this.reactionState === 'ELEVATED' ? 'high' : 'low';
      await this.auditSink.append({
        event_id: `evt-k-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        session_id: handoff.traceId,
        event_type: 'AGENT_K_OBSERVATION',
        severity,
        domain: 'governance',
        source_boundary: 'agent_k_observer',
        claim_source: handoff.sourceAgentId,
        authorized_evidence_available: handoff.evidenceIds.length > 0,
        tool_calls_used: [],
        shouldLog: true,
        eventLogged: true,
        recommended_action: this.reactionState === 'PROTOCOL_66' ? 'QUARANTINE_AGENT_EXECUTION' : 'MONITOR_HANDOFF',
        explanation: `Agent K observed handoff ${handoff.handoffId} with status ${handoff.contaminationStatus}`,
        prompt_hash: hashPrompt(handoff.content),
        answer_decision: `AGENT_K_STATE_${this.reactionState}`,
        evidence_boundary_decision: handoff.contaminationClass,
        risk_level: severity,
        risk_flags: [handoff.contaminationClass, ...contextFlags],
        final_governance_decision: `AGENT_K_STATE_${this.reactionState}`,
        trace_id: handoff.traceId
      });
    }

    return this.reactionState;
  }

  public resetState(): void {
    this.reactionState = 'NORMAL';
  }
}
