import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

import { ReviewAgent, type ReviewRequest, type ReviewResult, type ReviewBlockedResult, type RuntimeToolInvocation, type RuntimeToolInvoker } from './reviewAgent.js';
import { RuntimeSession } from '../runtime/runtimeState.js';
import { AgentKRuntime } from '../safety/agentKRuntime.js';
import type { DeliberationContract } from '../safety/deliberationContract.js';
import type { ToolRequest } from '../runtime/toolGateway.js';
import type { BoundedAttemptContract } from '../safety/boundedAttempt.js';

export const REVIEW_AGENT_CONTRACT: BoundedAttemptContract = {
  agentId: 'review-agent',
  sessionId: '',
  allowedTools: ['retrieve_anomaly_context', 'evaluate_evidence_boundary', 'submit_review_advisory_packet'],
  allowedActionTypes: ['retrieve', 'submit'],
  requiresHumanReview: true,
  retryPolicy: { maxAttempts: 3, retryAfterDenial: false }
};

interface TextContent {
  type: 'text';
  text: string;
}

function isTextContent(value: unknown): value is TextContent {
  return typeof value === 'object'
    && value !== null
    && 'type' in value
    && value.type === 'text'
    && 'text' in value
    && typeof value.text === 'string';
}

export class StdioPraetorToolClient {
  constructor(readonly client: Client) {}

  async callTool(request: { name: string; arguments: Record<string, unknown> }): Promise<unknown> {
    const result = await this.client.callTool(request);
    const text = result.content.find(isTextContent)?.text;
    if (!text) {
      throw new Error(`PRAETOR MCP tool returned no JSON text: ${request.name}.`);
    }
    if (result.isError) {
      throw new Error(`PRAETOR MCP tool failed: ${request.name} (${text.slice(0, 500)}).`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`PRAETOR MCP tool returned invalid JSON: ${request.name}.`);
    }
    return payload;
  }
}

export class RuntimeBoundToolInvoker implements RuntimeToolInvoker {
  constructor(
    private readonly runtime: AgentKRuntime,
    private readonly client: StdioPraetorToolClient
  ) {}

  callTool(request: RuntimeToolInvocation): Promise<unknown> {
    if (request.sessionId !== this.runtime.session.sessionId) {
      return Promise.resolve({
        status: 'blocked',
        code: 'session_identity_mismatch',
        reason: 'The request session does not match the runtime-bound session.',
        tool_name: request.toolName,
        trace_id: request.traceId
      });
    }
    const contract: DeliberationContract = {
      trace_id: request.traceId,
      session_id: request.sessionId,
      intended_action: request.argumentSummary,
      requested_tool: request.toolName,
      action_type: request.actionType,
      reason_summary: 'Build a synthetic advisory packet for human review.',
      expected_output_type: request.actionType === 'submit' ? 'review-only advisory packet' : 'synthetic anomaly context',
      touches_restricted_resource: false,
      requires_human_review: true,
      retry_of_denied_action: false
    };
    const toolRequest: ToolRequest = {
      traceId: request.traceId,
      toolName: request.toolName,
      actionType: request.actionType,
      sensitive: false,
      argumentSummary: request.argumentSummary
    };
    return this.runtime.executeTool(contract, toolRequest, () => this.client.callTool({
      name: request.toolName,
      arguments: request.arguments
    }));
  }
}

export interface ConnectedReviewAgent {
  agent: ReviewAgent;
  session: RuntimeSession;
  client: Client;
  transport: StdioClientTransport;
  run(request: ReviewRequest): Promise<ReviewResult | ReviewBlockedResult>;
  close(): Promise<void>;
}

export async function connectStdioReviewAgent(options: {
  cwd?: string;
  sessionId?: string;
  command?: string;
} = {}): Promise<ConnectedReviewAgent> {
  const client = new Client({ name: 'praetor-review-agent', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: options.command ?? (process.platform === 'win32' ? 'npx.cmd' : 'npx'),
    args: ['tsx', 'src/index.ts'],
    cwd: options.cwd ?? process.cwd()
  });
  await client.connect(transport);

  const toolClient = new StdioPraetorToolClient(client);
  const session = new RuntimeSession(options.sessionId ?? 'review-agent-stdio');
  const runtime = new AgentKRuntime(session, { ...REVIEW_AGENT_CONTRACT, sessionId: session.sessionId });
  const agent = new ReviewAgent(new RuntimeBoundToolInvoker(runtime, toolClient));
  return {
    agent,
    session,
    client,
    transport,
    run: request => agent.buildAndSubmit(request),
    close: () => client.close()
  };
}
