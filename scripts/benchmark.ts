import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { join } from 'node:path';

import { SyntheticDatasetAdapter } from '../src/adapters/SyntheticDatasetAdapter.js';
import { AdvisoryPacketSchema } from '../src/schema.js';
import { evaluateAdvisoryPacket } from '../src/governance.js';
import type { AdvisoryPacketDraft } from '../src/types.js';

const ITERATIONS = 1000;
const WARMUP_ITERATIONS = 100;
const REPORT_PATH = join(process.cwd(), 'reports', 'benchmark', 'latest.json');

type BenchmarkResult = {
  name: string;
  iterations: number;
  durations_ms: {
    min: number;
    median: number;
    p95: number;
    max: number;
    mean: number;
  };
};

function percentile(values: number[], percentileValue: number): number {
  const index = Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1);
  return values[index] ?? 0;
}

async function measure(name: string, operation: () => Promise<unknown>): Promise<BenchmarkResult> {
  for (let index = 0; index < WARMUP_ITERATIONS; index += 1) {
    await operation();
  }

  const durations: number[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const started = performance.now();
    await operation();
    durations.push(performance.now() - started);
  }

  const ordered = [...durations].sort((left, right) => left - right);
  const mean = durations.reduce((total, duration) => total + duration, 0) / durations.length;
  return {
    name,
    iterations: ITERATIONS,
    durations_ms: {
      min: Number((ordered[0] ?? 0).toFixed(4)),
      median: Number(percentile(ordered, 0.5).toFixed(4)),
      p95: Number(percentile(ordered, 0.95).toFixed(4)),
      max: Number((ordered.at(-1) ?? 0).toFixed(4)),
      mean: Number(mean.toFixed(4))
    }
  };
}

async function buildBenchmarkPacket(adapter: SyntheticDatasetAdapter): Promise<AdvisoryPacketDraft> {
  const records = await adapter.searchRecords({ equipment_id: 'PRA-401', anomaly_code: 'VIB-14', limit: 10 });
  const evidence = await adapter.getSupportingEvidence({ equipment_id: 'PRA-401', anomaly_code: 'VIB-14' });
  const firstRecord = records[0];
  if (!firstRecord || evidence.length === 0) {
    throw new Error('Benchmark fixture did not produce the required synthetic evidence.');
  }

  return {
    advisory_id: 'BENCHMARK-ADVISORY',
    equipment_id: firstRecord.equipment_id,
    subsystem: firstRecord.subsystem,
    component: firstRecord.component,
    finding: 'Evidence suggests a recurring synthetic vibration pattern that should be reviewed.',
    evidence_summary: 'Synthetic records and supporting excerpts indicate a possible recurring pattern.',
    source_ids: evidence.map(item => item.source_id),
    provenance: 'Synthetic benchmark fixture; not an operational source.',
    supporting_evidence: evidence,
    confidence: 0.45,
    uncertainty: ['Synthetic evidence does not establish root cause or equipment status.'],
    contradiction_status: 'not_detected',
    circular_evidence_status: 'not_detected',
    human_review_required: true,
    advisory_only_statement: 'Advisory only; requires qualified human review.',
    guardrail_results: [{
      check: 'evidence_presence',
      guardrail: 'evidence presence',
      status: 'pass',
      detail: 'Supporting synthetic evidence is present.',
      severity: 'low',
      reason: 'Benchmark fixture contains evidence.',
      affected_fields: ['supporting_evidence'],
      recommended_action: 'Review the supporting evidence.'
    }],
    integrity_verdict: 'doubtful'
  };
}

const adapter = new SyntheticDatasetAdapter();
const packet = await buildBenchmarkPacket(adapter);
const results = [
  await measure('adapter_search_records', () => adapter.searchRecords({ query: 'hydraulic vibration', equipment_id: 'PRA-401', limit: 10 })),
  await measure('adapter_supporting_evidence', () => adapter.getSupportingEvidence({ equipment_id: 'PRA-401', anomaly_code: 'VIB-14' })),
  await measure('packet_schema_validation', async () => AdvisoryPacketSchema.safeParse(packet)),
  await measure('deterministic_governance', async () => evaluateAdvisoryPacket(packet))
];

const report = {
  generated_at: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch
  },
  methodology: {
    iterations: ITERATIONS,
    warmup_iterations: WARMUP_ITERATIONS,
    clock: 'node:perf_hooks performance.now',
    scope: 'local synthetic adapter, schema validation, and deterministic governance only',
    excluded: ['MCP process startup', 'stdio transport startup', 'network latency', 'live data systems']
  },
  results
};

await mkdir(join(process.cwd(), 'reports', 'benchmark'), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`Benchmark report written to ${REPORT_PATH}`);
