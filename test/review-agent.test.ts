import { describe, expect, it } from 'vitest';

import { ReviewAgent, type RuntimeToolInvocation, type RuntimeToolInvoker } from '../src/agent/reviewAgent.js';

class FakeRuntime implements RuntimeToolInvoker {
  readonly calls: RuntimeToolInvocation[] = [];
  boundaryDecision = 'allow';
  blockedCall?: string;
  contextEvidence?: Array<Record<string, unknown>>;

  async callTool(request: RuntimeToolInvocation): Promise<unknown> {
    this.calls.push(request);
    if (request.toolName === this.blockedCall) {
      return { status: 'blocked', code: 'protocol_66_quarantine', reason: 'Quarantine is active.' };
    }
    if (request.toolName === 'retrieve_anomaly_context') {
      return {
        record: {
          record_id: 'REC-401-A',
          equipment_id: 'PRA-401',
          subsystem: 'hydraulic',
          component: 'pump seal',
          event_date: '2026-07-01T00:00:00.000Z',
          event_type: 'inspection',
          anomaly_code: 'VIB-14',
          severity: 'medium',
          technician_note: 'Synthetic vibration observation.',
          corrective_action: 'Logged for review.',
          recurrence_count: 2,
          source_id: 'SRC-401-A',
          source_type: 'synthetic_inspection_log',
          confidence_hint: 0.6,
          independence_group: 'group-401-a',
          assessment: 'elevated'
        },
        evidence: this.contextEvidence ?? [{
          source_id: 'SRC-401-A',
          source_type: 'synthetic_inspection_log',
          timestamp: '2026-07-01T00:00:00.000Z',
          excerpt: 'Synthetic vibration observation.',
          provenance_metadata: 'Synthetic test source.',
          uncertainty_notes: ['Root cause is not established.'],
          independence_group: 'group-401-a',
          assessment: 'elevated'
        }]
      };
    }
    if (request.toolName === 'submit_review_advisory_packet') {
      return { integrity_verdict: 'doubtful', human_review_required: true };
    }
    if (request.toolName === 'evaluate_evidence_boundary') {
      return { decision: this.boundaryDecision };
    }
    throw new Error(`Unexpected tool: ${request.toolName}`);
  }
}

describe('ReviewAgent', () => {
  it('builds a bounded review packet through the host runtime', async () => {
    const runtime = new FakeRuntime();
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({
      sessionId: 'review-agent-test',
      equipmentId: 'PRA-401',
      anomalyCode: 'VIB-14',
      question: 'What does this synthetic pattern suggest?'
    });

    if (!('packet' in result)) {
      throw new Error(`ReviewAgent was blocked: ${result.reason}`);
    }
    expect(runtime.calls.map(call => call.toolName)).toEqual([
      'retrieve_anomaly_context',
      'evaluate_evidence_boundary',
      'submit_review_advisory_packet'
    ]);
    expect(runtime.calls.every(call => call.sessionId === 'review-agent-test' && call.traceId.length > 0)).toBe(true);
    const boundaryCall = runtime.calls.find(call => call.toolName === 'evaluate_evidence_boundary');
    expect(boundaryCall?.arguments.comparison_handoff).toMatchObject({
      handoff_type: 'untrusted_comparison_analysis',
      authoritative: false,
      independent_corroboration: false,
      human_review_required: true
    });
    expect(result.packet.human_review_required).toBe(true);
    expect(result.packet.finding).toContain('should be reviewed by a human');
    expect(result.packet.finding).not.toMatch(/must replace|confirmed failure|safe to operate/i);
    expect(result.packet.advisory_only_statement).toContain('no maintenance action is authorized');
    expect(result.submitted).toEqual({ integrity_verdict: 'doubtful', human_review_required: true });
  });

  it('does not submit when the evidence boundary refuses preparation', async () => {
    const runtime = new FakeRuntime();
    runtime.boundaryDecision = 'refuse_evidence_based_answer';
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({
      sessionId: 'review-agent-refused',
      equipmentId: 'PRA-401',
      anomalyCode: 'VIB-14'
    });
    expect(result).toMatchObject({ status: 'blocked', submitted: false, humanReviewRequired: true });
    expect(runtime.calls.map(call => call.toolName)).toEqual([
      'retrieve_anomaly_context',
      'evaluate_evidence_boundary'
    ]);
  });

  it('stops without fake evidence when runtime blocks retrieval', async () => {
    const runtime = new FakeRuntime();
    runtime.blockedCall = 'retrieve_anomaly_context';
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({ sessionId: 'review-agent-blocked', equipmentId: 'PRA-401' });

    expect(result).toMatchObject({ status: 'blocked', submitted: false, outputMode: 'blocked' });
    expect(runtime.calls.map(call => call.toolName)).toEqual(['retrieve_anomaly_context']);
  });

  it('refuses comparison handoff consumption when provenance is incomplete', async () => {
    const runtime = new FakeRuntime();
    runtime.contextEvidence = [{
      source_id: 'SRC-401-A',
      source_type: 'synthetic_inspection_log',
      timestamp: '2026-07-01T00:00:00.000Z',
      excerpt: 'Synthetic vibration observation.',
      provenance_metadata: '',
      uncertainty_notes: ['Root cause is not established.'],
      independence_group: 'group-401-a',
      assessment: 'elevated'
    }];
    const agent = new ReviewAgent(runtime);

    const result = await agent.buildAndSubmit({ sessionId: 'review-agent-incomplete', equipmentId: 'PRA-401' });

    expect(result).toMatchObject({ code: 'comparison_refused', submitted: false, humanReviewRequired: true });
    expect(runtime.calls.map(call => call.toolName)).toEqual(['retrieve_anomaly_context']);
  });
});
