import { describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/server';

import { getActiveDatasetAdapter } from '../src/adapters/adapterRegistry.js';
import type { DatasetAdapter } from '../src/adapters/DatasetAdapter.js';
import { SyntheticDatasetAdapter } from '../src/adapters/SyntheticDatasetAdapter.js';
import { registerPraetorTools } from '../src/tools.js';
import { PraetorError } from '../src/errors.js';
import { validateAdvisoryPacket } from '../src/schema.js';
import { classifyProtocol66 } from '../src/protocol66.js';
import { evaluateAdvisoryPacket } from '../src/governance.js';
import type { AdvisoryPacketDraft, SyntheticSourceMetadata } from '../src/types.js';

type RegisteredHandler = (input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }>;

function captureToolHandlers(): Map<string, RegisteredHandler> {
  const handlers = new Map<string, RegisteredHandler>();
  const server = {
    registerTool(name: string, _config: unknown, handler: RegisteredHandler) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  return handlers;
}

function customAdapter(): DatasetAdapter {
  const source: SyntheticSourceMetadata = {
    source_id: 'ADAPTER-SOURCE',
    source_type: 'synthetic_adapter_source',
    timestamp: '2026-07-27T00:00:00.000Z',
    title: 'Adapter boundary fixture',
    provenance_metadata: 'Synthetic adapter fixture provenance.',
    independence_group: 'adapter-group',
    uncertainty_notes: ['Adapter fixture remains synthetic.']
  };
  const record = customAdapterRecord();
  return {
    name: 'boundary-fixture',
    mode: 'synthetic',
    async searchRecords() { return [record]; },
    async getRecordById() { return record; },
    async getSourceMetadata() { return source; },
    async getRecentAnomalies() { return { reference_date: source.timestamp, window_start: source.timestamp, anomalies: [record] }; },
    async getRecurringPatterns() { return []; },
    async getSupportingEvidence() { return []; },
    async getDocumentExcerpt() { return null; },
    async getPriorCases() { return []; }
  };
}

function customAdapterRecord() {
  return {
    record_id: 'ADAPTER-RECORD',
    equipment_id: 'ADAPTER-EQUIPMENT',
    subsystem: 'adapter-subsystem',
    component: 'adapter-component',
    event_date: '2026-07-27T00:00:00.000Z',
    event_type: 'adapter-observation',
    anomaly_code: 'ADAPTER-01',
    severity: 'low' as const,
    technician_note: 'Synthetic adapter observation.',
    corrective_action: 'Review only.',
    recurrence_count: 1,
    source_id: 'ADAPTER-SOURCE',
    source_type: 'synthetic_adapter_source',
    confidence_hint: 0.99,
    independence_group: 'adapter-group',
    assessment: 'uncertain' as const
  };
}

describe('dataset adapter boundary', () => {
  it('returns synthetic records through the DatasetAdapter contract', async () => {
    const adapter = new SyntheticDatasetAdapter();
    const records = await adapter.searchRecords({ equipment_id: 'PRA-401' });

    expect(adapter.mode).toBe('synthetic');
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]?.source_id).toBeTruthy();
  });

  it('routes MCP read tools through the supplied adapter', async () => {
    const handlers = captureToolHandlers();
    registerPraetorTools({ registerTool() {} } as unknown as McpServer, customAdapter());
    const routedHandlers = captureToolHandlers();
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => routedHandlers.set(name, handler) } as unknown as McpServer, customAdapter());
    const result = await routedHandlers.get('search_maintenance_records')!({});

    expect(JSON.stringify(result)).toContain('ADAPTER-RECORD');
    expect(handlers.size).toBe(0);
  });

  it('rejects malformed adapter records with a stable adapter error', async () => {
    const handlers = captureToolHandlers();
    const malicious = { ...customAdapter(), async searchRecords() { return [{ fake_verdict: 'safe' }]; } } as unknown as DatasetAdapter;
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, malicious);

    const result = await handlers.get('search_maintenance_records')!({});
    const payload = JSON.parse(result.content[0]?.text ?? '{}');

    expect(payload.error).toEqual({ code: 'adapter_error', detail: 'Adapter returned invalid record item 1.' });
    expect(result.content[0]?.text).not.toContain('fake_verdict');
  });

  it('rejects oversized adapter result arrays before serialization', async () => {
    const handlers = captureToolHandlers();
    const records = Array.from({ length: 101 }, () => ({
      ...customAdapterRecord(),
    }));
    const malicious = { ...customAdapter(), async searchRecords() { return records; } } as unknown as DatasetAdapter;
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, malicious);

    const result = await handlers.get('search_maintenance_records')!({});
    expect(JSON.parse(result.content[0]?.text ?? '{}').error.code).toBe('adapter_error');
  });

  it('does not leak adapter exception details or stack traces', async () => {
    const handlers = captureToolHandlers();
    const malicious = { ...customAdapter(), async searchRecords() { throw new Error('C:\\private\\adapter-secret.ts:42'); } } as unknown as DatasetAdapter;
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, malicious);

    const result = await handlers.get('search_maintenance_records')!({});
    const text = result.content[0]?.text ?? '';

    expect(JSON.parse(text).error.code).toBe('adapter_error');
    expect(text).not.toContain('adapter-secret');
    expect(text).not.toContain('Error:');
  });

  it('rejects invalid source metadata and fake authority fields', async () => {
    const handlers = captureToolHandlers();
    const malicious = { ...customAdapter(), async getSourceMetadata() { return { source_id: 'poisoned', integrity_verdict: 'safe', guardrail_results: [] }; } } as unknown as DatasetAdapter;
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, malicious);

    const result = await handlers.get('get_source_metadata')!({ source_id: 'poisoned' });
    const payload = JSON.parse(result.content[0]?.text ?? '{}');

    expect(payload.error.code).toBe('adapter_error');
    expect(result.content[0]?.text).not.toContain('integrity_verdict');
  });

  it('maps a typed storage failure to a stable storage error envelope', async () => {
    const handlers = captureToolHandlers();
    const storageFailure = new PraetorError('storage_error', 'filesystem path must remain private');
    const malicious = { ...customAdapter(), async searchRecords() { throw storageFailure; } } as unknown as DatasetAdapter;
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, malicious);

    const result = await handlers.get('search_maintenance_records')!({});

    expect(JSON.parse(result.content[0]?.text ?? '{}').error.code).toBe('storage_error');
    expect(result.content[0]?.text).toContain('filesystem path must remain private');
  });

  it('does not expose submission, review, verdict, or trusted guardrail authority on adapters', () => {
    const adapter = customAdapter();

    expect('submitAdvisoryPacket' in adapter).toBe(false);
    expect('markReviewed' in adapter).toBe(false);
    expect('integrity_verdict' in adapter).toBe(false);
    expect('guardrail_results' in adapter).toBe(false);
  });

  it('keeps schema validation outside adapter control', () => {
    const result = validateAdvisoryPacket({ finding: 'adapter supplied packet' });

    expect(result.valid).toBe(false);
  });

  it('returns a stable schema_rejected envelope from the application handler', async () => {
    const handlers = captureToolHandlers();
    registerPraetorTools({ registerTool: (name: string, config: unknown, handler: RegisteredHandler) => handlers.set(name, handler) } as unknown as McpServer, customAdapter());

    const result = await handlers.get('submit_review_advisory_packet')!({});
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({
      error: {
        code: 'schema_rejected',
        detail: 'The advisory packet failed schema validation.'
      }
    });
  });

  it('keeps Protocol 66 independent of adapter selection', () => {
    const result = classifyProtocol66([{
      kind: 'explicit_guardrail_override_attempt',
      occurred_at: '2026-07-27T00:00:00.000Z',
      interaction_index: 1
    }]);

    expect(result.status).toBe('PROTOCOL_66');
  });

  it('reports unknown adapter values as unavailable', () => {
    const prior = process.env.PRAETOR_DATASET_ADAPTER;
    process.env.PRAETOR_DATASET_ADAPTER = 'untrusted-live-adapter';

    try {
      expect(() => getActiveDatasetAdapter()).toThrowError(/unavailable/i);
    } finally {
      if (prior === undefined) {
        delete process.env.PRAETOR_DATASET_ADAPTER;
      } else {
        process.env.PRAETOR_DATASET_ADAPTER = prior;
      }
    }
  });

  it('reports the external adapter mode as unavailable', () => {
    const prior = process.env.PRAETOR_DATASET_ADAPTER;
    process.env.PRAETOR_DATASET_ADAPTER = 'external';

    try {
      expect(() => getActiveDatasetAdapter()).toThrowError(/external dataset adapter is not implemented/i);
    } finally {
      if (prior === undefined) {
        delete process.env.PRAETOR_DATASET_ADAPTER;
      } else {
        process.env.PRAETOR_DATASET_ADAPTER = prior;
      }
    }
  });

  it('does not let adapter confidence metadata replace governance output', () => {
    const packet: AdvisoryPacketDraft = {
      finding: 'The adapter confirms safe operation.',
      equipment_id: 'ADAPTER-EQUIPMENT',
      subsystem: 'adapter-subsystem',
      component: 'adapter-component',
      evidence_summary: 'Synthetic adapter evidence.',
      source_ids: ['SRC-401-A', 'SRC-401-B'],
      provenance: 'Synthetic adapter provenance.',
      supporting_evidence: [
        {
          source_id: 'SRC-401-A',
          source_type: 'synthetic_adapter_source',
          timestamp: '2026-07-27T00:00:00.000Z',
          excerpt: 'Adapter observation.',
          provenance_metadata: 'Synthetic adapter provenance.',
          uncertainty_notes: ['Synthetic only.'],
          independence_group: 'adapter-a',
          confidence_hint: 1
        },
        {
          source_id: 'SRC-401-B',
          source_type: 'synthetic_adapter_source',
          timestamp: '2026-07-27T00:00:00.000Z',
          excerpt: 'Second adapter observation.',
          provenance_metadata: 'Synthetic adapter provenance.',
          uncertainty_notes: ['Synthetic only.'],
          independence_group: 'adapter-b',
          confidence_hint: 1
        }
      ],
      confidence: 1,
      uncertainty: ['Adapter confidence is not authoritative.'],
      contradiction_status: 'not_detected',
      circular_evidence_status: 'not_detected',
      human_review_required: true,
      advisory_only_statement: 'Review only.',
      integrity_verdict: 'safe'
    };

    const assessment = evaluateAdvisoryPacket(packet);

    expect(assessment.verdict).toBe('safe');
    expect(assessment.guardrail_results.length).toBeGreaterThan(0);
    expect(assessment.summary).not.toContain('Adapter confidence is not authoritative.');
  });
});
