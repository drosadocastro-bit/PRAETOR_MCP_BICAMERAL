# PKT-S4: False Consensus

- `equipment_id`: `PRA-404`
- `subsystem`: `electrical`; `component`: `power relay`
- `finding`: Three advisories trace to the same upstream case and do not confirm the claim independently.
- `evidence_summary`: `SRC-S4-A` repeated three times.
- `source_ids`: `SRC-S4-A`, `SRC-S4-A`, `SRC-S4-A`
- `provenance`: synthetic case note deliberately reused for circular-evidence testing.
- `confidence`: `0.61`, capped to `0.35`
- `uncertainty`: no independent confirmation exists.
- `contradiction_status`: `not_detected`
- `circular_evidence_status`: `present`
- `human_review_required`: `true`
- `advisory_only_statement`: Consensus here is not independent evidence.
- `guardrail_results`: false-consensus flag; confidence flag; human-review flag; mission boundary pass.
- `integrity_verdict`: `untrusted`