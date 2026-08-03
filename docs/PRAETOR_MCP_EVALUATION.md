# PRAETOR-MCP Evaluation Documentation

## Purpose

PRAETOR-MCP is not an AI that decides what happened. It is a local MCP prototype that helps organize evidence, surface uncertainty, detect unsafe advisory structure, and preserve human review. The goal is not to replace expert judgment. The goal is to prevent AI-generated advisory output from outrunning the evidence.

This evaluation describes the current synthetic prototype. It is evidence for local learning and hackathon demonstration, not evidence of production readiness, predictive accuracy, equipment safety, or operational authorization.

## Evaluation Scope

The evaluated system is:

- a TypeScript ESM MCP stdio server running on Node.js 20 or newer;
- backed only by fixed, fictional, local synthetic maintenance data;
- exposed through structured dataset-access, service-read, and review-only submission tools;
- governed by strict schemas and deterministic integrity checks;
- bounded by explicit human-review and advisory-only constraints; and
- tested without network access, live agency systems, private data, or autonomous action.

The evaluation does not claim:

- that the synthetic patterns predict real equipment failures;
- that governance checks establish semantic truth;
- that confidence values are calibrated probabilities;
- that the server is suitable for live data or operational decisions; or
- that a future external adapter is safe merely because the interface exists.

## Testing Methodology

### Test layers

1. **Static validation**
   - `npm run check`
   - TypeScript compilation with no emitted files.

2. **Unit and integration tests**
   - `npm test -- --run`
   - Governance, schema, storage, adapter boundary, Protocol 66, tool, scenario, adversarial, and real MCP transport tests.

3. **Protocol 66 fault tests**
   - malformed timestamps;
   - invalid trigger shapes;
   - invalid interaction indexes;
   - negative, non-integer, non-finite, and excessive policy values;
   - hard-trigger and bounded soft-trigger behavior.

4. **Untrusted adapter tests**
   - malformed records;
   - oversized result arrays;
   - invalid source metadata;
   - fake verdict and guardrail fields;
   - thrown adapter exceptions;
   - bounded equipment history;
   - explicit unavailable external and unknown adapter modes.

5. **Storage integrity tests**
   - missing-file behavior;
   - malformed JSON;
   - truncated or partial-write lines;
   - schema-invalid decoded records;
   - read failures; and
   - append failures.

6. **Real stdio smoke test**
   - launches the actual server;
   - lists the registered tools;
   - calls every exposed tool;
   - verifies review-only governance behavior over the MCP transport; and
   - checks the stable application error envelope.

7. **Adversarial battery**
   - fixed append-only cases for missing evidence, provenance failures, unsupported synthesis, weak grounding, mission drift, false consensus, evaluator manipulation, schema abuse, contradiction handling, poisoned provenance, and objective pressure.

### Reproducibility

Run from the repository root:

```text
npm install
npm run check
npm test -- --run
npx vitest run test/protocol66.test.ts --reporter=dot
npx vitest run test/mcp-smoke.test.ts --reporter=dot
npm run test:adversarial:report
npm audit
git diff --check
```

The generated adversarial artifacts are:

- `reports/adversarial_battery/LATEST.md`
- `reports/adversarial_battery/latest.json`

## Current Results

Validation run: 2026-07-27, Windows, Node.js 20+ project configuration.

| Measure | Result | Meaning |
| --- | ---: | --- |
| TypeScript check | PASS | The configured source and test types compile without emitted output. |
| Full test files | 10 | Unit, integration, boundary, storage, adversarial, and transport coverage. |
| Full tests | 112/112 passed | No failing automated checks in the evaluated synthetic fixture set. |
| Protocol 66 tests | 27/27 passed | Runtime input and policy validation plus containment behavior. |
| MCP stdio smoke | 1/1 passed | Actual server transport listed and exercised all tools. |
| Adversarial assertions | 25/25 passed | Fixed unsafe-structure battery passed. |
| Dependency audit | 0 vulnerabilities | No known npm advisories reported at evaluation time. |
| Whitespace check | PASS | No patch whitespace errors; generated report may produce a Windows line-ending warning. |

A passing test is evidence that the asserted behavior holds for the selected fixtures. It is not evidence that the system understands arbitrary natural language, predicts real failures, or generalizes to an operational environment.

## Performance Evidence

The current evaluation establishes correctness and bounded behavior, but it does not yet claim a production performance target. The existing MCP smoke test includes server startup and tool exercise but is not a controlled latency benchmark.

The current performance-relevant controls are structural:

- packet text, collection, identifier, and nested-field limits are enforced before governance;
- adapter result collections are bounded before serialization;
- equipment history is capped at 100 records;
- Protocol 66 policy windows and thresholds have explicit maxima;
- storage is append-only local NDJSON for the synthetic prototype; and
- no network or external service latency is included.

Before any broader deployment discussion, a controlled benchmark should record at least:

- cold server startup time;
- per-tool response latency by tool and input size;
- packet validation and governance latency;
- storage append latency;
- memory use under maximum accepted packet and adapter-result sizes;
- behavior across repeated runs; and
- failure behavior at each configured boundary.

Those measurements should be collected on the target deployment environment and reported with sample counts, input fixtures, percentiles, and hardware/runtime versions. No unmeasured performance claim is made here.

## Security and Safety Evaluation

### Verified controls

- Strict schemas reject unknown fields and malformed packet shapes.
- Resource bounds reject oversized accepted packet fields and adapter results.
- Governance recomputes verdicts and guardrails instead of trusting caller claims.
- Adapter outputs are validated before serialization or governance use.
- Storage corruption and read/append failures produce typed errors rather than false empty history.
- MCP application errors use stable codes and caller-safe details.
- Unexpected diagnostic details are written to stderr rather than caller responses.
- External and unknown adapter modes fail explicitly as unavailable.
- Protocol 66 input and policy values are validated before classification.
- Human review remains structurally required for accepted packets.
- No tool creates a work order, authorizes maintenance, determines equipment safety, or connects to live systems.

### Residual risks

- Provenance ownership is coupled to the synthetic source registry, so external mode remains NO-GO.
- Exported storage path functions do not yet enforce a project-root containment policy.
- Legacy synchronous helper exports can bypass the active adapter boundary.
- Lexical guardrails are not semantic truth validation and may have false negatives or false positives.
- Thresholds and confidence caps are not calibrated probabilities.
- Stateful Protocol 66 event ingestion is deferred by design and must satisfy its design note before implementation.
- Authentication, authorization, live integration, and operational deployment controls do not exist.

## Lessons Learned

1. The most important safety property is the boundary between evidence, advisory structure, and authority. A fluent answer is not proof.
2. Validation must happen before serialization and before governance consumes adapter output.
3. Missing storage is different from corrupted or inaccessible storage. Treating both as empty history damages auditability.
4. Explicit unavailable behavior is safer than silently selecting a fallback when a requested integration does not exist.
5. Deterministic checks are useful for containment and structural integrity, but they should not be presented as semantic understanding.
6. A small pure classifier is easier to test and audit than a stateful workflow; stateful ingestion deserves its own identity, retention, deduplication, and concurrency design.
7. A domain expert who understands evidence quality and human authority can contribute essential requirements even without being a software engineer.

## Recommendations

### For the hackathon demonstration

- Show one normal evidence-retrieval flow and one adversarial governance-rejection flow.
- Display source IDs, provenance, uncertainty, independence groups, and the computed review boundary.
- Show that caller-supplied `safe` or guardrail claims are not authoritative.
- Show a Protocol 66 boundary condition without implying automatic operational action.
- Report the exact test counts and disclose the synthetic-only limitation.

### Before adding public or agency data

- Obtain explicit authorization for the dataset and environment.
- Define authoritative provenance ownership outside the adapter's claimed verdicts.
- Close storage path containment and legacy helper bypass risks.
- Add access control, audit identity, retention, and deployment threat modeling.
- Benchmark the target environment and establish service-level expectations.
- Calibrate confidence and governance thresholds with representative reviewed data.
- Conduct human and security review before enabling any non-synthetic adapter.

## Final Position

PRAETOR-MCP is a credible learning and demonstration prototype for governed MCP evidence access. Its strongest result is not a prediction claim. Its strongest result is demonstrating how an MCP server can help an AI organize evidence while refusing to let advisory language outrun provenance, uncertainty, governance, or human authority.
