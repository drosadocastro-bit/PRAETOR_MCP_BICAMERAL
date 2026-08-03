import { describe, expect, it } from 'vitest';

import { buildShadowEnvelope, observeShadowCall } from '../src/shadow/mcpSpecShadow.js';
import type { RuntimeToolInvocation } from '../src/agent/reviewAgent.js';

const retrieveInvocation: RuntimeToolInvocation = {
  sessionId: 'shadow-session',
  traceId: 'shadow-trace',
  toolName: 'retrieve_anomaly_context',
  actionType: 'retrieve',
  argumentSummary: 'retrieve synthetic context',
  arguments: { equipment_id: 'PRA-401' }
};

describe('MCP specification shadow mode', () => {
  it('builds a self-describing 2026-07-28 read envelope', () => {
    expect(buildShadowEnvelope(retrieveInvocation)).toEqual({
      protocol_version: '2026-07-28',
      method: 'tools/call',
      tool_name: 'retrieve_anomaly_context',
      arguments: { equipment_id: 'PRA-401' },
      metadata: {
        client_name: 'praetor-mcp-shadow',
        client_version: '0.1.0',
        session_id: 'shadow-session',
        trace_id: 'shadow-trace'
      }
    });
  });

  it('compares read-only shapes without becoming authoritative', () => {
    const observation = observeShadowCall(retrieveInvocation, { record: null }, { record: null });

    expect(observation).toMatchObject({
      mode: 'shadow',
      authoritative: false,
      executed: false,
      shadow_allowed: true,
      result_match: true
    });
  });

  it('records shape differences without changing the authoritative result', () => {
    const observation = observeShadowCall(retrieveInvocation, { record: null }, { record: null, evidence: [] });

    expect(observation.result_match).toBe(false);
    expect(observation.authoritative_result_shape).toBe('record');
    expect(observation.shadow_result_shape).toBe('evidence,record');
  });

  it('never permits shadow execution for submission', () => {
    const observation = observeShadowCall({
      ...retrieveInvocation,
      toolName: 'submit_review_advisory_packet',
      actionType: 'submit'
    }, { status: 'stored' }, { status: 'must never be executed' });

    expect(observation).toMatchObject({
      authoritative: false,
      executed: false,
      shadow_allowed: false
    });
    expect(observation.shadow_result_shape).toBeUndefined();
    expect(observation.reason).toContain('write or submit');
  });
});
