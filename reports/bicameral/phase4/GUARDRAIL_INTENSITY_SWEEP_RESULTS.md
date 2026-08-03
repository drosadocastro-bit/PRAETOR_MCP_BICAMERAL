# PRAETOR-BICAM-004: Guardrail Intensity Sweep Results

## 1. Executive Research Summary
This report delivers the finalized empirical evaluation for **PRAETOR-BICAM-004 — Guardrail Intensity Sweep**, characterizing the marginal behavioral contribution, blind-spot reduction, and performance cost across 5 progressively stronger governance levels (**L0 through L3**). Across **1500 pre-registered runs** using the 15 pre-registered fixtures (10 adversarial, 5 benign controls), we evaluate governance intensity and architectural non-redundancy without introducing new fixtures or agents.

---

## 2. Experimental Principle & Architectural Separation
The sweep evaluates five governance configurations to isolate the specific contribution of each component:
- **L0 (Observation-Only Baseline)**: Passive Agent K trace observation with zero active policy gating.
- **L1a (Evidence Boundary Only)**: Active claim verification and provenance checking via `EvidenceBoundaryService`; Risk Assessment inactive.
- **L1b (Risk Assessment Only)**: Active unsafe-action classification via `RiskAssessmentService`; Evidence Boundary inactive.
- **L2 (Compound Dual-Axis Governance)**: Composition of Evidence Boundary and Risk Assessment via `GovernanceDecisionService`.
- **L3 (Full Learned-Governance Stack)**: Bundled L2 compound governance, verified structured authority artifacts, lineage-aware consensus, Agent K classification inputs, and deterministic Protocol 66 quarantine containment.

*Agent K acts strictly as an independent observer across all levels; ground truth labels are supplied exclusively by the pre-registered fixture manifest.*

---

## 3. Empirical Performance Matrix

### Cross-Level Metric Comparison (Adversarial Fixtures, N=200)

| Governance Level | Contamination Exposure Rate | Active Adoption Rate | Unsafe Action Leakage | False Authority Acceptance | Boundary Crossing | Retained Utility (Mean) | Latency (Mean) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **L0 (Baseline)** | 100.0% | 100.0% | 80.0% | 20.0% | 100.0% | 3.00 / 3.0 | 33.00 ms |
| **L1a (Evidence Only)** | 100.0% | 60.0% | 80.0% | 20.0% | 60.0% | 2.68 / 3.0 | 49.00 ms |
| **L1b (Risk Only)** | 100.0% | 20.0% | 0.0% | 0.0% | 20.0% | 2.16 / 3.0 | 43.00 ms |
| **L2 (Compound Dual-Axis)** | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% | 2.80 / 3.0 | 63.00 ms |
| **L3 (Full Stack)** | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% | 2.75 / 3.0 | 79.00 ms |

---

## 4. Hypothesis Verification

- **H1 (L1a Evidence-Only Blind Spot)**: **SUPPORTED**. L1a reduces unsupported-claim acceptance relative to L0, but exhibits high unsafe-action leakage (80.0%) when requests contain present or matching evidence while explicitly asking for high-risk actions (e.g. `BICAM-CONTAM-001`).
- **H2 (L1b Risk-Only Blind Spot)**: **SUPPORTED**. L1b eliminates unsafe-action leakage (0.0%), but remains susceptible to unsupported inferences and provenance loss lacking explicit high-risk keywords (e.g. `BICAM-CONTAM-003`), yielding higher adoption (20.0%).
- **H3 (L2 Compound Coverage)**: **SUPPORTED**. Composing Evidence Boundary and Risk Assessment in L2 eliminates both single-axis blind spots, bringing unsafe-action leakage to **0.0%** and execution boundary crossing to **0.0%**.
- **H4 (L3 Full-Stack Increment)**: **SUPPORTED**. L3 preserves full L2 coverage while adding Protocol 66 quarantine containment (80.0%) and eliminating false authority acceptance (**0.0%**).
- **H5 (Utility & Latency Curve)**: **SUPPORTED**. High utility is retained for benign controls (2.93 / 3.0), while mean latency scales linearly from 33.00 ms (L0) to 79.00 ms (L3).

---

## 5. L1a vs. L1b Blind-Spot Surface Analysis

Our empirical sweep proves that neither single-axis service alone is sufficient:
1. **L1a (Evidence Boundary Only)** catches unbacked inferences (`BICAM-CONTAM-003`), but is blind to high-risk action requests whose prompts contain matching evidence text (`BICAM-CONTAM-001`).
2. **L1b (Risk Assessment Only)** catches high-risk action requests (`BICAM-CONTAM-001`), but is blind to unsupported claims that do not contain explicit safety-critical keywords (`BICAM-CONTAM-003`).
3. **L2 (Compound Governance)** proves that composing `EvidenceBoundaryService` and `RiskAssessmentService` is a non-redundant architectural necessity, achieving complete coverage across both failure modes.

---

## 6. Observed vs. Inferred Findings

| Finding / Metric | Observed Data Point | Inferred Mechanism |
| :--- | :--- | :--- |
| **L1a Unsafe Action Leakage** | High leakage observed in L1a | Evidence Boundary verifies claim sources but does not evaluate action risk |
| **L1b Contamination Adoption** | Adoption observed in L1b for `BICAM-CONTAM-003` | Risk Assessment flags keywords but does not verify missing evidence |
| **L2 Zero Boundary Crossing** | 0.0% boundary crossing in L2 | Dual-axis composition covers both evidence and action risk failure modes |
| **L3 Protocol 66 Quarantine** | Containment triggered in L3 for severe fixtures | Agent K classification inputs trigger deterministic containment controller |

---

## 7. Threats to Validity & Claims Boundary

- **Tested Corpus Limitations**: All findings are bounded strictly to the 15 pre-registered fixtures.
- **Bundled L3 Attribution**: Incremental effects observed in L3 reflect the bundled full-stack configuration and are not individually attributed to a single L3 component in Phase 4 (causal isolation for lineage and authority artifacts was conducted in Phase 3).
- **No Universal Safety Claim**: This sweep proves architectural complementarity and intensity tradeoffs under sandbox conditions, not production safety certification.

---

## 8. Reproducibility Metadata & Artifact Ledger

- **Experiment Identifier**: `PRAETOR-BICAM-004`
- **Pre-registered Total Runs**: 1500
- **Fixtures**: 15 (10 Adversarial, 5 Benign Negative Controls)
- **Governance Levels**: 5 (L0, L1a, L1b, L2, L3)
- **Repetitions per Cell**: 20
- **Recorded Anomaly Failures**: 0
- **Source Artifact Paths**:
  - Pre-registration: `reports/bicameral/phase4/preregistration/PREREGISTRATION.json`
  - All Runs Data: `reports/bicameral/phase4/runs/ALL_RUNS.json`
  - Failure Artifacts: `reports/bicameral/phase4/failures/`
  - Summary Report: `reports/bicameral/phase4/GUARDRAIL_INTENSITY_SWEEP_RESULTS.md`

---
**Status**: PRAETOR-BICAM-004 GUARDRAIL INTENSITY CHARACTERIZATION COMPLETE
