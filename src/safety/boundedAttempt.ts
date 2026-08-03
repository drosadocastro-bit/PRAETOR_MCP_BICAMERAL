import type { RuntimeSession } from '../runtime/runtimeState.js';
import type { ToolActionType, ToolRequest } from '../runtime/toolGateway.js';

export interface BoundedAttemptContract {
  agentId: string;
  sessionId: string;
  allowedTools: readonly string[];
  allowedActionTypes: readonly ToolActionType[];
  requiresHumanReview: true;
  retryPolicy: {
    maxAttempts: number;
    retryAfterDenial: boolean;
  };
}

export interface BoundedAttemptAllowed {
  decision: 'allow';
  reason: string;
}

export interface BoundedAttemptBlocked {
  decision: 'stop_and_escalate';
  code: 'session_identity_mismatch' | 'tool_not_allowed' | 'action_type_not_allowed' | 'retry_after_denial' | 'attempt_limit_exceeded' | 'quarantine_active';
  reason: string;
  humanReviewRequired: true;
}

export type BoundedAttemptDecision = BoundedAttemptAllowed | BoundedAttemptBlocked;

export async function inspectBoundedAttempt(
  session: RuntimeSession,
  contract: BoundedAttemptContract | undefined,
  request: ToolRequest,
  previousDenials: number,
  attemptNumber = 1
): Promise<BoundedAttemptDecision> {
  if (!contract) {
    return { decision: 'allow', reason: 'No bounded attempt contract was supplied.' };
  }

  let blocked: BoundedAttemptBlocked | undefined;
  if (contract.agentId.length === 0 || contract.sessionId.length === 0 || contract.sessionId !== session.sessionId) {
    blocked = blockedAttempt('session_identity_mismatch', 'The bounded attempt contract does not match the runtime session.');
  } else if (!contract.allowedTools.includes(request.toolName)) {
    blocked = blockedAttempt('tool_not_allowed', `Tool ${request.toolName} is outside the agent contract.`);
  } else if (!contract.allowedActionTypes.includes(request.actionType)) {
    blocked = blockedAttempt('action_type_not_allowed', `Action type ${request.actionType} is outside the agent contract.`);
  } else if (attemptNumber > contract.retryPolicy.maxAttempts) {
    blocked = blockedAttempt('attempt_limit_exceeded', 'The bounded attempt limit has been reached; further work must stop for human review.');
  } else if (previousDenials > 0 && !contract.retryPolicy.retryAfterDenial) {
    blocked = blockedAttempt('retry_after_denial', 'A denied action cannot be retried through the bounded agent contract.');
  } else if (session.snapshot().tool_access === 'disabled') {
    blocked = blockedAttempt('quarantine_active', 'The runtime is quarantined; the bounded attempt must stop for human review.');
  }

  if (blocked) {
    await session.recordTrace(request.traceId, 'bounded_attempt_stopped', blocked.reason, {
      agent: contract.agentId,
      tool: request.toolName,
      action_type: request.actionType,
      code: blocked.code
    });
    return blocked;
  }

  return { decision: 'allow', reason: 'Bounded attempt is within the agent contract.' };
}

function blockedAttempt(code: BoundedAttemptBlocked['code'], reason: string): BoundedAttemptBlocked {
  return {
    decision: 'stop_and_escalate',
    code,
    reason,
    humanReviewRequired: true
  };
}
