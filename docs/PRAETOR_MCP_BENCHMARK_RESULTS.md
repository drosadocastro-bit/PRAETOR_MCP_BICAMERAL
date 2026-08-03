# PRAETOR-MCP Controlled Benchmark Results

## Status and Scope

This benchmark measures bounded local prototype logic for the hackathon evaluation record. It is not a production performance claim, a predictive-accuracy evaluation, or evidence that the system is ready for live government data.

The benchmark covers:

- synthetic adapter record search;
- synthetic adapter supporting-evidence retrieval;
- strict advisory-packet schema validation; and
- deterministic governance scoring.

It excludes MCP process startup, stdio transport startup, network latency, external services, live government systems, and operational workflows.

## Methodology

Command:

```text
npm run benchmark
```

Configuration:

- 1,000 measured iterations per operation;
- 100 warmup iterations per operation;
- sequential execution;
- `node:perf_hooks` `performance.now()` timing;
- fixed synthetic fixture: equipment `PRA-401`, anomaly `VIB-14`;
- same adapter, schema, and governance paths used by the application;
- raw output stored in `reports/benchmark/latest.json`.

The benchmark uses a representative packet assembled from real project fixtures. It does not create a second benchmark-only implementation of the governance path.

## Results

Run date: 2026-07-27
Runtime: Node.js `v24.13.0`, Windows x64 (`win32`, `x64`)

| Operation | Median (ms) | p95 (ms) | Mean (ms) | Maximum (ms) |
| --- | ---: | ---: | ---: | ---: |
| Adapter search records | 0.0053 | 0.0099 | 0.0072 | 0.6745 |
| Adapter supporting evidence | 0.0047 | 0.0105 | 0.0067 | 0.5070 |
| Packet schema validation | 0.0142 | 0.0295 | 0.0175 | 0.3338 |
| Deterministic governance | 0.0137 | 0.0247 | 0.0156 | 0.2475 |

The maximum values are included because short in-process benchmarks can show occasional runtime or operating-system scheduling variance. Median and p95 are more useful for describing the repeated local fixture behavior.

## Interpretation

The measured operations complete quickly because they run in-process against small synthetic data. The results support the claim that the current validation and governance path is lightweight for the fixed demonstration fixture.

They do not establish:

- end-to-end MCP client-perceived latency;
- cold-start performance;
- behavior with large real datasets;
- memory use under sustained load;
- concurrency capacity;
- network or API reliability;
- performance on deployment hardware; or
- suitability for operational service-level objectives.

Those claims require a target environment, controlled input-size matrix, repeated process-level measurements, memory sampling, concurrency tests, and an approved deployment model.

## Reproduction and Review

The benchmark implementation is [scripts/benchmark.ts](../scripts/benchmark.ts), exposed through the `benchmark` npm script. The raw report is [reports/benchmark/latest.json](../reports/benchmark/latest.json).

The benchmark should be rerun whenever the adapter, schema, governance, or fixture size changes. Results should be reported with the runtime version and platform rather than copied forward as timeless values.

## Hackathon Takeaway

PRAETOR-MCP demonstrates a small, fast local evidence-governance path, but the important claim is not speed alone. The project measures performance alongside validation, provenance, uncertainty, adversarial handling, and human-review boundaries. It is designed to prevent advisory output from outrunning the evidence, not to make unattended operational decisions.
