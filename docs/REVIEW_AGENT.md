# Bounded Review Agent

The first PRAETOR agent is a deterministic host-side review-packet builder. It is not an autonomous maintenance agent and does not make operational decisions.

Implementation: [src/agent/reviewAgent.ts](../src/agent/reviewAgent.ts)

## Flow

```text
retrieve_anomaly_context
  -> evaluate_evidence_boundary
  -> build bounded advisory packet
  -> submit_review_advisory_packet
  -> human review
```

Every MCP call is routed through `AgentKRuntime`, which applies the deliberation contract, Protocol 66 state, pre-action inspection, and tool gateway. `ReviewAgent` receives only a `RuntimeToolInvoker`; it does not receive a raw MCP client, gateway, storage handle, or tool callback.

The agent is deliberately restricted to:

- synthetic anomaly-context retrieval;
- evidence-boundary validation;
- review-only packet construction;
- governance-backed packet submission;
- human review as the final authority.

It does not call operational tools, authorize maintenance, create work orders, declare equipment safe or unsafe, or treat its generated text as primary evidence. A refusal from the evidence boundary prevents submission.

## Host Boundary

The host should connect the raw client to `RuntimeBoundToolInvoker`, which owns the `AgentKRuntime` and forwards approved calls to the client. It then constructs `ReviewAgent({ runtime: runtimeBoundInvoker })` with a unique session ID. The agent should not be given direct access to the raw MCP client, `ToolGateway`, adapter internals, storage, or arbitrary MCP tool names.

## Runtime Boundary

`ReviewAgent` does not call MCP tools directly. It requests typed runtime invocations, and all MCP calls pass through `AgentKRuntime` before reaching the stdio client. This preserves pre-action inspection, Protocol 66 state transitions, tool-gateway blocking, evidence-boundary refusal, and the human-review boundary.

Boundary regression coverage is in [test/review-agent-runtime-boundary.test.ts](../test/review-agent-runtime-boundary.test.ts). The current findings are:

| Case | Result |
| --- | --- |
| Retrieval, evidence-boundary evaluation, and submission use the runtime invoker | CONTAINED |
| Raw MCP client does not satisfy the `ReviewAgent` constructor type | CONTAINED |
| Quarantined retrieval returns a blocked, human-review result | CONTAINED |
| Blocked retrieval cannot produce a normal response or submit a packet | CONTAINED |

The lower-level `AgentKRuntime.executeTool` still accepts an action callback by design. That callback boundary is host-owned and is not exposed through `ReviewAgent`; direct low-level gateway access remains the separate limitation documented in [docs/ADVERSARIAL_TIER1_FINDINGS.md](ADVERSARIAL_TIER1_FINDINGS.md).

The current implementation is intentionally a workflow agent rather than a model loop. A future model may propose the request or draft wording, but the typed request, evidence origin, governance result, and human-review boundary must remain authoritative.

The agent follows the [Bounded Attempt Principle](BOUNDED_ATTEMPT_PRINCIPLE.md): capability is not permission, and a blocked action is a stop-and-escalate condition rather than an invitation to find another route. Its runtime contract allows only the three declared workflow tools, forbids retry after denial, and records blocked attempts before returning a human-review result.

## Current Scope

This first agent does not implement durable task handles, disconnect/resume, cancellation of in-flight callbacks, multi-agent messaging, shared memory, or swarm consensus. Those are separate experiments and remain outside the current support claim.
