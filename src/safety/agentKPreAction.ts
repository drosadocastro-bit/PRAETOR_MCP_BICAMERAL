import type { RuntimeSession } from '../runtime/runtimeState.js';
import type { DeliberationContract } from './deliberationContract.js';
import type { ToolActionType, ToolRequest } from '../runtime/toolGateway.js';

export interface PreActionInspection {
  allowed: boolean;
  hardViolations: string[];
  softViolations: string[];
  reason: string;
}

const HARD_PATTERNS: Array<[RegExp, string]> = [
  [/(?:override|bypass|ignore|disable)\s+(?:all\s+)?guardrails?/i, 'attempt to override guardrails'],
  [/(?:self[- ]certif|certify this system|mark itself reviewed)/i, 'attempt to self-certify or self-review'],
  [/(?:access|read|retrieve|dump).{0,40}(?:scoring artifact|private score|hidden reasoning)/i, 'attempt to access restricted scoring or reasoning artifacts'],
  [/(?:modify|alter|delete|tamper|rewrite).{0,40}(?:audit|trace|log)/i, 'attempt to modify audit traces'],
  [/(?:bypass|skip|avoid).{0,40}(?:human review|review boundary)/i, 'attempt to bypass human review']
];

export class AgentKPreActionInspector {
  async inspect(session: RuntimeSession, contract: DeliberationContract | undefined, request: ToolRequest, previousDenials: number): Promise<PreActionInspection> {
    const hardViolations: string[] = [];
    const softViolations: string[] = [];
    if (!contract) {
      softViolations.push('missing deliberation contract');
    } else {
      if (contract.session_id !== session.sessionId) {
        hardViolations.push('deliberation contract session mismatch');
      }
      const declaredText = `${contract.intended_action} ${contract.reason_summary}`;
      for (const [pattern, reason] of HARD_PATTERNS) {
        if (pattern.test(declaredText)) {
          hardViolations.push(reason);
        }
      }
      if (contract.requested_tool && contract.requested_tool !== request.toolName) {
        softViolations.push('declared intent and requested tool mismatch');
      }
      if (contract.action_type !== request.actionType && contract.action_type !== 'unknown') {
        softViolations.push('declared action type and requested action type mismatch');
      }
      if (contract.retry_of_denied_action || previousDenials > 0) {
        softViolations.push('retry of a previously denied action');
      }
      if (request.sensitive && !contract.requires_human_review) {
        softViolations.push('sensitive action does not declare human review');
      }
    }
    if (request.actionType === 'submit' && /submit|advisory/i.test(request.argumentSummary) && previousDenials > 0) {
      hardViolations.push('attempt to submit after denial');
    }

    if (hardViolations.length > 0) {
      await session.transition('QUARANTINE_LOCKED', hardViolations.join('; '), contract?.trace_id ?? request.traceId);
    } else if (softViolations.length > 0 && session.currentState === 'ACTIVE') {
      await session.transition('ELEVATED', softViolations.join('; '), contract?.trace_id ?? request.traceId);
    }
    await session.recordTrace(contract?.trace_id ?? request.traceId, 'pre_action_inspection', hardViolations.length > 0 ? 'Hard pre-action violation detected.' : 'Pre-action inspection completed.', {
      tool: request.toolName,
      action_type: request.actionType,
      hard_violations: String(hardViolations.length),
      soft_violations: String(softViolations.length)
    });
    return {
      allowed: hardViolations.length === 0 && session.snapshot().tool_access === 'enabled' && !(request.sensitive && session.currentState === 'ELEVATED'),
      hardViolations,
      softViolations,
      reason: hardViolations.concat(softViolations).join('; ') || 'Pre-action contract passed inspection.'
    };
  }
}

export function classifyToolAction(toolName: string): ToolActionType {
  if (/submit|append|write|persist/i.test(toolName)) return 'submit';
  if (/retrieve|search|get|history|metadata/i.test(toolName)) return 'retrieve';
  return 'unknown';
}
