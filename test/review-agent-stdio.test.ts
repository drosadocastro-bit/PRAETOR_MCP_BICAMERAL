import { describe, expect, it } from 'vitest';

import { connectStdioReviewAgent, RuntimeBoundToolInvoker, StdioPraetorToolClient } from '../src/agent/stdioReviewAgent.js';
import { AgentKRuntime } from '../src/safety/agentKRuntime.js';
import { RuntimeSession } from '../src/runtime/runtimeState.js';
import { testBoundedAttemptContract } from './support/boundedRuntime.js';

describe('ReviewAgent stdio integration', () => {
  it('runs the bounded review flow against the real local MCP server', async () => {
    const connection = await connectStdioReviewAgent({
      cwd: process.cwd(),
      sessionId: 'review-agent-stdio-test'
    });

    try {
      const result = await connection.run({
        sessionId: 'review-agent-stdio-test',
        equipmentId: 'PRA-401',
        anomalyCode: 'VIB-14',
        question: 'What does this synthetic pattern suggest for human review?'
      });

      if (!('packet' in result)) {
        throw new Error(`ReviewAgent was blocked: ${result.reason}`);
      }
      expect(result.packet.human_review_required).toBe(true);
      expect(result.packet.equipment_id).toBe('PRA-401');
      expect(result.packet.source_ids?.length).toBeGreaterThan(0);
      expect(result.packet.advisory_only_statement).toContain('no maintenance action is authorized');
      expect(result.submitted).toMatchObject({
        status: 'stored',
        assessment: {
          verdict: expect.any(String),
          human_review_required: true
        },
        packet: {
          human_review_required: true
        }
      });
      expect(connection.session.trace().map(event => event.event_type)).toEqual([
        'pre_action_inspection',
        'pre_action_inspection',
        'pre_action_inspection'
      ]);
    } finally {
      await connection.close();
    }
  }, 30_000);

  it('blocks a request whose session identity differs from the bound runtime', async () => {
    const session = new RuntimeSession('bound-session');
    const runtime = new AgentKRuntime(session, testBoundedAttemptContract(session.sessionId));
    const client = { callTool: async () => { throw new Error('raw MCP client must not be called'); } } as never;
    const invoker = new RuntimeBoundToolInvoker(runtime, new StdioPraetorToolClient(client));

    const result = await invoker.callTool({
      sessionId: 'other-session',
      traceId: 'other-session-context',
      toolName: 'retrieve_anomaly_context',
      actionType: 'retrieve',
      argumentSummary: 'context for PRA-401',
      arguments: { equipment_id: 'PRA-401' }
    });

    expect(result).toMatchObject({ status: 'blocked', code: 'session_identity_mismatch' });
  });
});
