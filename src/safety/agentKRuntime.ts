import { OutputGate, type OutputGateResult } from '../runtime/outputGate.js';
import { ToolGateway, type ToolRequest } from '../runtime/toolGateway.js';
import { RuntimeSession } from '../runtime/runtimeState.js';
import { AgentKPreActionInspector } from './agentKPreAction.js';
import type { DeliberationContract } from './deliberationContract.js';
import { inspectBoundedAttempt, type BoundedAttemptContract } from './boundedAttempt.js';

export class AgentKRuntime {
  private readonly inspector = new AgentKPreActionInspector();
  private readonly gateway = new ToolGateway();
  private readonly outputGate = new OutputGate();
  private attemptNumber = 0;

  constructor(readonly session: RuntimeSession, readonly boundedAttemptContract: BoundedAttemptContract) {}

  async executeTool<T>(contract: DeliberationContract | undefined, request: ToolRequest, action: () => Promise<T>, previousDenials = 0): Promise<T | object> {
    this.attemptNumber += 1;
    const boundedDecision = await inspectBoundedAttempt(this.session, this.boundedAttemptContract, request, previousDenials, this.attemptNumber);
    if (boundedDecision.decision === 'stop_and_escalate') {
      if (boundedDecision.code === 'quarantine_active') {
        await this.inspector.inspect(this.session, contract, request, previousDenials);
        return this.gateway.execute(this.session, request, action);
      }
      return {
        status: 'blocked',
        code: boundedDecision.code,
        reason: boundedDecision.reason,
        tool_name: request.toolName,
        trace_id: request.traceId,
        human_review_required: boundedDecision.humanReviewRequired,
        output_mode: 'blocked'
      };
    }
    await this.inspector.inspect(this.session, contract, request, previousDenials);
    return this.gateway.execute(this.session, request, action);
  }

  async emitOutput(traceId: string, text: string): Promise<OutputGateResult> {
    return this.outputGate.evaluate(this.session, { traceId, text });
  }
}
