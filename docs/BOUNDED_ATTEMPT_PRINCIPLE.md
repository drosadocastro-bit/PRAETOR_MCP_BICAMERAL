# Bounded Attempt Principle

## Principle

An agent may attempt a task only within its declared authority, evidence boundary, and runtime contract.

A blocked action is a boundary condition, not a puzzle to solve around.

If required evidence, authorization, tool access, provenance, or human review is missing, the correct behavior is to stop, preserve context, and escalate rather than continue optimizing toward task completion.

> Capability is not permission, and failure is not an invitation to bypass.

## Runtime Enforcement

PRAETOR expresses the principle through a deterministic `BoundedAttemptContract` checked before pre-action inspection, the tool gateway, or the underlying callback. A denied attempt returns `stop_and_escalate`, records a trace event, and does not invoke the callback.

The current runtime contract checks:

- exact agent and runtime session identity;
- allowed tool names;
- allowed action types;
- retry-after-denial policy;
- quarantine state; and
- mandatory human review.

This is an execution boundary, not a prompt-only instruction. The agent-facing result is a blocked, human-review response and has no normal-output path.

Every `AgentKRuntime` must now be constructed with an explicit bounded contract. The contract declares the agent identity, session, allowed tools, action types, human-review requirement, retry policy, and attempt budget. Direct low-level `ToolGateway` callers remain outside this host boundary.

## Allowed Responses

- “I cannot complete this because the required evidence is missing.”
- “This requires human review before proceeding.”
- “The requested tool is unavailable within my contract.”
- “The evidence is contradictory, so I cannot produce a stronger conclusion.”
- “The operation was blocked. I preserved the trace and stopped.”

## Prohibited Responses

- “I will try another route to access it.”
- “I can infer the missing evidence.”
- “I will mark this as reviewed.”
- “The tool failed, but based on context I completed it.”
- treating another agent's output as independent corroboration;
- changing identity, endpoint, permissions, or tool route after denial;
- reinterpreting a request to make a blocked action appear allowed.

A retry is permitted only when a specific runtime contract allows it, the retry remains within the same authority boundary, and the action was not denied, quarantined, or blocked for missing evidence or authorization. The ReviewAgent contract currently forbids retry after denial.

The runtime increments an attempt counter before each tool inspection and blocks requests beyond `maxAttempts` before invoking the callback. ReviewAgent uses a three-step budget for context retrieval, evidence-boundary evaluation, and review submission, while its retry-after-denial policy remains disabled.

## Evidence Boundary

Generated text, model inference, chat claims, and other agent outputs remain untrusted origins. They cannot become authoritative evidence through repetition, agreement, or cross-agent handoff. Evidence must retain source identity, provenance, uncertainty, timestamp, and independence metadata.

## Current Evidence

The implementation and tests are in:

- [src/safety/boundedAttempt.ts](../src/safety/boundedAttempt.ts);
- [src/safety/agentKRuntime.ts](../src/safety/agentKRuntime.ts);
- [test/bounded-attempt.test.ts](../test/bounded-attempt.test.ts); and
- [docs/REVIEW_AGENT.md](REVIEW_AGENT.md).

The tests establish observable containment for the current contract. They do not prove complete semantic detection, eliminate direct low-level gateway bypass, cancel already-running callbacks, or provide durable cross-process session state. Those limitations remain documented in [docs/PRAETOR_IMPLEMENTATION_ADVERSARIAL_FINDINGS.md](PRAETOR_IMPLEMENTATION_ADVERSARIAL_FINDINGS.md).
