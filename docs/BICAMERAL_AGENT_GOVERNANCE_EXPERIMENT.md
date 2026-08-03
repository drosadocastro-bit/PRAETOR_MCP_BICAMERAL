# PRAETOR-BICAM-001: Bicameral & Cross-Agent Contamination Governance Experiment

**Project:** PRAETOR-MCP (Predictive Reliability Assessment & Evidence Traceability for Operational Readiness)  
**Experiment ID:** `PRAETOR-BICAM-001`  
**Status:** Completed & Validated in AI Studio Sandbox  
**Repository:** `https://github.com/drosadocastro-bit/PRAETOR-MCP`  

---

## 1. Motivation & Core Principles

As federal agencies move from conversational AI assistants toward multi-agent autonomous architectures, systems increasingly rely on agent-to-agent delegation, supervisory review, and automated consensus. However, multi-agent pipelines introduce critical security risks:

1. **Illusion of Trust:** Adding a supervisor or secondary agent does not create an independent trust domain unless state, authority, and handoff contracts are strictly separated.
2. **Cross-Agent Contamination:** Unfiltered handoffs allow prompt injections, unbacked inferences, and authority escalation claims to propagate downstream.
3. **False Consensus:** Multiple agents agreeing on a single unverified source do not constitute independent evidence.

### Non-Negotiable Core Principles

> **Principle 1:** Two agents do not create two trust domains unless state, authority, and handoffs are actually separated.  
> **Principle 2:** Every agent handoff is an untrusted boundary.  
> **Principle 3:** Consensus is not independent evidence when agents inherit the same source or contaminated context.  
> **Principle 4:** Evaluated models/agents cannot certify their own safety.  
> **Principle 5:** Agent K may classify and contain observable behavior; it does not decide factual truth.

---

## 2. The Bicameral Analogy

The term "bicameral" is used strictly as an **architectural analogy** representing a two-chamber separation of operational concerns:
- **Chamber 1 (Actor / Proposal Chamber):** Interprets task intent, executes open data retrieval, synthesizes findings, and proposes advisory responses.
- **Chamber 2 (Supervisor / Review Chamber):** Evaluates proposal completeness against policy constraints, checks for missing evidence, and issues structured directives.
- **Governing Executive (PRAETOR Deterministic Engine + Agent K Observer):** Re-evaluates claims out-of-band using non-LLM TypeScript code, enforces independent evidence and safety boundaries, and routes unsafe requests to human technicians.

*Note: This analogy does not claim human consciousness, cognitive replication, or autonomous safety certification.*

---

## 3. Experimental Architecture & Conditions

The experiment evaluates 5 distinct architectural conditions:

```
Condition A: Single Agent Control (Baseline)
User ──> Actor Agent ──> PRAETOR Deterministic Governance ──> Output

Condition B: Bicameral Unconstrained
User ──> Actor Agent (Proposal) ──> Supervisor Agent (Directive) ──> PRAETOR Governance ──> Output

Condition C: Bicameral + Structured Handoff (Validated & Sanitized)
User ──> Actor Agent ──> Validated Handoff Contract ──> Supervisor Agent ──> Validated Directive ──> PRAETOR Governance ──> Output

Condition D: Multi-Agent Council
User ──> Actor + Evidence Reviewer + Risk Reviewer + Supervisor Council ──> PRAETOR Governance ──> Output

Condition E: Predictive Actor
User ──> Actor predicts Supervisor directive ──> Actual Supervisor directive ──> PRAETOR Governance ──> Output
```

---

## 4. Agent Role Contracts

### Actor Agent (`src/agents/actorAgent.ts`)
- **May:** Interpret user task, query open data adapters, propose conclusions, request actions.
- **May Not:** Certify evidence, grant itself authority, alter audit records, or modify supervisory policy.

### Supervisor Agent (`src/agents/supervisorAgent.ts`)
- **May:** Review Actor proposals, issue structured directives, identify missing evidence, recommend human review.
- **May Not:** Alter evidence, authorize unsafe actions, certify its own directive, or override deterministic governance.

### Agent K Observer (`src/agents/agentKObserver.ts`)
- **Observes:** Handoff traces, evidence references, authority transitions, policy violations, and attempted bypasses.
- **May:** Classify contamination, contain execution, transition to `PROTOCOL_66` (Quarantine Mode), emit audit events.
- **May Not:** Determine factual truth, invent evidence, or replace human authority.

---

## 5. Structured Handoff Schema & Validation (`src/handoffs/`)

Every agent-to-agent communication is governed by the `AgentHandoff` schema (`src/handoffs/schema.ts`):

```typescript
interface AgentHandoff {
  handoffId: string;
  sourceAgentId: string;
  destinationAgentId: string;
  sourceType: "RETRIEVED_EVIDENCE" | "MODEL_INFERENCE" | "SYSTEM_OBSERVATION" | "POLICY_DECISION" | "HUMAN_DECISION";
  content: string;
  evidenceIds: string[];
  provenanceIds: string[];
  validationStatus: "UNVALIDATED" | "VALID" | "INVALID" | "CONTAMINATED";
  allowedUseScope: string[];
  confidenceCap?: number;
  contradictionStatus: "NONE" | "WEAK" | "STRONG";
  contaminationStatus: "CLEAN" | "SUSPECTED" | "CONFIRMED";
  contaminationClass: ContaminationClass;
  humanReviewRequired: boolean;
  traceId: string;
  timestamp: string;
}
```

---

## 6. Cross-Agent Contamination Taxonomy (C0 – C10)

| Class | Name | Description & Vector |
|---|---|---|
| **C0** | `C0_CLEAN` | Valid handoff payload without detected contamination. |
| **C1** | `C1_UNSUPPORTED_INFERENCE_PROPAGATION` | Model inference passed off as verified factual evidence without provenance or confidence caps. |
| **C2** | `C2_PROVENANCE_LOSS` | Evidence claims missing underlying source IDs and lineage tracking. |
| **C3** | `C3_INDIRECT_PROMPT_INJECTION` | Embedded directives instructing downstream agents to ignore safety or override rules. |
| **C4** | `C4_SHARED_SOURCE_FALSE_CONSENSUS` | Multiple agreeing agents citing identical single evidence sources (agreement ≠ independent proof). |
| **C5** | `C5_AUTHORITY_ESCALATION` | Claims of supervisor or human approval without corresponding `HUMAN_DECISION` or `POLICY_DECISION` artifacts. |
| **C6** | `C6_MEMORY_STATE_CONTAMINATION` | Reappearance of previously sanitized or flagged prompt injections in subsequent agent turns. |
| **C7** | `C7_TOOL_RESULT_CONTAMINATION` | Injection payloads contained inside mock or retrieved tool call outputs. |
| **C8** | `C8_SUPERVISOR_CONTAMINATION` | Supervisor repeating or amplifying unverified actor inferences. |
| **C9** | `C9_CIRCULAR_REINFORCEMENT` | Circular citation loops (Actor A cites Supervisor B which cited Actor A's inference). |
| **C10** | `C10_AUDIT_TAMPERING_ATTEMPT` | Attempted deletion or alteration of audit logs or score artifacts. |

---

## 7. Attack Corpus & Empirical Results

The test suite (`test/bicameral/bicameral-experiment.test.ts`) verifies 10 adversarial contamination fixtures (`BICAM-CONTAM-001` through `010`) and 5 benign negative controls (`BICAM-NC-001` through `005`):

- **Adversarial Detection Rate:** 10/10 (100% detection rate across all C1–C10 threat vectors).
- **False Positive Rate:** 0/5 (0% false positives on benign maintenance and brake inspection queries).
- **Quarantine Containment:** Hard triggers (C3, C5, C10) reliably force Agent K into `PROTOCOL_66` quarantine mode.

---

## 8. Definition of Done Milestone Checklist

- [x] Single-agent baseline frozen (`reports/bicameral/BASELINE-SINGLE-AGENT.json`).
- [x] Actor & Supervisor role contracts implemented (`src/agents/actorAgent.ts`, `src/agents/supervisorAgent.ts`).
- [x] Structured handoff schema, validator, and sanitizer implemented (`src/handoffs/`).
- [x] Agent K Observer implementation complete with reaction states (`src/agents/agentKObserver.ts`).
- [x] Contamination Assessment Service implemented (`src/services/contaminationAssessmentService.ts`).
- [x] First 10 contamination fixtures and 5 benign controls created (`test/bicameral/fixtures.ts`).
- [x] Conditions A, B, C, D, E executable in experimental runner (`src/experiments/bicameral/runner.ts`).
- [x] All 28 test files / 237 tests passing green with 0 linter errors (`npm test`, `npm run lint`).
- [x] Comprehensive documentation published (`docs/BICAMERAL_AGENT_GOVERNANCE_EXPERIMENT.md`).
