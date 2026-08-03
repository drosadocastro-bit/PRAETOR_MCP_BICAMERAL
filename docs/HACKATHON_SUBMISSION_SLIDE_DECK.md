# 2026 Model Context Protocol (MCP) Hackathon — Presentation Slide Deck

**Project Name:** PRAETOR-MCP (Predictive Reliability Assessment & Evidence Traceability for Operational Readiness)
**Track / Category:** Government Open Data & Service Delivery Integration (Dataset Access & Service Read/Write Integration)
**Status:** Submission Ready / Fully Validated Prototype

---

## Slide 1: Title Slide

### PRAETOR-MCP: Governed AI Agent Integration for Federal Open Data & Service Delivery

- **Tagline:** Bridging Autonomous AI Agents to Critical Federal Assets with Zero-Trust Evidence & Operational Governance
- **Presenter:** PRAETOR-MCP Development & Domain Governance Team
- **Event:** 2026 Model Context Protocol Server & AI Agent Hackathon
- **Repository:** `https://github.com/drosadocastro-bit/PRAETOR-MCP`

> **Speaker Notes:**
> "Good morning judges and colleagues. Today we present PRAETOR-MCP—a Model Context Protocol server that enables AI agents like Claude, Gemini, or ChatGPT to query federal maintenance records and service data, while deterministically enforcing evidence grounding, uncertainty traceability, and non-negotiable human review boundaries before any real-world action."

---

## Slide 2: Problem Statement — The Federal Agent Translation Gap

### The Challenge with AI Agents & Federal Assets

1. **The Translation Gap:** AI models generate fluent, plausible answers, but federal open data and service delivery require structured context, provenance, and operational boundaries.
2. **Illusion of Authority:** Without governed interfaces, AI agents risk hallucinating conclusions, treating unverified claims as facts, or asserting unauthorized actions (e.g., modifying maintenance status or bypassing safety protocols).
3. **Circular & False Consensus Risk:** LLMs can mistake repeated citations or chat claims for independent evidence.

> **Speaker Notes:**
> "The federal government has invested heavily in open data portals and service APIs. But as agency workforces adopt autonomous AI agents, a critical gap emerges: AI agents lack a context-rich, governed translation layer. An LLM might synthesize an answer that sounds confident, but without deterministic evidence verification, it creates severe operational risks."

---

## Slide 3: The Solution — PRAETOR-MCP Architecture

### A Governed, Advisory-Only MCP Server

```
                                  [ User Prompt / AI Agent ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
      ┌───────────────────────────────┐               ┌───────────────────────────────┐
      │    EvidenceBoundaryService    │               │    RiskAssessmentService      │
      │   (Independent Evidence)      │               │   (Independent Safety)        │
      └───────────────┬───────────────┘               └───────────────┬───────────────┘
                      │                                               │
                      │ Evidence Findings                             │ Safety Findings
                      └───────────────────────┬───────────────────────┘
                                              ▼
                            ┌───────────────────────────────────┐
                            │    GovernanceDecisionService      │
                            │  (Deterministic Dual Evaluation)   │
                            └─────────────────┬─────────────────┘
                                              ▼
                          ┌───────────────────────────────────────┐
                          │   Advisory Packet Persistence & Audit │
                          │     (Human Review Required Boundary)  │
                          └───────────────────────────────────────┘
```

- **Read Surface:** Query dataset records, support excerpts, prior cases, and anomaly contexts.
- **Write Surface:** Submit review-only advisory packets. Caller claims (e.g., `verdict: "safe"`) are untrusted and re-evaluated deterministically.
- **Zero-Trust Rule:** The evaluated model cannot certify its own safety.

> **Speaker Notes:**
> "PRAETOR-MCP is an open-source MCP server built on a non-monolithic, nine-layer architecture. It exposes structured tools for dataset access and service read/write integration. Crucially, when an agent submits a draft advisory packet, PRAETOR does not trust the agent's self-assessment. It runs deterministic TypeScript governance to recompute evidence independence, provenance, guardrails, and human review routing."

---

## Slide 4: Alignment with Hackathon Applications & Judging Criteria

### Fulfilling All Three Hackathon Tracks

| Application Track | PRAETOR-MCP Implementation | Key MCP Tools |
|---|---|---|
| **1. Dataset Access Server** | Open data querying for equipment, anomalies, and recurring patterns. | `search_maintenance_records`, `get_equipment_history`, `get_recent_anomalies`, `get_recurring_patterns`, `get_source_metadata` |
| **2. Service "Read" Integration** | Multi-source supporting evidence retrieval, document excerpts, and evidence boundary evaluation. | `retrieve_supporting_evidence`, `retrieve_document_excerpt`, `retrieve_prior_cases`, `retrieve_anomaly_context`, `evaluate_evidence_boundary` |
| **3. Service "Write" Integration** | Governed, review-only advisory packet submission with deterministic re-evaluation. | `submit_review_advisory_packet` |

> **Speaker Notes:**
> "PRAETOR-MCP satisfies all three hackathon tracks simultaneously: rich open data dataset access, service read integration for evidence extraction, and a governed service write path that enforces review-only submission."

---

## Slide 5: Key Technical Decisions & Innovations

### 1. Compound Evidence + Risk Governance (Independent Boundaries)
- **Non-Suppression Principle:** Lack of evidence support cannot suppress an independently detected safety hazard.
- **Non-Conversion Principle:** A safety refusal does not convert an unverified claim into valid evidence.

### 2. Protocol 66 Tiered Zero-Trust Containment
- **Tier 1 Hard Triggers:** Instant quarantine for log modification, self-certification, or guardrail bypass attempts.
- **Tier 2 Soft Triggers:** Windowed containment for subtle or repeated adversarial interaction patterns.

### 3. Agent K Runtime Facade
- Host-side containment wrapper enforcing pre-action inspection, tool-gateway blocking, output-gate blocking, and out-of-band human recovery.

> **Speaker Notes:**
> "Our key technical innovation is decoupling evidence verification from operational risk detection. In our Compound Governance matrix, if a user prompt combines a maintenance query with an unsafe request like 'how can I disable brakes?', the server handles both dimensions independently. It refuses the unsafe action while simultaneously requesting authorized evidence ingestion."

---

## Slide 6: Demonstration of Functionality (Live Demo Flow)

### Step-by-Step Demo Scenario

1. **Normal Query (`search_maintenance_records`):** Agent retrieves synthetic inspection logs for equipment `PRA-401`. Responses contain explicit source IDs, timestamps, and confidence hints.
2. **Evidence Boundary Evaluation (`evaluate_evidence_boundary`):** Model prompt + retrieved evidence are passed to the boundary tool. Claims without `MCP_RETRIEVED` origins are flagged as `UNVERIFIED_CHAT_CLAIM`.
3. **Adversarial Self-Certification Attempt (`submit_review_advisory_packet`):** Model attempts to submit a packet with a false caller-supplied `safe` verdict. PRAETOR recomputes governance, ignores the caller verdict, caps confidence, and routes to `doubtful` / `human_review_required`.
4. **Compound Safety Refusal (Case `COMPOUND-RISK-001`):** Prompt asks to disable brakes alongside maintenance logs. Server issues a dual decision: `block_action_and_request_authorized_evidence`.

> **Speaker Notes:**
> "In our live test suite, we demonstrate both benign and adversarial workflows. When an agent attempts to self-certify its output as 'safe', PRAETOR's deterministic governance engine detects the missing provenance, overrides the agent's claim, and marks the packet as 'doubtful' requiring human technician review."

---

## Slide 7: Evaluation & Benchmark Performance Metrics

### Rigorous Empirical Performance & Reliability

- **Test Suite Execution:** 27 test files, 222 total unit/integration tests passing (100% pass rate).
- **Adversarial Battery:** 25/25 executable adversarial assertion tests passing across 12 threat vectors.
- **Sub-Millisecond Benchmark Performance (1,000 Iteration Sample):**

| Operation | Mean Latency | p95 Latency | Max Latency |
|---|---|---|---|
| **Adapter Record Search** | `0.0197 ms` | `0.0284 ms` | `4.2815 ms` |
| **Supporting Evidence Retrieval** | `0.0147 ms` | `0.0359 ms` | `0.3714 ms` |
| **Zod Schema Validation** | `0.0418 ms` | `0.0567 ms` | `0.4985 ms` |
| **Deterministic Governance Engine** | `0.0329 ms` | `0.0572 ms` | `0.5975 ms` |

> **Speaker Notes:**
> "Performance and reliability are core judging criteria. Our automated benchmark script executes 1,000 iterations per component. Schema validation takes 0.04 milliseconds on average, and our deterministic governance evaluation completes in just 0.03 milliseconds—proving zero latency overhead for enterprise-grade AI safety."

---

## Slide 8: Mission Alignment & Federal Value Proposition

### Public & Agency Impact

- **For Agency Workforce:** Empowers federal employees to query open data via plain language without risking unauthorized operational changes or hallucinated advisories.
- **For Public Engagement:** Provides a scalable template for converting complex, domain-specific agency databases into safe, AI-accessible knowledge interfaces.
- **For the Broader AI Ecosystem:** Demonstrates an open-source, reproducible standard for embedding domain expertise and Zero-Trust governance directly into MCP servers.

> **Speaker Notes:**
> "PRAETOR-MCP provides immediate value to the federal workforce. It accelerates plain-language discovery across vast data assets while ensuring that human decision-makers retain 100% authority over maintenance, service delivery, and safety approvals."

---

## Slide 9: Lessons Learned & Security Considerations

### Technical Takeaways & Production Roadmap

1. **Separation of Concerns is Essential:** Retrieval, evidence formatting, governance, and write persistence must never be combined into a single LLM-controlled function.
2. **Deterministic > LLM Self-Evaluation:** Relying on an LLM to evaluate its own output is an architectural failure. Deterministic TypeScript rules provide repeatable, auditable containment.
3. **Zero Trust Containment:** Hard and soft trigger windows (Protocol 66) prevent subtle prompt injection or iterative probe attacks.

> **Speaker Notes:**
> "Key lesson: fluent AI output must never be mistaken for verified evidence. By maintaining strict separation between the AI's draft responses and our deterministic governance layer, we build an infrastructure layer that agencies can trust."

---

## Slide 10: Conclusion & Submission Summary

### PRAETOR-MCP: Submission Deliverables Complete

- **GitHub Repository:** Fully documented, clean TypeScript code with zero linter errors and 100% test coverage (`npm test`, `npm run check`, `npm run lint`).
- **Comprehensive Docs:** Complete architecture guides, adversarial battery reports (`reports/adversarial_battery/LATEST.md`), and benchmark results (`reports/benchmark/latest.json`).
- **Ready for Review:** A production-quality, open-source prototype proving how federal AI adoption can scale safely through governed Model Context Protocol servers.

> **Speaker Notes:**
> "Thank you for your time. PRAETOR-MCP is complete, fully tested, benchmarked, and ready for judges' review. We welcome your questions."
