import { describe, expect, it } from 'vitest';

import { inspectBoundedAttempt, type BoundedAttemptContract } from '../src/safety/boundedAttempt.js';
import { AgentKRuntime } from '../src/safety/agentKRuntime.js';
import { RuntimeSession } from '../src/runtime/runtimeState.js';
import type { ToolRequest } from '../src/runtime/toolGateway.js';

const contract: BoundedAttemptContract = {
  agentId: 'bounded-test-agent',
  sessionId: 'bounded-session',
  allowedTools: ['retrieve_supporting_evidence'],
  allowedActionTypes: ['retrieve'],
  requiresHumanReview: true,
  retryPolicy: { maxAttempts: 1, retryAfterDenial: false }
};

const request: ToolRequest = {
  traceId: 'bounded-trace',
  toolName: 'retrieve_supporting_evidence',
  actionType: 'retrieve',
  sensitive: false,
  argumentSummary: 'retrieve synthetic evidence'
};

describe('bounded attempt principle', () => {
  it('allows an attempt inside the declared contract', async () => {
    const decision = await inspectBoundedAttempt(new RuntimeSession('bounded-session'), contract, request, 0);

    expect(decision).toEqual({ decision: 'allow', reason: 'Bounded attempt is within the agent contract.' });
  });

  it('stops and escalates when the tool is outside the contract', async () => {
    const session = new RuntimeSession('bounded-session');
    const decision = await inspectBoundedAttempt(session, contract, { ...request, toolName: 'submit_review_advisory_packet' }, 0);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'tool_not_allowed', humanReviewRequired: true });
    expect(session.trace().at(-1)).toMatchObject({ event_type: 'bounded_attempt_stopped' });
  });

  it('stops and escalates when the action type is outside the contract', async () => {
    const decision = await inspectBoundedAttempt(new RuntimeSession('bounded-session'), contract, { ...request, actionType: 'write' }, 0);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'action_type_not_allowed' });
  });

  it('stops and escalates instead of retrying after denial', async () => {
    const decision = await inspectBoundedAttempt(new RuntimeSession('bounded-session'), contract, request, 1);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'retry_after_denial' });
  });

  it('stops and escalates when the attempt limit is exceeded', async () => {
    const decision = await inspectBoundedAttempt(new RuntimeSession('bounded-session'), contract, request, 0, 2);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'attempt_limit_exceeded', humanReviewRequired: true });
  });

  it('stops and escalates when the contract session differs from the runtime session', async () => {
    const decision = await inspectBoundedAttempt(new RuntimeSession('other-session'), contract, request, 0);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'session_identity_mismatch' });
  });

  it('does not execute the callback after a bounded attempt is blocked', async () => {
    const runtime = new AgentKRuntime(new RuntimeSession('bounded-session'), contract);
    let callbackCalls = 0;

    const result = await runtime.executeTool(undefined, { ...request, toolName: 'submit_review_advisory_packet' }, async () => {
      callbackCalls += 1;
      return 'must not execute';
    });

    expect(callbackCalls).toBe(0);
    expect(result).toMatchObject({
      status: 'blocked',
      code: 'tool_not_allowed',
      human_review_required: true,
      output_mode: 'blocked'
    });
  });

  it('enforces maxAttempts across runtime calls before invoking the callback', async () => {
    const session = new RuntimeSession('bounded-session');
    const runtime = new AgentKRuntime(session, { ...contract, retryPolicy: { maxAttempts: 1, retryAfterDenial: false } });
    let callbackCalls = 0;

    await expect(runtime.executeTool(undefined, request, async () => {
      callbackCalls += 1;
      return 'first attempt';
    })).resolves.toBe('first attempt');

    const secondResult = await runtime.executeTool(undefined, request, async () => {
      callbackCalls += 1;
      return 'must not execute';
    });

    expect(callbackCalls).toBe(1);
    expect(secondResult).toMatchObject({ status: 'blocked', code: 'attempt_limit_exceeded', human_review_required: true });
  });

  it('blocks all new work after the session enters quarantine', async () => {
    const session = new RuntimeSession('bounded-session');
    await session.transition('QUARANTINE_LOCKED', 'test quarantine');
    const decision = await inspectBoundedAttempt(session, contract, request, 0);

    expect(decision).toMatchObject({ decision: 'stop_and_escalate', code: 'quarantine_active' });
  });
});
