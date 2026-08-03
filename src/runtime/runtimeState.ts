import { randomUUID } from 'node:crypto';

import type { Protocol66Decision, Protocol66Event } from '../protocol66.js';
import { TraceRecorder } from './traceRecorder.js';

export type RuntimeState =
  | 'ACTIVE'
  | 'ELEVATED'
  | 'DEGRADED'
  | 'QUARANTINE_LOCKED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'RECOVERY_PENDING';

export interface RuntimeTransition {
  trace_id: string;
  session_id: string;
  timestamp: string;
  from: RuntimeState;
  to: RuntimeState;
  reason: string;
}

export interface RuntimeSessionSnapshot {
  session_id: string;
  state: RuntimeState;
  human_review_required: boolean;
  retry_allowed: boolean;
  tool_access: 'enabled' | 'disabled';
  output_mode: 'normal' | 'blocked';
  planning_enabled: boolean;
  max_steps: number;
  transitions: RuntimeTransition[];
}

export class RuntimeSession {
  private state: RuntimeState = 'ACTIVE';
  private readonly transitions: RuntimeTransition[] = [];
  private readonly protocolEvents: Protocol66Event[] = [];

  constructor(
    readonly sessionId: string,
    private readonly traceRecorder = new TraceRecorder()
  ) {}

  get currentState(): RuntimeState {
    return this.state;
  }

  get events(): Protocol66Event[] {
    return [...this.protocolEvents];
  }

  async transition(to: RuntimeState, reason: string, traceId: string = randomUUID()): Promise<RuntimeTransition> {
    if (this.state === to) {
      return {
        trace_id: traceId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        from: this.state,
        to,
        reason: `State already ${to}: ${reason}`
      };
    }

    const transition: RuntimeTransition = {
      trace_id: traceId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      from: this.state,
      to,
      reason: reason.slice(0, 1000)
    };
    this.state = to;
    this.transitions.push(transition);
    await this.traceRecorder.record({
      trace_id: traceId,
      session_id: this.sessionId,
      timestamp: transition.timestamp,
      event_type: 'runtime_state_transition',
      state: to,
      summary: transition.reason,
      fields: { from: transition.from, to: transition.to }
    });
    return transition;
  }

  async applyProtocol66(decision: Protocol66Decision): Promise<void> {
    const known = new Set(this.protocolEvents.map(event => `${event.kind}|${event.occurred_at}|${event.interaction_index}`));
    for (const event of [...decision.hard_triggers, ...decision.soft_triggers_in_window]) {
      const key = `${event.kind}|${event.occurred_at}|${event.interaction_index}`;
      if (!known.has(key)) {
        this.protocolEvents.push(event);
        known.add(key);
      }
    }
    if (decision.status === 'PROTOCOL_66') {
      await this.transition('QUARANTINE_LOCKED', decision.reason);
    } else if (decision.status === 'ELEVATED' && this.state === 'ACTIVE') {
      await this.transition('ELEVATED', decision.reason);
    } else if (decision.status === 'NORMAL' && this.state === 'ELEVATED') {
      await this.transition('ACTIVE', decision.reason);
    }
  }

  async requireHumanReview(reason: string): Promise<void> {
    if (this.state !== 'QUARANTINE_LOCKED') {
      await this.transition('HUMAN_REVIEW_REQUIRED', reason);
    }
  }

  snapshot(): RuntimeSessionSnapshot {
    const quarantined = this.state === 'QUARANTINE_LOCKED' || this.state === 'HUMAN_REVIEW_REQUIRED' || this.state === 'RECOVERY_PENDING';
    const restricted = this.state === 'ELEVATED' || this.state === 'DEGRADED';
    return {
      session_id: this.sessionId,
      state: this.state,
      human_review_required: quarantined,
      retry_allowed: !quarantined,
      tool_access: quarantined ? 'disabled' : 'enabled',
      output_mode: quarantined ? 'blocked' : 'normal',
      planning_enabled: !quarantined,
      max_steps: quarantined ? 0 : restricted ? 2 : 10,
      transitions: this.transitions.map(transition => ({ ...transition }))
    };
  }

  trace(): ReturnType<TraceRecorder['snapshot']> {
    return this.traceRecorder.snapshot();
  }

  async recordTrace(traceId: string, eventType: string, summary: string, fields: Record<string, string>): Promise<void> {
    await this.traceRecorder.record({
      trace_id: traceId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      event_type: eventType,
      state: this.state,
      summary,
      fields
    });
  }
}
