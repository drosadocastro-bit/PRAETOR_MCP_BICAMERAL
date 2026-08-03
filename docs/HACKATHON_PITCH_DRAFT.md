# PRAETOR-MCP Hackathon Pitch Draft

**Status:** Draft skeleton for refinement after the hackathon kickoff and training session this Saturday.

**Prototype boundary:** PRAETOR-MCP is a local, offline-first, synthetic, advisory-only prototype. It does not authorize maintenance, determine equipment safety, create operational work orders, connect to live systems, or replace qualified human judgment.

## 1. Problem Statement

### The translation-layer gap

AI agents can retrieve information and generate fluent conclusions, but complex service and data workflows require more than an answer. They require a structured translation layer between:

- heterogeneous records, metadata, excerpts, prior cases, and uncertainty;
- an agent's requested reasoning and proposed advisory packet; and
- the human decision-maker who remains accountable for interpretation and action.

Without that layer, an agent may collapse incomplete evidence into an apparently confident conclusion, treat generated text as source evidence, mistake repeated or circular records for independent corroboration, or assert an operational outcome that it is not authorized to determine.

The problem is therefore not simply retrieval. The problem is how to produce evidence-grounded, reconstructable, review-gated advisory reasoning before any human decision, while preventing the agent from asserting an unverified conclusion as authority.

### What must be preserved

A credible solution must preserve:

- traceable evidence and provenance;
- explicit uncertainty and contradiction handling;
- deterministic checks that do not depend on an LLM call;
- a hard human-review boundary;
- containment when an interaction attempts to weaken auditability or governance; and
- a clear distinction between an advisory packet and an authorized real-world action.

## 2. Solution Overview

PRAETOR-MCP is an advisory-only governance layer exposed through a local MCP stdio service.

The agent can:

1. query synthetic maintenance records and supporting evidence;
2. assemble a bounded advisory packet with sources, uncertainty, and review language; and
3. submit the packet to a deterministic validation and governance path.

The agent cannot:

- authorize maintenance or corrective action;
- determine whether equipment is safe or unsafe to operate;
- create an operational work order;
- bypass human review; or
- make caller-supplied verdicts authoritative.

The submission path independently recomputes schema-derived status, evidence independence, contradiction and circular-evidence status, guardrail results, integrity verdict, and confidence caps. Caller-supplied verdicts and guardrails are treated as untrusted claims. A packet is persisted only through the review-only write path after governance accepts it.

The core proposition is simple: the agent drafts; the governance layer verifies structure and boundaries; the human decides.

## 3. Technical Approach and Key Decisions

### 3.1 Non-monolithic nine-layer architecture

The current architecture can be presented as nine logical layers:

1. **MCP transport layer** - local stdio service and tool registration.
2. **Tool contract layer** - structured inputs and stable read/write tool surfaces.
3. **Dataset adapter layer** - retrieval-only `DatasetAdapter` boundary.
4. **Synthetic data layer** - fixed fictional records, metadata, excerpts, and prior cases.
5. **Evidence assembly layer** - supporting evidence, anomaly context, histories, and recurring patterns.
6. **Schema validation layer** - strict packet and evidence shape validation, including the human-review literal.
7. **Integrity and governance layer** - deterministic evidence, provenance, confidence, contradiction, mission-boundary, and reconstructability checks.
8. **Containment layer** - Protocol 66 trigger classification for hard and soft adversarial interaction signals.
9. **Review-only persistence layer** - append-only local packet storage after governance acceptance.

This separation keeps retrieval, evidence preparation, governance, containment, and persistence from becoming one authority-bearing function. The architecture is intentionally a prototype boundary, not a claim of production readiness.

### 3.2 Adapter pattern

Synthetic mode is the default proving ground. `SyntheticDatasetAdapter` currently wraps the fixed local fixtures behind a retrieval-only interface. The boundary is swappable later for another read-side implementation without weakening the safety contract.

The dataset server is also designed to support an explicit open-data adapter. In a future deployment, that adapter could retrieve approved public datasets through a documented API, normalize the response into the same evidence contract, and preserve source identifiers, timestamps, provenance, uncertainty, and independence metadata. The API would remain a data source, not a governance authority: it could provide records and evidence, but it could not provide trusted verdicts, authorize maintenance, determine equipment safety, or submit packets.

That future API path is not part of the current demo claim. The current implementation uses only local synthetic fixtures, has no live network dependency, and does not silently fall back between adapters. Any open-data integration would require an explicit adapter selection, bounded request and response validation, source-availability handling, provenance checks, privacy and licensing review, and a new adversarial test pass before presentation as a supported capability.

The pre-adapter threat contract is already exercised offline in [test/open-data-adapter-adversarial.test.ts](../test/open-data-adapter-adversarial.test.ts). It establishes payload, provenance, bounds, provider-error, and authority-field requirements before an HTTP client is introduced. SSRF, redirect, timeout, rate-limit, TLS, and credential-handling tests remain an explicit acceptance gate for that future adapter.

An adapter may provide:

- maintenance record search and lookup;
- source metadata;
- recent anomalies and recurring patterns;
- supporting evidence;
- document excerpts; and
- prior cases.

An adapter may not provide or control:

- verdicts;
- guardrails;
- review state;
- packet submission or persistence;
- confidence authorization; or
- equipment status.

Any future adapter requires its own provenance, error, output-validation, and adversarial review. No external adapter is bundled in this prototype.

### 3.3 Protocol 66 as tiered Zero Trust containment

Protocol 66 is a deterministic containment boundary based on explicit interaction signals:

- **Tier 1 hard triggers** activate immediately for attempts such as log modification, scoring-artifact access, self-certification, or explicit guardrail override.
- **Tier 2 soft triggers** accumulate only within bounded time or interaction windows. The current default is three qualifying signals within 10 minutes or five interaction indexes.
- `NORMAL`, `ELEVATED`, and `PROTOCOL_66` make the containment state explicit.
- Runtime validation rejects malformed timestamps and invalid policy values before they can affect the window calculation.

Protocol 66 does not authorize an operational response. It identifies a governance or interaction boundary condition that requires containment and human review.

### 3.4 Non-bypass rule

No adapter, caller-supplied field, or generated claim can bypass:

- strict schema validation;
- evidence presence and support checks;
- provenance and source-lineage checks;
- contradiction and circular-evidence checks;
- confidence discipline;
- mission-boundary and human-review guardrails; or
- Protocol 66 containment classification.

The write path recomputes authoritative governance output. Retrieval is evidence input, not governance authority.

### 3.5 Deliberate constraints

The implementation remains local, synthetic, deterministic, and review-only. It has no live data dependency, no network requirement, no operational write path, and no autonomous recovery mechanism. Thresholds and confidence caps are policy choices that need real calibration data before production consideration.

## 4. Demonstration of Functionality

The demonstration should show the boundary under both normal and adversarial use.

### Step 1: Normal query

The agent queries a synthetic maintenance record, retrieves equipment history and supporting evidence, and displays the source identifiers, provenance metadata, uncertainty notes, and independence groups.

**Audience takeaway:** the agent can gather and organize evidence without receiving direct authority over a real system.

### Step 2: Attempted false caller-supplied verdict

The agent submits a packet containing a caller-supplied `safe` verdict and favorable guardrail claims that do not establish authority.

**System behavior:** the strict schema accepts only the packet shape; governance ignores the authority of the supplied verdict and independently recomputes guardrails, evidence independence, confidence discipline, and integrity verdict.

**Audience takeaway:** a caller cannot self-certify an advisory packet by writing `safe` into its payload.

### Step 3: Governance rejects or constrains and recomputes

Use a packet with missing provenance, unsupported synthesis, circular evidence, contradictory evidence, or mission-drift language. The governance result should show the computed guardrail failures, affected fields, recommended reviewer action, constrained confidence, and a `doubtful`, `unsafe`, or `untrusted` verdict as appropriate.

**Audience takeaway:** the system exposes the reason for the boundary decision instead of silently rewriting the claim or treating fluent output as proof.

### Step 4: Structural boundary violation attempt

Attempt one of the Protocol 66 hard-trigger behaviors, such as requesting a guardrail override, modifying the audit log, accessing scoring artifacts, or self-certifying the system. A second demonstration option is to create enough bounded soft-trigger events to reach the configured threshold.

**System behavior:** Protocol 66 moves from `NORMAL` or `ELEVATED` to `PROTOCOL_66`; the event is classified deterministically and the interaction is placed on a containment/review path.

### Step 5: Out-of-band human authorization to recover

Recovery is intentionally not an automated tool action. The demonstration ends with the requirement for out-of-band human authorization and review before any governed workflow can resume. The human reviewer must inspect the event, evidence, provenance, and governance output; the system does not infer authorization from a new caller claim.

**Audience takeaway:** containment protects the review boundary. It does not create a new autonomous authority path.

## Evaluation Documentation Handoff

The separate Evaluation Documentation deliverable should draw directly from the existing project evidence rather than inventing a second testing story:

- the adversarial battery registry and durable `LATEST.md` / `latest.json` reports;
- Protocol 66 unit, calibration, and fault-injection results;
- the real MCP stdio smoke test;
- adapter-boundary tests; and
- [PRAETOR_MCP_AI_TECHNICAL_DEBT.md](../PRAETOR_MCP_AI_TECHNICAL_DEBT.md), including security findings, known test gaps, design shortcuts, documentation verification debt, and thresholds that need real calibration data before production consideration.

That evaluation document should cover testing methodology, security considerations, lessons learned, residual limitations, and the explicit HOLD/NO-GO boundary for live or operational use.

The agent experiment gate is documented in [docs/AGENT_EXPERIMENT_GO_NO_GO.md](AGENT_EXPERIMENT_GO_NO_GO.md). The bounded ReviewAgent is GO for the demonstration; additional agents remain NO-GO until their role, runtime, evidence, handoff, adversarial, and lifecycle contracts are independently proven.

## Refinement Checklist After Kickoff

- Confirm the hackathon's exact slide or document template and judging language.
- Replace placeholder narrative with the team's agreed problem framing and audience vocabulary.
- Select the smallest reproducible demo packet and adversarial sequence.
- Capture screenshots or terminal output only from synthetic local runs.
- Confirm whether "out-of-band authorization" should be described as a demo governance requirement or shown through a specific human-review artifact.
- Reconcile the final pitch terminology with the Evaluation Documentation deliverable.
