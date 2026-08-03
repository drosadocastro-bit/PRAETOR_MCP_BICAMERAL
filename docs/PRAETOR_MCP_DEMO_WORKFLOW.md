# PRAETOR-MCP Frozen Demo Workflow

## Freeze Decision

The hackathon demonstration is now frozen around one reproducible local synthetic workflow. Future changes should improve wording, screenshots, or presentation polish without changing the tool surface, fixture selection, governance boundary, or safety claims unless the workflow is intentionally reopened and revalidated.

The purpose is to show the project thesis:

> PRAETOR-MCP is not an AI that decides what happened. It helps organize evidence, surface uncertainty, detect unsafe advisory structure, and preserve human review. It prevents AI-generated advisory output from outrunning the evidence.

## Audience Story

A radar technician wants to explore how an AI assistant could organize a possible recurring maintenance pattern without pretending to establish root cause, equipment safety, or authorized action.

The agent drafts. The MCP server retrieves and validates. Deterministic governance checks the structure. A human remains responsible for interpretation and action.

## Exact Demo Sequence

### 1. Establish the boundary

State that the server is:

- local and offline-first;
- synthetic and clearly fictional;
- advisory-only;
- human-reviewed; and
- unable to create work orders, authorize maintenance, determine equipment safety, or connect to live systems.

### 2. Retrieve a normal evidence set

Use the fixed synthetic fixture:

- equipment: `PRA-401`;
- anomaly: `VIB-14`;
- component: pump assembly / related synthetic record context.

Call the read workflow:

1. `search_maintenance_records` with `equipment_id: PRA-401` and a vibration query;
2. `get_equipment_history` for `PRA-401`;
3. `retrieve_supporting_evidence` for `PRA-401` and `VIB-14`;
4. `get_source_metadata` for the returned source IDs; and
5. `get_recurring_patterns` for `PRA-401`.

Show source IDs, timestamps, provenance metadata, uncertainty notes, independence groups, and the difference between a recurring pattern and a confirmed cause.

### 3. Submit an advisory packet

Submit a schema-valid packet that says the evidence suggests a recurring synthetic pattern and explicitly requires human review. Show that governance recomputes the integrity result rather than trusting caller-supplied `integrity_verdict` or `guardrail_results`.

The expected teaching point is that the packet is an advisory structure, not an operational decision.

### 4. Demonstrate unsafe advisory structure

Submit a second packet containing one controlled failure, such as:

- mission-drift language such as `confirmed failure` or `maintenance action required`;
- missing or poisoned provenance;
- circular or falsely independent evidence; or
- unsupported synthesis presented as fact.

Show the deterministic response, affected fields, uncertainty or confidence cap, reviewer action, and stable rejection code. Do not soften the failure by manually editing the result during the demo.

### 5. Demonstrate Protocol 66 containment

Use a controlled hard-trigger or bounded soft-trigger sequence, such as an explicit guardrail override attempt or repeated denied retries. Show the transition to `PROTOCOL_66` and explain that this is a containment classification, not an autonomous operational response.

Do not demonstrate log modification, scoring-artifact access, or any real-world action. Use the existing synthetic test fixture or a prepared transcript.

### 6. Close with human authority

End by stating that recovery requires out-of-band human authorization and review. The server does not infer authorization from a new caller claim and does not execute maintenance action.

## Pre-Demo Validation

Run from the repository root:

```text
npm run check
npm test -- --run
npm run benchmark
npm run test:adversarial:report
npm audit
```

Confirm:

- full tests pass;
- Protocol 66 remains 27/27;
- MCP stdio smoke passes;
- adversarial battery remains 25/25;
- benchmark output identifies the current Node/platform runtime; and
- no live or private data is present in the demo.

## Presentation Materials

Use these documents as the source of truth:

- [README.md](../README.md) for the project thesis and boundaries;
- [PRAETOR_MCP_PITCH_DRAFT.md](PRAETOR_MCP_PITCH_DRAFT.md) for the narrative and technical approach;
- [PRAETOR_MCP_EVALUATION.md](PRAETOR_MCP_EVALUATION.md) for evaluation methodology and security evidence;
- [PRAETOR_MCP_BENCHMARK_RESULTS.md](PRAETOR_MCP_BENCHMARK_RESULTS.md) for controlled performance measurements; and
- [PRAETOR_MCP_AI_TECHNICAL_DEBT.md](../PRAETOR_MCP_AI_TECHNICAL_DEBT.md) for open risks and explicit NO-GO boundaries.

## Freeze Rules

- No new external adapter or live-data integration in the frozen demo.
- No autonomous write, recovery, authorization, or safety-status feature.
- No change to the fixed demo equipment, anomaly, or adversarial sequence without rerunning the full validation suite.
- No claim that synthetic benchmark results represent production service levels.
- No claim that governance proves predictive truth.
- Presentation improvements are welcome; behavioral changes require reopening the freeze, updating evaluation evidence, and creating a new validation commit.
