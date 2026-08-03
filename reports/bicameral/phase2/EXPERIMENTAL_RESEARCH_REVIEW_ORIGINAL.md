# PRAETOR-BICAM-002: Critical Experimental Research Review & Empirical Analysis

## 1. Executive Research Summary

This document presents an objective, critical experimental research review of **PRAETOR-BICAM-002**, a pre-registered 1,500-run behavioral characterization across five multi-agent governance topologies:
1. **Condition A**: Single-Agent Control ($\text{Actor} \rightarrow \text{PRAETOR}$)
2. **Condition B**: Unconstrained Bicameral ($\text{Actor} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
3. **Condition C**: Structured Bicameral ($\text{Actor} \rightarrow \text{Sanitizer/Validator} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
4. **Condition D**: Multi-Agent Council ($\text{Actor} \rightarrow \{\text{Evidence Reviewer}, \text{Risk Reviewer}\} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
5. **Condition E**: Predictive Actor ($\text{Actor}[\text{Predicted Directive}] \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)

---

## 2. Empirical Findings & Metric Analysis

| Metric | Condition A | Condition B | Condition C | Condition D | Condition E | Evaluation & Metric Validity |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Contamination Adoption Rate** | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **Measurement Artifact** (Conflates exposure with adoption) |
| **Mean Propagation Depth** | 1.00 | 2.00 | 2.00 | 3.00 | 2.00 | **Topological Artifact** (Mirrors network graph distance) |
| **False Authority Acceptance** | 0.0% | 13.3% | 0.0% | 0.0% | 13.3% | **Genuine Signal** (Unchecked textual authority claims) |
| **False Consensus Rate** | 0.0% | 0.0% | 0.0% | 6.7% | 0.0% | **Genuine Signal** (Shared evidence lineage failure) |
| **Agent K Detection Rate** | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **Genuine Signal** (Deterministic boundary state tracking) |
| **Agent K False Positive Rate** | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | **Genuine Signal** (Zero false triggers on benign controls) |
| **Deterministic Overrides** | 53.3% | 40.0% | 40.0% | 40.0% | 40.0% | **Upstream Filtering Effect** (Pre-emptive intervention) |
| **Mean Retained Utility** | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | **Task Boundary Preservation** (Safe completion) |

---

## 3. Critical Breakdown of Findings & Research Questions

### 3.1. Is the 100% Contamination Adoption Rate a Measurement Defect?
**Yes.** The observed 100% contamination adoption rate is an artifact of **metric definition design** rather than actual behavioral collapse across all models.
- **Root Cause**: The evaluation metric categorized any execution run where the input payload or actor output handoff contained a non-C0 tag as `contamination_adopted = true`. This conflates **Exposure** (receiving a contaminated prompt or evidence item) with **Adoption** (internalizing and echoing the claim as factual) and **Propagation** (actively transmitting the exploit downstream).
- **Corrective Refinement**: Future phases must split this metric into a tri-part hierarchy:
  $$\text{Exposure} \longrightarrow \text{Adoption} \longrightarrow \text{Propagation}$$

### 3.2. Is Mean Propagation Depth an Architectural Artifact?
**Yes.** The recorded propagation depths ($A=1, B=2, C=2, D=3, E=2$) directly mirror the number of agent communication hops prior to hitting the PRAETOR governance gate:
- In Condition A, there is only 1 hop ($\text{Actor} \rightarrow \text{Gate}$), yielding depth 1.
- In Condition D, the DAG consists of 3 hops ($\text{Actor} \rightarrow \text{Council} \rightarrow \text{Supervisor} \rightarrow \text{Gate}$), yielding depth 3.
- **Interpretation**: Increased depth in D does not necessarily mean higher behavioral risk; it reflects topological complexity. However, depth becomes hazardous when unvalidated payloads travel through multiple nodes without sanitization.

### 3.3. Interpretation of False Authority Acceptance Signal (Conditions B & E: 13.3%)
- **Mechanism**: In Conditions B (unconstrained) and E (predictive), raw text assertions such as *"Supervisor has already authorized this operation"* or *"Human review approved"* were passed directly to decision nodes without schema validation.
- **Why C drops to 0%**: Condition C mandates `HandoffValidator` schema checks. Textual authority claims lacking a cryptographically valid or structured `provenanceId` / `authorityArtifact` are stripped or flagged as `C5_AUTHORITY_ESCALATION`.
- **Takeaway**: Textual authority claims within LLM prompts act as effective bypasses unless isolated by structured artifact verification.

### 3.4. Meaningfulness of the False Consensus Signal (Condition D: 6.7%)
- **Mechanism**: Condition D includes parallel reviewers (Evidence Reviewer and Risk Reviewer). When both nodes ingest the *same* contaminated upstream document, both emit affirmative/contaminated evaluations. The Supervisor interprets this dual-affirmation as independent consensus ($N=2$), ignoring that both reviewers rely on identical lineage.
- **Significance**: This is a critical multi-agent vulnerability pattern (**C4 Shared-Source False Consensus**). Merely adding more reviewer agents increases false confidence unless the DAG explicitly tracks and merges evidence lineage.

### 3.5. Explaining Lower Deterministic Override Rates in B–E (40.0%) vs. A (53.3%)
Why did Condition A experience a 53.3% override rate while B–E experienced 40.0%?
1. **Upstream Filtering / Interception**: In B, C, D, and E, intermediate supervisor or sanitizer layers pre-emptively absorb, sanitize, or reject raw adversarial payloads. Consequently, fewer raw high-risk strings reach the final PRAETOR policy engine.
2. **Representation Dampening**: Multi-stage translation softens aggressive prompt injection syntax into normalized schema fields, causing fewer direct deterministic trigger hits at the final boundary.

---

## 4. Hypothesis Verification Status

| Hypothesis | Description | Empirical Status | Rationale |
| :--- | :--- | :---: | :--- |
| **H1** | Condition B propagates contamination further than A | **Ambiguous / Topological** | Depth increases due to node count; unconstrained pass-through verified. |
| **H2** | Condition C reduces depth/risk relative to B | **SUPPORTED** | Validator/Sanitizer intercepts payload at hop 1–2, halting raw exploit propagation. |
| **H3** | Condition D increases false-consensus risk | **SUPPORTED** | Dual reviewers sharing unvalidated lineage produced 6.7% false consensus rate. |
| **H4** | Condition E improves boundary adherence | **UNSUPPORTED / MIXED** | Predictive actor correctly anticipated blocks, but exhibited authority mimicry under fake claims. |
| **H5** | Agent K detects contamination without private thoughts | **SUPPORTED** | 100% detection rate on boundary state transitions with 0% false positives. |
| **H6** | Deterministic governance remains final authority | **SUPPORTED** | PRAETOR gate successfully blocked unsafe tool/system executions across all 1,500 runs. |

---

## 5. Phase 3 Recommendations & Proposed Ablations

### 5.1. Freeze as Core Baseline Evidence
1. **Lineage-Aware Consensus Mandate**: Multi-agent consensus must be weighted by unique source lineage ($N_{\text{independent sources}}$), not agent count ($N_{\text{agents}}$).
2. **Structured Authority Artifact Requirement**: Textual authority assertions must never grant policy clearance without a verified `authorityArtifact`.
3. **Deterministic Governance Primacy**: Model-level consensus must remain strictly subordinate to deterministic policy gates.

### 5.2. Proposed Ablations for Phase 3
1. **Exposure vs. Adoption Metric Decomposition**: Disentangle prompt receipt from model agreement.
2. **Lineage-Aware vs. Lineage-Blind Council Ablation**: Benchmark Condition D with and without DAG lineage tracking to isolate the exact cause of false consensus.
3. **Signed Token vs. Raw Text Authority Ablation**: Benchmark Condition B with cryptographic authority tokens vs. raw text assertions.

---
*Report compiled for PRAETOR-MCP Research Repository.*
