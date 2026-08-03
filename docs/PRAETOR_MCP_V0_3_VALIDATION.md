# PRAETOR-MCP v0.3 Validation

## Scope

v0.3 expands the permanent adversarial validation battery for the local synthetic predictive-maintenance advisory prototype. It does not add production integrations, real agency data, operational writes, autonomous behavior, or LLM-based governance.

## NIC Patterns Transferred

- Unsupported synthesis becomes an unsupported advisory finding.
- Missing citations become missing provenance or source IDs.
- Weak grounding becomes confidence-capped, human-review-required evidence.
- Extractive fallback becomes a flagged advisory state rather than invented synthesis.
- Hallucinated answers become untrusted or unreviewable packets.
- Prompt pressure becomes evaluator-manipulation and objective-pressure testing.

## Adversarial Cases Added

The append-only registry adds `ADV-001` through `ADV-018` for missing evidence, missing provenance, nonexistent sources, unsupported synthesis, overstated weak evidence, mission drift, repeated-source consensus, upstream-source reuse, caller-field manipulation, evaluator manipulation, retry pressure, malformed confidence, extra-field override attempts, human-review override attempts, contradictions, and poisoned provenance.

The executable runner contains 19 assertions: one for each registry case plus an explicit check that a caller-supplied safe verdict cannot override an unsafe computed result.

## PRAETOR-Specific Gaps Covered

- Strict finalized packet schemas reject unknown override fields and `human_review_required: false`.
- Declared source IDs must match evidence and the synthetic source registry.
- Finding terms must have deterministic support in cited excerpts.
- Repeated excerpts, source reuse, derived evidence, and upstream assumptions affect dependency risk.
- Retry pressure lowers the confidence cap and forces review.
- Provenance metadata cannot act as an evaluator instruction channel.
- Failed guardrails expose affected fields and recommended reviewer actions.

## Validation Results

Commands:

```text
npm run check
npm test
```

Release results at implementation checkpoint `32e2d1c`:

- TypeScript check passes.
- The complete Vitest suite passes: 6 test files, 54 tests.
- The real MCP child-process stdio smoke test passes and exercises all ten tools.
- The permanent adversarial battery passes.
- The worktree is clean before publication.

Commit hash: `32e2d1c` (`Expand PRAETOR-MCP adversarial battery`).

## Failures Intentionally Blocked

The governance layer intentionally blocks or rejects packets with no evidence, invalid provenance, nonexistent source IDs, unsupported findings, mission-drift language, evaluator-directed instructions, poisoned provenance, schema override fields, and attempts to bypass the human-review boundary. Contradictory, weak, circular, or retry-pressured packets remain review-required and confidence-capped.

## Known Limitations

The grounding check is deterministic lexical support, not semantic entailment. Source existence is limited to the fixed synthetic registry. The scorer evaluates structural integrity and reconstructability, not predictive truth, equipment safety, or maintenance correctness. No operational system, FAA system, work-order path, authorization path, or learned confidence calibration is included.

## Next Recommended Work

Add a dedicated in-process MCP submission harness for negative write-path tests, expand synthetic source-lineage fixtures, and add deterministic semantic-support fixtures without introducing an LLM dependency into governance.