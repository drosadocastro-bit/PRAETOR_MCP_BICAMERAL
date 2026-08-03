# PRAETOR-MCP v0.5 Validation

## Scope

v0.5 remediates the integrity-boundary findings from the v0.4 audit while remaining local, synthetic-only, review-only, and deterministic. It does not implement external adapters, live systems, operational writes, autonomous recovery, or production enforcement.

## Remediations

- Added stable MCP application error envelopes for schema, governance, storage, adapter, Protocol 66 input, unavailable-adapter, and internal failures.
- Added bounded runtime validation for every adapter result family before serialization or governance use.
- Added typed storage corruption/read errors and runtime validation for decoded advisory records.
- Changed `external` and unknown adapter configuration to explicit unavailable errors.
- Added malicious-adapter, storage corruption, partial-write, invalid-record, read-failure, and stdio error-shape tests.
- Added the future-only Protocol 66 event-ingestion design note without adding stateful tracking.

## Before/After Evidence

Before v0.5, adapter values could be serialized without runtime validation, storage corruption could appear as empty history, exceptions were not normalized at the application boundary, and unknown adapter values fell back to synthetic mode.

After v0.5, malformed or oversized adapter output returns `adapter_error`, corrupted storage raises `storage_error`, schema-valid governance failures return `governance_rejected`, and unavailable adapter modes return `unavailable_adapter`. Caller-facing responses do not include thrown stack traces or filesystem details.

## Validation Commands

```text
npm run check
npm test -- --run
npm run test:adversarial:report
npm audit
git diff --check
```

Expected final evidence:

- strict TypeScript check passes;
- complete Vitest suite passes, including MCP stdio smoke;
- adversarial report remains 25/25;
- npm audit reports no known vulnerabilities;
- whitespace check passes.

## Remaining HOLD Items

External adapter use remains NO-GO until provenance ownership, adapter integration, and independent security review are designed. Protocol 66 remains a pure classifier; stateful ingestion requires the design in `docs/PRAETOR_MCP_PROTOCOL66_INGESTION_DESIGN.md`, real calibration data, and human review before any enforcement consideration. The prototype does not make production claims.