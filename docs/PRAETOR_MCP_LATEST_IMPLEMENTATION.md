# PRAETOR-MCP Latest Implementation

## Scope

PRAETOR-MCP is a local, offline-first, synthetic predictive-maintenance advisory prototype. It is advisory-only and human-reviewed. It does not authorize maintenance, create operational work orders, determine equipment safety, connect to FAA or other live systems, or use non-public agency data.

All governance decisions in the current implementation are deterministic and do not require an LLM call.

## Project Thesis

PRAETOR-MCP is not an AI that decides what happened. It is a local MCP prototype that helps organize evidence, surface uncertainty, detect unsafe advisory structure, and preserve human review. The goal is not to replace expert judgment. The goal is to prevent AI-generated advisory output from outrunning the evidence.

## Runtime and MCP Surface

- TypeScript ESM project targeting Node.js 20 or newer.
- MCP stdio server using the official `@modelcontextprotocol/server` SDK pattern.
- Synthetic dataset access tools expose maintenance records and source metadata.
- Service read tools expose evidence excerpts, prior cases, and anomaly context.
- Review-only write submission accepts a schema-valid advisory packet and persists only after governance recomputes its results.
- Logs are written to stderr so stdout remains reserved for MCP protocol traffic.

The write path never treats caller-supplied verdicts or guardrail results as authoritative.

## Deterministic Governance

The integrity scorer in `src/integrity.ts` evaluates:

- evidence presence and lexical evidence support;
- provenance completeness, source existence, and poisoned provenance;
- confidence discipline for weak or single-source evidence;
- generated-output re-ingestion;
- speculation promoted into fact;
- temporal precision exceeding source uncertainty;
- contradiction handling;
- false consensus and circular evidence;
- evaluator manipulation and retry pressure;
- mission-boundary language;
- the human-review boundary.

The dependency graph in `src/dependencyGraph.ts` detects repeated source IDs, repeated excerpts, derived evidence, upstream assumptions, and explicit declared paraphrase groups. Paraphrased records in one declared group cannot count as independent corroboration.

The packet schema in `src/schema.ts` is strict. Unknown override fields and attempts to set `human_review_required` to false are rejected. Evidence arrays and major text fields are bounded to prevent unbounded packet input.

## Adversarial Battery

The append-only registry is in `tests/PRAETOR_MCP_ADVERSARIAL_BATTERY.md`, with executable coverage in `test/adversarial-battery.test.ts`.

Current fixed registry coverage includes:

- `ADV-001` through `ADV-018`: evidence, provenance, unsupported synthesis, confidence, mission drift, false consensus, evaluator manipulation, schema abuse, contradictions, retry pressure, and poisoned provenance;
- `ADV-019`: deterministic semantic paraphrase flood using an explicit declared paraphrase group;
- `ADV-020`: generated advisory output re-ingested as primary evidence;
- `ADV-021`: speculative or interpretive evidence hardened into fact;
- `ADV-022`: soft synthetic-to-operational transferability language;
- `ADV-023`: fabricated temporal precision from approximate evidence windows;
- `ADV-026`: bounded packet resource pressure.

`ADV-024` and `ADV-025` remain intentionally held because multilingual and negated-confirmation handling are not yet declared in PRAETOR's natural-language contract.

The current battery has 24 registry cases and one additional assertion that caller-supplied `safe` cannot override an unsafe computed result: 25 assertions total.

Generate the durable reports with:

```text
npm run test:adversarial:report
```

Reports are written to `reports/adversarial_battery/LATEST.md` and `reports/adversarial_battery/latest.json`.

## Protocol 66

Protocol 66 is implemented in `src/protocol66.ts` as a deterministic trigger classifier. It reports one of:

- `NORMAL`: no active trigger;
- `ELEVATED`: active Tier 2 signals exist below threshold;
- `PROTOCOL_66`: a Tier 1 trigger fired or the Tier 2 threshold was reached.

### Tier 1 hard triggers

Any single event fires Protocol 66 immediately:

- `log_modification_attempt`;
- `scoring_artifact_access_attempt`;
- `self_certification_attempt`;
- `explicit_guardrail_override_attempt`.

No accumulation is used for these categories.

### Tier 2 soft triggers

These accumulate only inside a bounded sliding window:

- `repeated_retry`;
- `mission_drift_language`;
- `denial_retry_pattern`.

The default policy is three occurrences within 10 minutes or five interaction indexes. One or two active signals produce `ELEVATED`; three qualifying signals produce `PROTOCOL_66`. Stale events are excluded and lifetime totals are never used. The policy is configurable, but callers must provide bounded explicit windows.

The classifier has no network access, LLM dependency, learned score, persistence side effect, operational action, or human-review bypass. It consumes event data and returns a classification. It is not currently an autonomous server action.

The narrow text helper recognizes direct hard or soft patterns. It deliberately does not classify bounded language such as:

- `This may need human review.`
- `Evidence is uncertain and remains advisory only.`
- `The root cause remains uncertain.`
- `The packet needs more provenance before a reviewer can assess it.`

Calibration coverage is in `test/protocol66.test.ts` and includes honest uncertainty, a single transient retry under time pressure, review requests, stale-window behavior, and direct mission-drift contrast cases.

The full Protocol 66 policy is documented in `docs/PROTOCOL_66.md`.

## Validation

The current validation commands are:

```text
npm run check
npm test -- --run
npm run test:adversarial:report
```

The expected current results are:

- TypeScript check passes;
- 9 Vitest files pass;
- 106 tests pass, including the 27 Protocol 66 tests, adapter/storage fault-injection coverage, and the MCP error-envelope smoke test;
- the MCP stdio smoke test exercises the exposed tools;
- the adversarial report records 25 passing assertions.

The v0.5 integrity-boundary remediation record is [docs/PRAETOR_MCP_V0_5_VALIDATION.md](PRAETOR_MCP_V0_5_VALIDATION.md). It records stable MCP error envelopes, adapter output validation, storage corruption handling, explicit unavailable adapter semantics, malicious adapter tests, and the future Protocol 66 ingestion design boundary.

## Deliberate Limitations

- Synthetic data only.
- Deterministic lexical and structural checks, not semantic truth validation.
- No calibrated predictive probability.
- No production security or authentication model.
- No live system or agency integration.
- No operational write path.
- Protocol 66 is a classification boundary, not an autonomous response mechanism.
