import type { RuntimeToolInvocation } from '../agent/reviewAgent.js';

export interface ShadowMcpEnvelope {
  protocol_version: '2026-07-28';
  method: 'tools/call';
  tool_name: string;
  arguments: Record<string, unknown>;
  metadata: {
    client_name: string;
    client_version: string;
    session_id: string;
    trace_id: string;
  };
}

export interface ShadowObservation {
  mode: 'shadow';
  authoritative: false;
  executed: false;
  shadow_allowed: boolean;
  reason: string;
  envelope: ShadowMcpEnvelope;
  authoritative_result_shape: string;
  shadow_result_shape?: string;
  result_match?: boolean;
}

export function buildShadowEnvelope(
  invocation: RuntimeToolInvocation,
  client = { name: 'praetor-mcp-shadow', version: '0.1.0' }
): ShadowMcpEnvelope {
  return {
    protocol_version: '2026-07-28',
    method: 'tools/call',
    tool_name: invocation.toolName,
    arguments: { ...invocation.arguments },
    metadata: {
      client_name: client.name,
      client_version: client.version,
      session_id: invocation.sessionId,
      trace_id: invocation.traceId
    }
  };
}

export function observeShadowCall(
  invocation: RuntimeToolInvocation,
  authoritativeResult: unknown,
  shadowResult?: unknown
): ShadowObservation {
  const envelope = buildShadowEnvelope(invocation);
  const shadowAllowed = invocation.actionType === 'retrieve';
  const observation: ShadowObservation = {
    mode: 'shadow',
    authoritative: false,
    executed: false,
    shadow_allowed: shadowAllowed,
    reason: shadowAllowed
      ? 'Read-only shadow comparison may be evaluated without changing the authoritative result.'
      : 'Shadow execution is disabled for write or submit actions; the authoritative path remains the only execution path.',
    envelope,
    authoritative_result_shape: resultShape(authoritativeResult)
  };

  if (shadowResult !== undefined && shadowAllowed) {
    observation.shadow_result_shape = resultShape(shadowResult);
    observation.result_match = observation.authoritative_result_shape === observation.shadow_result_shape;
  }

  return observation;
}

function resultShape(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value !== 'object') return typeof value;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().join(',');
}
