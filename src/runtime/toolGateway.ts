import { quarantineNotice, type QuarantineNotice } from './quarantineNotice.js';
import type { RuntimeSession } from './runtimeState.js';

export type ToolActionType = 'read' | 'retrieve' | 'write' | 'submit' | 'system' | 'unknown';

export interface ToolRequest {
  traceId: string;
  toolName: string;
  actionType: ToolActionType;
  sensitive: boolean;
  argumentSummary: string;
}

export interface BlockedToolResult extends QuarantineNotice {
  tool_name: string;
  trace_id: string;
}

export class ToolGateway {
  async execute<T>(session: RuntimeSession, request: ToolRequest, action: () => Promise<T>): Promise<T | BlockedToolResult> {
    const snapshot = session.snapshot();
    if (snapshot.tool_access === 'disabled' || ((snapshot.state === 'ELEVATED' || snapshot.state === 'DEGRADED') && request.sensitive)) {
      const blocked: BlockedToolResult = {
        ...quarantineNotice(
          snapshot.state === 'ELEVATED' || snapshot.state === 'DEGRADED'
            ? 'Sensitive tool access is disabled while the session is elevated.'
            : 'Tool execution is disabled pending human review.',
          'blocked'
        ),
        tool_name: request.toolName,
        trace_id: request.traceId
      };
      await this.recordBlockedCall(session, request, blocked.reason);
      return blocked;
    }
    return action();
  }

  private async recordBlockedCall(session: RuntimeSession, request: ToolRequest, reason: string): Promise<void> {
    await session.recordTrace(request.traceId, 'blocked_tool_call', reason, {
      tool: request.toolName,
      action_type: request.actionType,
      sensitive: String(request.sensitive)
    });
  }
}
