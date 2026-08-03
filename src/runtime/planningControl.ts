import type { RuntimeSession } from './runtimeState.js';

export interface PlanningPolicy {
  planningEnabled: boolean;
  retryAllowed: boolean;
  maxSteps: number;
  sensitiveToolsAllowed: boolean;
}

export function planningPolicy(session: RuntimeSession): PlanningPolicy {
  const snapshot = session.snapshot();
  return {
    planningEnabled: snapshot.planning_enabled,
    retryAllowed: snapshot.retry_allowed,
    maxSteps: snapshot.max_steps,
    sensitiveToolsAllowed: snapshot.state === 'ACTIVE'
  };
}

export function canRetry(session: RuntimeSession): boolean {
  return planningPolicy(session).retryAllowed;
}
