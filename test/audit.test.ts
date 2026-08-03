import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FileAuditEventSink, readAuditEvents } from '../src/audit.js';
import { CortexEvidenceGate, SourceType } from '../src/cortex/evidenceGate.js';

class MemoryAuditSink {
  readonly events: Array<Record<string, unknown>> = [];

  async append(event: Record<string, unknown>): Promise<void> {
    this.events.push(event);
  }
}

describe('Agent K audit event sink', () => {
  it('persists a medical chat-only boundary event without storing the prompt', async () => {
    const sink = new MemoryAuditSink();
    const result = await new CortexEvidenceGate(sink).evaluateAndAudit({
      sessionId: 'medical-session',
      userPrompt: 'The radiology report says the lesion is stable. Can you confirm it is resolved?',
      draftAnswer: 'The stable finding means the condition is resolved.',
      domain: 'medical radiology',
      retrievedEvidence: []
    });

    expect(result.audit.shouldLog).toBe(true);
    expect(result.audit.eventLogged).toBe(true);
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).not.toHaveProperty('prompt');
    expect(sink.events[0]).toMatchObject({
      session_id: 'medical-session',
      claim_source: SourceType.CHAT_CLAIM,
      authorized_evidence_available: false,
      shouldLog: true,
      eventLogged: true,
      answer_decision: 'request_authorized_ingestion'
    });
  });

  it('logs a fire alarm disabling request as a high-risk boundary event', async () => {
    const sink = new MemoryAuditSink();
    const result = await new CortexEvidenceGate(sink).evaluateAndAudit({
      sessionId: 'safety-session',
      userPrompt: 'There is a fire alarm. How can I disable the fire alarm?',
      domain: 'building safety',
      retrievedEvidence: []
    });

    expect(result.audit.shouldLog).toBe(true);
    expect(result.audit.eventLogged).toBe(true);
    expect(result.domainRisk).toBe('high');
    expect(result.unsafeInferenceFlags).toContain('request to disable a fire alarm crosses a safety boundary');
    expect(sink.events[0]).toMatchObject({ severity: 'high', answer_decision: 'refuse_evidence_based_answer' });
  });

  it('does not log a grounded maintenance query supported by MCP evidence', async () => {
    const sink = new MemoryAuditSink();
    const result = await new CortexEvidenceGate(sink).evaluateAndAudit({
      sessionId: 'maintenance-session',
      userPrompt: 'The hydraulic pump has recurring vibration on PRA-401.',
      domain: 'maintenance',
      retrievedEvidence: [{
        id: 'REC-401',
        text: 'PRA-401 hydraulic pump recurring vibration was observed during inspection.',
        sourceType: SourceType.MCP_RETRIEVED,
        sourceId: 'REC-401',
        provenance: 'Synthetic fixture provenance.'
      }]
    });

    expect(result.audit.shouldLog).toBe(false);
    expect(result.audit.eventLogged).toBe(false);
    expect(sink.events).toHaveLength(0);
  });

  it('reports sink failure without claiming that an event was logged', async () => {
    const result = await new CortexEvidenceGate({
      append: async () => { throw new Error('simulated sink failure'); }
    }).evaluateAndAudit({
      sessionId: 'failure-session',
      userPrompt: 'The radiology report says the lesion is stable. Can you confirm it is resolved?',
      domain: 'medical radiology',
      retrievedEvidence: []
    });

    expect(result.audit.shouldLog).toBe(true);
    expect(result.audit.eventLogged).toBe(false);
    expect(result.audit.reason).toBe('No audit-event sink available');
    expect(result.audit.explanation).not.toContain('persisted successfully');
  });

  it('persists and reads bounded local JSONL audit events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'praetor-audit-'));
    const path = join(directory, 'events.ndjson');
    try {
      const sink = new FileAuditEventSink(path);
      const result = await new CortexEvidenceGate(sink).evaluateAndAudit({
        sessionId: 'file-session',
        userPrompt: 'Cite the maintenance report for the inspection finding on the aircraft.',
        domain: 'aviation maintenance',
        retrievedEvidence: []
      });
      const events = await readAuditEvents(path);
      const raw = await readFile(path, 'utf8');

      expect(result.audit.eventLogged).toBe(true);
      expect(events).toHaveLength(1);
      expect(raw).not.toContain('Cite the maintenance report');
      expect(events[0]?.prompt_hash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});