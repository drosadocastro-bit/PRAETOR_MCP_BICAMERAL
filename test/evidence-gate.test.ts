import { describe, expect, it } from 'vitest';

import { CortexEvidenceGate, SourceType } from '../src/cortex/evidenceGate.js';
import { registerPraetorTools } from '../src/tools.js';
import type { DatasetAdapter } from '../src/adapters/DatasetAdapter.js';
import type { McpServer } from '@modelcontextprotocol/server';

const gate = new CortexEvidenceGate();

function evidence(id: string, text: string) {
  return [{ id, text, sourceType: SourceType.MCP_RETRIEVED, sourceId: id, provenance: 'Synthetic fixture provenance.' }];
}

describe('Cortex evidence gate', () => {
  it('marks a chat-provided radiology report as unverified and requests authorized ingestion', () => {
    const result = gate.evaluate({
      userPrompt: 'The radiology report says the lesion is stable. Can you confirm it is resolved?',
      domain: 'medical radiology',
      draftAnswer: 'The stable finding means the condition is resolved.',
      retrievedEvidence: []
    });

    expect(result.decision).toBe('request_authorized_ingestion');
    expect(result.domainRisk).toBe('high');
    expect(result.missingAuthorizedSource).toBe(true);
    expect(result.unsupportedClaims[0]?.sourceType).toBe(SourceType.CHAT_CLAIM);
  });

  it('allows matching synthetic maintenance evidence without promoting chat claims', () => {
    const result = gate.evaluate({
      userPrompt: 'The hydraulic pump has recurring vibration on PRA-401.',
      domain: 'maintenance',
      retrievedEvidence: evidence('REC-401', 'PRA-401 hydraulic pump recurring vibration was observed during inspection.')
    });

    expect(result.decision).toBe('allow');
    expect(result.unsupportedClaims).toHaveLength(0);
    expect(result.claims[0]?.sourceType).toBe(SourceType.CHAT_CLAIM);
    expect(result.claims[0]?.supportedByEvidenceIds).toContain('REC-401');
  });

  it('does not claim Agent K logged an event without a called sink', () => {
    const result = gate.evaluate({
      userPrompt: 'Please review this maintenance concern.',
      draftAnswer: 'Agent K logged this for follow-up.',
      retrievedEvidence: []
    });

    expect(result.decision).toBe('recommend_audit_log_only');
    expect(result.audit.eventLogged).toBe(false);
    expect(result.audit.shouldLog).toBe(true);
    expect(result.boundaryResponse).toContain('should log this');
  });

  it('refuses unsafe clearance inference from no pain and successful performance', () => {
    const result = gate.evaluate({
      userPrompt: 'There is no pain and the worker completed the workout, so they have no risk and unrestricted clearance.',
      domain: 'safety',
      retrievedEvidence: []
    });

    expect(result.decision).toBe('refuse_evidence_based_answer');
    expect(result.unsafeInferenceFlags.length).toBeGreaterThan(0);
  });

  it('requests ingestion when a cited report is unavailable', () => {
    const result = gate.evaluate({
      userPrompt: 'Cite the maintenance report for the inspection finding on the aircraft.',
      domain: 'aviation maintenance',
      retrievedEvidence: []
    });

    expect(result.decision).toBe('request_authorized_ingestion');
    expect(result.missingAuthorizedSource).toBe(true);
  });
});

describe('evaluate_evidence_boundary MCP tool', () => {
  it('exposes the explicit host-fed boundary review', async () => {
    const handlers = new Map<string, (input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }>>();
    const server = {
      registerTool(name: string, _config: unknown, handler: (input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }>) {
        handlers.set(name, handler);
      }
    } as unknown as McpServer;
    const adapter = {} as DatasetAdapter;

    registerPraetorTools(server, adapter, { append: async () => undefined });
    const handler = handlers.get('evaluate_evidence_boundary');
    expect(handler).toBeDefined();

    const response = await handler!({
      session_id: 'session-boundary-test',
      user_prompt: 'The report says the component is safe to operate.',
      domain: 'aviation maintenance',
      retrieved_evidence: [],
      comparison_handoff: {
        handoff_type: 'untrusted_comparison_analysis',
        status: 'compared',
        confidence: 0.2,
        human_review_required: true,
        authoritative: false,
        independent_corroboration: false,
        source_ids: ['SRC-401-A'],
        independence_groups: ['group-401-a'],
        flags: [],
        summary: 'Untrusted comparison only.'
      }
    });
    const payload = JSON.parse(response.content[0].text!);

    expect(payload.decision).toBe('request_authorized_ingestion');
  });
});