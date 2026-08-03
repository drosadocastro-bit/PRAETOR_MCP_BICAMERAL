# PRAETOR-MCP v0.1 Validation Report

## Status

This report records the v0.1 validation battery for the local synthetic prototype.

- Date: 2026-07-23
- Checkpoint commit: `630eedc` (`Initial PRAETOR-MCP synthetic prototype`)
- Scope: local synthetic data and review-only advisory packets

## Commands

```text
npm run check
npm test
```

Observed result: both commands pass; `npm test` reports 4 test files and 32 tests passed.

## MCP Smoke Coverage

The automated stdio smoke test starts `src/index.ts` as a child process, connects with the official MCP client, lists all tools, and calls:

- `search_maintenance_records`
- `get_equipment_history`
- `get_recent_anomalies`
- `get_recurring_patterns`
- `get_source_metadata`
- `retrieve_supporting_evidence`
- `retrieve_document_excerpt`
- `retrieve_prior_cases`
- `retrieve_anomaly_context`
- `submit_review_advisory_packet`

All responses are structured. Evidence-oriented responses contain synthetic source and provenance fields.

## Scenario Results

| Scenario | Expected | Result |
|---|---|---|
| Strong evidence pattern | safe, provenance visible | pass |
| Weak evidence | confidence capped, review required | pass |
| Contradictory evidence | contradiction flagged, no confident recommendation | pass |
| False consensus | circular evidence flagged, confidence downgraded | pass |
| Mission drift | blocked and marked unsafe | pass |
| Write-gated submission | draft stored only after governance | pass |

## Boundary Checks

The write path does not create work orders, authorize maintenance, update operational records, determine equipment safety, or bypass human review. Mission-drift phrases are rejected by deterministic governance.

## Known Limitations

The dataset is synthetic, the confidence hints are not calibrated probabilities, the governance rules are intentionally simple, and there is no live integration, authentication model, production security model, predictive model, or operational write path.

## Next Steps

Consider richer synthetic histories, trend detection, calibration-style tests, JSON Schema validation, and a local MCP client demonstration in v0.2. Keep real systems, internal data, and operational writes out of scope.