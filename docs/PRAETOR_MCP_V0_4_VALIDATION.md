# PRAETOR-MCP v0.4 Validation

## Scope

Version 0.4 introduces a non-monolithic, adapter-ready read architecture while preserving the local synthetic default. The change does not add network access, credentials, private data, operational writes, or autonomous action.

## Changes

- Added the retrieval-only `DatasetAdapter` contract.
- Added `SyntheticDatasetAdapter` as the default fixture-backed implementation.
- Added an adapter registry with explicit synthetic selection and fail-closed handling of unknown values.
- Routed MCP read tools through the adapter boundary.
- Kept legacy synchronous helper exports for compatibility.
- Added adapter boundary tests for authority separation and governance independence.
- Documented the architecture in `docs/PRAETOR_MCP_NON_MONOLITHIC_ARCHITECTURE.md`.

## Validation Commands

```text
npm run check
npm test -- --run
npm run test:adversarial:report
git diff --check
```

Expected checks:

- TypeScript strict check passes.
- The complete Vitest suite passes, including the MCP stdio smoke test.
- The adversarial report remains 25/25.
- Protocol 66 tests remain passing.
- Adapter boundary tests pass.
- No whitespace errors are reported.

## Preserved Guarantees

Schema validation remains strict and requires human review. Governance recomputes verdicts and guardrails instead of trusting caller or adapter claims. Protocol 66 remains deterministic and adapter-independent. Accepted packets are persisted only through the review-only append path.

## Limitations

The only implemented adapter is synthetic and local. The interface does not validate an external source by itself. Any future adapter would require its own provenance, determinism, error, and adversarial tests before use.

## Publication

The final commit identifier is intentionally recorded by the release process after validation. This document describes the implementation state before publication and does not assert a commit hash.