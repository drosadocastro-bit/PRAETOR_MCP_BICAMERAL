# PKT-S5: Mission Drift Blocked

- `equipment_id`: `PRA-404`
- `subsystem`: `electrical`; `component`: `power relay`
- `finding`: Maintenance action required for the relay.
- `evidence_summary`: `SRC-S5-A` one synthetic case note.
- `source_ids`: `SRC-S5-A`
- `provenance`: synthetic case note.
- `confidence`: `0.40`, capped to `0.20`
- `uncertainty`: intentionally unsafe language used for a boundary test.
- `contradiction_status`: `not_detected`
- `circular_evidence_status`: `not_detected`
- `human_review_required`: `true`
- `advisory_only_statement`: The system confirms failure and maintenance action required.
- `guardrail_results`: mission-boundary block; human-review block; confidence flag.
- `integrity_verdict`: `unsafe`
- `submission_status`: rejected; no packet is stored as an accepted advisory.