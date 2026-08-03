# Tier 2 Adversarial Findings

Date: 2026-07-28

Tier 2 tests deterministic properties, bounded state transitions, retry/event handling, trace validation, and repeated concurrent host requests. The battery remains local, synthetic, advisory-only, and human-reviewed.

Run the focused battery with:

```sh
npm test -- --run test/adversarial-tier2.test.ts
```

## Findings

| Case | Result | Finding |
| --- | --- | --- |
| Soft-trigger input permutation | CONTAINED | Protocol 66 produces the same decision when the same valid events arrive in different input orders. |
| Invalid interaction indices | CONTAINED | Negative, fractional, and unsafe integer indices are rejected before classification. |
| Late normal inspection after quarantine | CONTAINED | A later non-triggering inspection cannot downgrade a quarantined session. |
| Repeated Protocol 66 event | CONTAINED | Identical events are deduplicated while a distinct interaction remains retained. |
| Concurrent trace recording | BOUNDED | All 20 valid trace events are retained and schema-valid under concurrent recording. |
| Malformed trace event | CONTAINED | Schema failure raises `StorageError` and does not append the invalid event. |
| Repeated concurrent host requests | BOUNDED | Twelve simultaneous valid retrieval requests complete without loss or duplicate callback execution. |

## Interpretation

All nine Tier 2 assertions pass. The tests provide evidence for deterministic classification and bounded in-memory behavior, not for durable concurrency guarantees. `RuntimeSession` remains an in-memory object with no cross-process lock, durable transaction, or recovery protocol.

The concurrency case exercises JavaScript promise interleaving within one process. It does not establish behavior across worker processes, multiple hosts sharing a session, network disconnects, or late results arriving after a task has been cancelled. Those cases remain Tier 3 work and require an explicit task-state contract.

The test suite also does not claim that all concurrent actions are safe merely because they complete. Tool authorization still depends on the host routing requests through `AgentKRuntime`; direct low-level gateway calls remain the Tier 1 limitation documented in [docs/ADVERSARIAL_TIER1_FINDINGS.md](ADVERSARIAL_TIER1_FINDINGS.md).

## Scope Boundary

Tier 2 deliberately does not add task handles, durable state, cancellation, retry persistence, or cross-process coordination. Implementing those solely to satisfy adversarial tests would create unsupported MCP compatibility claims. They belong in the future MCP 2026-07-28 compatibility review and Tier 3 design work.
