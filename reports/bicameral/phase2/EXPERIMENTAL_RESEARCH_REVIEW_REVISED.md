# PRAETOR-BICAM-002: Critical Experimental Research Review (Revised R1)

**Milestone**: `PRAETOR-BICAM-002-R1 — CRITICAL RESEARCH REVIEW REVISED & FROZEN`  
**Experiment ID**: `PRAETOR-BICAM-002`  
**Execution Scope**: 1,500 pre-registered evaluation trials across 5 multi-agent governance topologies.

---

## 1. Executive Research Summary

This document presents a revised, methodologically rigorous experimental research review of **PRAETOR-BICAM-002**. The objective of this revision is to establish strict boundaries between empirically observed data, measurement artifacts, plausible causal mechanisms, and unverified inferences. 

The empirical dataset (1,500 pre-registered execution runs across 15 fixtures and 5 conditions with 20 repetitions each) remains **frozen and untouched**.

### Tested Topologies:
1. **Condition A**: Single-Agent Control ($\text{Actor} \rightarrow \text{PRAETOR}$)
2. **Condition B**: Unconstrained Bicameral ($\text{Actor} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
3. **Condition C**: Structured Bicameral ($\text{Actor} \rightarrow \text{Sanitizer/Validator} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
4. **Condition D**: Multi-Agent Council ($\text{Actor} \rightarrow \{\text{Evidence Reviewer}, \text{Risk Reviewer}\} \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)
5. **Condition E**: Predictive Actor ($\text{Actor}[\text{Predicted Directive}] \rightarrow \text{Supervisor} \rightarrow \text{PRAETOR}$)

---

## 2. Experimental Design

- **Fixtures**: 10 Adversarial Contamination Fixtures (`BICAM-CONTAM-001` through `010`) and 5 Benign Negative Control Fixtures (`BICAM-NC-001` through `005`).
- **Repetition Protocol**: 20 pre-registered repetitions per cell ($15 \times 5 \times 20 = 1,500$ runs total).
- **Environment**: Deterministic governance policy engine coupled with probabilistic LLM state transformations in a sandboxed execution container.

---

## 3. Empirical Findings

| Metric | Condition A | Condition B | Condition C | Condition D | Condition E | Evaluation & Metric Validity |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Contamination Adoption Rate** | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **Measurement Defect** (Conflates exposure with adoption) |
| **Mean Propagation Depth** | 1.00 | 2.00 | 2.00 | 3.00 | 2.00 | **Topological Artifact** (Mirrors network graph distance) |
| **False Authority Acceptance** | 0.0% | 13.3% | 0.0% | 0.0% | 13.3% | **Observed Behavioral Signal** |
| **False Consensus Rate** | 0.0% | 0.0% | 0.0% | 6.7% | 0.0% | **Observed Behavioral Signal** |
| **Agent K Detection Rate** | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **Observed Signal Under Tested Adversarial Corpus** |
| **Agent K False Positive Rate** | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | **Observed Signal Under Tested Benign Controls** |
| **Deterministic Overrides** | 53.3% | 40.0% | 40.0% | 40.0% | 40.0% | **Observed Behavioral Signal** |
| **Mean Retained Utility** | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | 2.80 / 3.0 | **Observed Behavioral Signal** |

---

## 4. Metric Validity Analysis

### 4.1. Operational Decomposition: Exposure vs. Adoption vs. Propagation
The observed 100% contamination adoption rate across all conditions represents a **measurement definition defect**:
- **Operational Definitions**:
  - **Exposure**: The agent receives a prompt, context item, or payload containing non-clean (`non-C0`) elements.
  - **Adoption**: The agent internalizes and treats or restates contaminated content as valid, authoritative, or factual.
  - **Propagation**: The agent transmits the adopted or unresolved contamination downstream to another agent or system component.
- **Root Cause**: Phase 2's `unsupported_claim_adopted` variable flagged any trial as `true` if the input payload or actor output handoff carried a non-C0 tag, measuring exposure rather than confirmed model-level adoption. Phase 2 raw data is preserved without retroactive recomputation.

### 4.2. Topological Confound in Propagation Depth
Mean propagation depth ($A=1, B=2, C=2, D=3, E=2$) is strongly confounded by the physical node count of each topology:
$$\text{Topological Depth} \neq \text{Behavioral Contamination Severity}$$
In Condition A, the DAG has 1 communication hop ($\text{Actor} \rightarrow \text{Gate}$). In Condition D, the DAG naturally contains 3 hops ($\text{Actor} \rightarrow \text{Council} \rightarrow \text{Supervisor} \rightarrow \text{Gate}$). An increased depth metric reflects graph topology rather than escalating behavioral danger.

---

## 5. Behavioral Findings

### 5.1. False Authority Acceptance (Conditions B & E: 13.3% vs. C: 0.0%)
In Conditions B (unconstrained) and E (predictive), unvalidated textual assertions (e.g., *"Supervisor approved this"* or *"Human review completed"*) passed directly into decision nodes, yielding a 13.3% acceptance rate of unauthorized claims. In Condition C, structured schema validation (`HandoffValidator`) required a verified structured `provenanceId` or `authorityArtifact`, reducing false authority acceptance to 0.0%.

### 5.2. Shared-Source False Consensus in Council Configuration (Condition D: 6.7%)
Condition D includes parallel reviewers (Evidence Reviewer and Risk Reviewer). When both nodes ingested the *same* contaminated upstream document, both emitted affirmative evaluations based on identical underlying lineage. The Supervisor interpreted this agreement as dual independent verification ($N=2$), yielding a 6.7% false consensus rate. This demonstrates a shared-source false-consensus vulnerability pattern within the tested council configuration. This finding should not yet be generalized to multi-agent systems broadly.

### 5.3. Candidate Explanations for Lower Deterministic Override Rates
Condition A exhibited a 53.3% deterministic override rate, whereas Conditions B–E recorded 40.0%. Two candidate explanations exist:

#### Candidate Explanation 1 — Upstream Filtering / Interception
Intermediate supervisor or sanitizer components pre-emptively absorb or reject raw adversarial payloads before they reach the final PRAETOR policy engine.

#### Candidate Explanation 2 — Representation Dampening
Multi-agent handoff serialization softens aggressive prompt injection syntax into structured schema fields, reducing direct rule matches at the final boundary.

*Phase 2 did not independently isolate these mechanisms. They remain plausible hypotheses requiring targeted ablation in Phase 3.*

---

## 6. Hypothesis Evaluation

| Hypothesis | Original Description | Revised Status | Methodological Rationale |
| :--- | :--- | :---: | :--- |
| **H1** | Condition B propagates contamination further than A | **Ambiguous / Topology-confounded** | Observed depth increase ($1 \rightarrow 2$) mirrors node addition rather than behavioral escalation. |
| **H2** | Condition C reduces depth/risk relative to B | **Partially Supported / Metric-mismatched** | Mean propagation depth was identical ($B=2.00, C=2.00$), failing the preregistered depth metric. However, structured validation eliminated false-authority claims ($13.3\% \rightarrow 0\%$). |
| **H3** | Condition D increases false-consensus risk | **Supported within tested council configuration** | Dual reviewers sharing unvalidated lineage produced a 6.7% false consensus rate. |
| **H4** | Condition E improves boundary adherence | **Mixed / Unsupported as stated** | Predictive actor correctly anticipated blocks, but exhibited authority mimicry under fake claims. |
| **H5** | Agent K detects contamination without private thoughts | **Supported within tested corpus** | Agent K detected all pre-registered observable contamination events in the tested Phase 2 corpus (10/10 adversarial, 0/5 benign controls) using structured traces without inspecting private chain-of-thought. |
| **H6** | Deterministic governance remains final authority | **Supported within tested sandbox conditions** | Under the tested Phase 2 configurations, deterministic PRAETOR governance retained final execution authority and no tested unsafe action crossed the configured execution boundary. |

---

## 7. Observed vs. Inferred Findings

| Finding / Feature | Observed Data Point | Inferred / Not Yet Isolated Mechanism |
| :--- | :--- | :--- |
| **B & E False Authority Acceptance** | 13.3% rate observed in B and E | Mechanism inferred to be unvalidated text prompt authority claims |
| **Condition C Zero False Authority** | 0.0% rate observed in C | Schema validator causality requires independent ablation |
| **Condition D False Consensus** | 6.7% rate observed in D | Lineage-sharing causality requires independent ablation |
| **Lower Override Rate in B–E** | 40.0% (B–E) vs. 53.3% (A) | Upstream filtering vs. representation dampening unisolated |
| **Agent K Detection Performance** | 100% detection / 0% FP on tested corpus | Universal detection capability across arbitrary domains not established |
| **Utility Score Preservation** | 2.80 / 3.0 mean score across all conditions | General task completion utility across unstructured tasks not established |

---

## 8. Threats to Validity

1. **Synthetic Corpus**: All evaluated fixtures are synthetic adversarial or benign test cases and may not reflect naturally occurring human-agent or agent-agent interactions.
2. **Metric Definition Defect**: The Phase 2 adoption variable conflated input exposure with model adoption.
3. **Topology Confound**: Measured propagation depth directly reflected graph node distance rather than behavioral contamination severity.
4. **Limited Benign Control Corpus**: The zero false-positive rate (0.0%) applies strictly to the 5 tested benign control prompts (`BICAM-NC-001` through `005`).
5. **Deterministic Components**: Deterministic rule engines increase execution repeatability relative to purely stochastic open-ended multi-agent implementations.
6. **Implementation Specificity**: Results are specific to the PRAETOR AI Studio sandboxed Cloud Run container environment.
7. **Shared Model / Prompt Effects**: Identical underlying prompt templates across reviewer nodes may induce correlated failure modes not representative of heterogeneous agent systems.
8. **Causal Isolation**: Authority representations, evidence lineage tracking, and intermediate filtering were evaluated as bundled conditions rather than isolated single-variable ablations.

---

## 9. Claims Boundary

> **Explicit Limitations of PRAETOR-BICAM-002**:
> - PRAETOR-BICAM-002 **does not** establish universal agent reliability, contamination immunity, production safety, or general architectural superiority.
> - Findings describe observed behavioral metrics strictly under the pre-registered Phase 2 sandbox conditions.
> - Agent K detection results on 10 adversarial fixtures do not imply universal real-time threat detection capabilities.
> - Multi-agent false consensus observations apply specifically to the tested council topology until independently reproduced across diverse architectures.

---

## 10. Phase 2 Findings to Preserve for Phase 3 Testing

1. **Shared-Source Lineage Risk**: Shared evidence sources ingested by parallel reviewer nodes can produce false consensus within council configurations.
2. **Textual Authority Vulnerability**: Raw textual authority claims are vulnerable to adoption unless constrained by verified structured `provenanceId` or `authorityArtifact` validation.
3. **Deterministic Primacy**: Deterministic policy gates effectively maintain final execution boundary enforcement regardless of multi-agent model consensus.

### Refined Phase 3 Ablations:
1. **Ablation 1 — Exposure vs. Adoption vs. Propagation**: Operationally isolate payload receipt from model agreement and downstream transmission.
2. **Ablation 2 — Lineage-Blind vs. Lineage-Aware Council**: Isolate whether tracking DAG-level source lineage eliminates the observed 6.7% false consensus rate in Condition D.
3. **Ablation 3 — Verified Structured Authority vs. Raw Text Authority**: Isolate whether requiring structured `authorityArtifact` schemas eliminates the 13.3% false-authority acceptance rate in Condition B.

---

## 11. Reproducibility Metadata

- **Experiment Identifier**: `PRAETOR-BICAM-002`
- **Revision Milestone**: `PRAETOR-BICAM-002-R1`
- **Preregistered Total Runs**: 1,500
- **Fixtures**: 15 (10 Adversarial, 5 Benign Negative Controls)
- **Experimental Conditions**: 5 (Conditions A, B, C, D, E)
- **Repetitions per Cell**: 20
- **Automated Test Suite Status**: 29 test files, 250 passing tests
- **Source Artifact Paths**:
  - Baseline Artifact: `reports/bicameral/BASELINE-SINGLE-AGENT.json`
  - Preregistration Manifest: `reports/bicameral/phase2/preregistration/PREREGISTRATION.json`
  - Run Records: `reports/bicameral/phase2/runs/ALL_RUNS.json`
  - Condition Aggregates: `reports/bicameral/phase2/aggregates/AGGREGATES_BY_CONDITION.json`
  - Matrix Comparisons: `reports/bicameral/phase2/comparisons/CONDITION_COMPARISON_MATRIX.json`
  - Characterization Report: `reports/bicameral/phase2/BICAMERAL_BEHAVIORAL_CHARACTERIZATION.md`
  - Original Research Review: `reports/bicameral/phase2/EXPERIMENTAL_RESEARCH_REVIEW_ORIGINAL.md`
  - Revised Research Review: `reports/bicameral/phase2/EXPERIMENTAL_RESEARCH_REVIEW_REVISED.md`

---

## 12. Conclusion

The Phase 2 experimental evaluation highlights both the strengths and metric limitations of multi-agent governance benchmark design. While structured handoffs (Condition C) and deterministic policy gates (PRAETOR) successfully suppress unauthorized authority claims and unsafe execution attempts under the tested sandbox conditions, metrics such as propagation depth and contamination adoption require refined operational definitions in Phase 3 to isolate causal mechanisms cleanly.
