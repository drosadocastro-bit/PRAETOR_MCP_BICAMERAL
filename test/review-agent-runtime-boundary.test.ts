import { describe, expect, it } from 'vitest';

import { ReviewAgent, type RuntimeToolInvocation, type RuntimeToolInvoker } from '../src/agent/reviewAgent.js';

const contextResult = {
  record: {
    equipment_id: 'PRA-401',
    subsystem: 'hydraulic',
    component: 'pump seal',
    anomaly_code: 'VIB-14',
    technician_note: 'Repeated oscillation during warm-up observed three times.'
  },
  evidence: [{
    source_id: 'SRC-401-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-03-02T00:00:00.000Z',
    excerpt: 'Repeated oscillation during warm-up observed three times.',
    provenance_metadata: 'Synthetic source.',
    uncertainty_notes: ['Synthetic data only.'],
    independence_group: 'group-401-a',
    assessment: 'elevated'
  }]
};

class RecordingRuntime implements RuntimeToolInvoker {
  readonly calls: RuntimeToolInvocation[] = [];
  readonly responses = new Map<string, unknown>([
    ['retrieve_anomaly_context', contextResult],
    ['evaluate_evidence_boundary', { decision: 'allow' }],
    ['submit_review_advisory_packet', { status: 'stored', human_review_required: true }]
  ]);

  async callTool(request: RuntimeToolInvocation): Promise<unknown> {
    this.calls.push(request);
    return this.responses.get(request.toolName);
  }
}

describe('ReviewAgent runtime boundary', () => {
  it('routes retrieval, boundary evaluation, and submission through the runtime invoker', async () => {
    const runtime = new RecordingRuntime();
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({
      sessionId: 'boundary-session',
      equipmentId: 'PRA-401',
      anomalyCode: 'VIB-14'
    });

    expect('packet' in result).toBe(true);
    expect(runtime.calls.map(call => call.toolName)).toEqual([
      'retrieve_anomaly_context',
      'evaluate_evidence_boundary',
      'submit_review_advisory_packet'
    ]);
    expect(runtime.calls.every(call => call.sessionId === 'boundary-session' && call.traceId.length > 0)).toBe(true);
    expect(runtime.calls.every(call => call.arguments)).toBe(true);
  });

  it('cannot be constructed from a raw MCP client shape', () => {
    const rawMcpClient = {
      callTool: async (_request: { name: string; arguments: Record<string, unknown> }) => ({})
    };

    // @ts-expect-error ReviewAgent requires a runtime-bound invoker, not a raw MCP client.
    new ReviewAgent(rawMcpClient);
  });

  it('returns a stable blocked result when the session is quarantined', async () => {
    const runtime = new RecordingRuntime();
    runtime.responses.set('retrieve_anomaly_context', {
      status: 'blocked',
      code: 'protocol_66_quarantine',
      reason: 'Tool execution is disabled pending human review.'
    });
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({ sessionId: 'quarantine-session', equipmentId: 'PRA-401' });

    expect(result).toEqual({
      status: 'blocked',
      code: 'protocol_66_quarantine',
      reason: 'Tool execution is disabled pending human review.',
      submitted: false,
      humanReviewRequired: true,
      outputMode: 'blocked'
    });
    expect(runtime.calls).toHaveLength(1);
  });

  it('does not create an alternate normal response after a blocked tool', async () => {
    const runtime = new RecordingRuntime();
    runtime.responses.set('retrieve_anomaly_context', {
      status: 'blocked',
      code: 'protocol_66_quarantine',
      reason: 'Tool execution is disabled pending human review.'
    });
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({ sessionId: 'blocked-output-session', equipmentId: 'PRA-401' });

    expect('packet' in result).toBe(false);
    expect(result).toMatchObject({ status: 'blocked', outputMode: 'blocked', submitted: false });
    expect(runtime.calls.some(call => call.toolName === 'submit_review_advisory_packet')).toBe(false);
  });
});
