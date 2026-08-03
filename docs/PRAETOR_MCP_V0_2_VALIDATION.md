# PRAETOR-MCP v0.2 Validation

## Scope

v0.2 hardens the local, synthetic, advisory-only governance boundary. The implementation remains offline-first, deterministic, review-only, and independent of LLM calls.

## Implemented Controls

- Strict Zod validation for complete advisory packets at the MCP write boundary.
- Structured `schema_rejected` responses for malformed packets.
- Authoritative recomputation of guardrails, verdict, contradiction status, circular-evidence status, and evidence independence.
- Dependency analysis for repeated source IDs, derived evidence, and upstream assumptions.
- Confidence caps for weak provenance, single-source evidence, contradictions, mission drift, and dependency risk.
- Evaluator-manipulation detection and explicit retry-pressure recording.
- Affected-field and recommended-action explanations for every guardrail result.
- Deterministic safe-language suggestions that preserve the original submitted text.

## Validation Results

Commands:

```text
npm run check
npm test
```

Results:

- TypeScript check passed.
- 5 test files passed.
- 35 tests passed.
- Real MCP child-process stdio smoke test passed and exercised all ten tools.
- v0.2 regression coverage passed for schema rejection, dependency risk, evaluator manipulation, and retry pressure.

## Limitations

The scorer evaluates structural integrity and evidence traceability, not predictive truth or equipment safety. All records remain synthetic. No operational system, FAA system, work-order path, authorization path, or learned confidence calibration is included.