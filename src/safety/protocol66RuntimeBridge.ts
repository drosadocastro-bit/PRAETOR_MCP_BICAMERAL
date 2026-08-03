import {
  classifyProtocol66,
  classifyProtocol66Text,
  type Protocol66Decision,
  type Protocol66Event,
  type Protocol66Policy
} from '../protocol66.js';
import { RuntimeSession } from '../runtime/runtimeState.js';

export class Protocol66RuntimeBridge {
  constructor(private readonly policy: Protocol66Policy = {}) {}

  async inspectText(session: RuntimeSession, text: string, occurredAt: string, interactionIndex: number): Promise<Protocol66Decision> {
    const event = classifyProtocol66Text(text, occurredAt, interactionIndex);
    return this.inspectEvent(session, event);
  }

  async inspectEvent(session: RuntimeSession, event?: Protocol66Event): Promise<Protocol66Decision> {
    const events = event ? [...session.events, event] : session.events;
    const decision = classifyProtocol66(events, this.policy);
    await session.applyProtocol66(decision);
    return decision;
  }
}
