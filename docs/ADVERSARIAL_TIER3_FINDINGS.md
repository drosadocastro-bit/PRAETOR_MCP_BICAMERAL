# Tier 3 Adversarial Findings

Date: 2026-07-28

Tier 3 tests task-like lifecycle boundaries, late results, quarantine races, and in-memory session replacement. This tier is intentionally evidence-generating: it identifies unsupported lifecycle guarantees without implementing task semantics that PRAETOR does not currently define.

Run the focused battery with:

```sh
npm test -- --run test/adversarial-tier3.test.ts
```

## Findings

| Case | Result | Finding |
| --- | --- | --- |
| In-flight action resolves after quarantine | LIMITATION CONFIRMED | An action admitted while the session was active can return its result after Protocol 66 quarantines the session. There is no cancellation token or late-result output gate for tool return values. |
| New in-memory session uses the same ID | LIMITATION CONFIRMED | A replacement `RuntimeSession` with the same session ID starts active and has no prior events. Session identity is not durable state or resumable task state. |
| New work after quarantine | CONTAINED | Requests that arrive after quarantine are blocked and their callbacks do not execute. |

## Interpretation

Tier 3 exposes two lifecycle gaps and confirms one containment property. The current runtime is safe only for the boundary it actually implements: pre-action inspection gates new work, while already-started callbacks remain the responsibility of the host and tool implementation.

The late-result finding matters because a tool may finish after the session has entered `QUARANTINE_LOCKED`. The current `AgentKRuntime.executeTool` returns that callback result directly; it does not re-check session state or pass the result through an output gate. This is a known limitation, not evidence that a late result is authorized for advisory emission.

The replacement-session finding matters for disconnect and resume scenarios. A new process or host can construct the same session ID without recovering state, Protocol 66 events, trace history, or pending work. No durable task handle, lease, cancellation state, or recovery checkpoint exists yet.

## Required Future Contract

Before claiming task-style or disconnect/resume compatibility, the runtime needs an explicit contract for:

- durable task and session identifiers;
- allowed task states and terminal transitions;
- cancellation and quarantine behavior for in-flight work;
- late-result disposition after cancellation or quarantine;
- disconnect, reconnect, and ownership rules;
- durable trace and state persistence;
- concurrency and duplicate-delivery semantics.

Those changes are outside this Tier 3 test-only pass. The MCP 2026-07-28 compatibility note remains future work, and the direct low-level gateway limitation remains documented in [docs/ADVERSARIAL_TIER1_FINDINGS.md](ADVERSARIAL_TIER1_FINDINGS.md).
