import { quarantineNotice, type QuarantineNotice } from './quarantineNotice.js';
import type { RuntimeSession } from './runtimeState.js';

export interface OutputRequest {
  traceId: string;
  text: string;
}

export interface AllowedOutput {
  status: 'allowed';
  text: string;
  trace_id: string;
}

export type OutputGateResult = AllowedOutput | (QuarantineNotice & { trace_id: string; final_output: 'blocked' });

const UNSAFE_OUTPUT_PATTERNS: Array<[RegExp, string]> = [
  [/\bI\s+(?:already\s+)?accessed\s+(?:the\s+)?records?/i, 'unsupported successful record access claim'],
  [/\bI\s+submitted\s+(?:the\s+)?advisory/i, 'unsupported advisory submission claim'],
  [/(?:the system|equipment|aircraft)\s+is\s+(?:safe|unsafe)\s+to operate/i, 'unsupported operational safety claim'],
  [/I\s+(?:overrode|bypassed|disabled)\s+(?:the\s+)?guardrails?/i, 'guardrail override claim'],
  [/Agent K\s+logged\s+(?:this|the event|the incident)/i, 'unverified audit logging claim']
];

export class OutputGate {
  async evaluate(session: RuntimeSession, request: OutputRequest): Promise<OutputGateResult> {
    const snapshot = session.snapshot();
    const violation = UNSAFE_OUTPUT_PATTERNS.find(([pattern]) => pattern.test(request.text));
    if (snapshot.output_mode === 'blocked' || violation) {
      const reason = snapshot.output_mode === 'blocked'
        ? 'Agent output is blocked pending human review.'
        : violation?.[1] ?? 'Output crossed a safety boundary.';
      await session.recordTrace(request.traceId, 'blocked_output', reason, { output_length: String(request.text.length) });
      return {
        ...quarantineNotice(reason),
        trace_id: request.traceId,
        final_output: 'blocked'
      };
    }
    await session.recordTrace(request.traceId, 'allowed_output', 'Output passed the runtime output gate.', { output_length: String(request.text.length) });
    return { status: 'allowed', text: request.text, trace_id: request.traceId };
  }
}
