import type { RuntimeSession } from '../runtime/runtimeState.js';

export interface HumanRecoveryAuthority {
  authorize(sessionId: string, recoveryToken: string): Promise<boolean>;
}

export class RecoveryBoundary {
  async request(session: RuntimeSession, reason: string): Promise<void> {
    if (session.currentState !== 'QUARANTINE_LOCKED' && session.currentState !== 'HUMAN_REVIEW_REQUIRED') {
      throw new Error('Recovery is only available for a quarantined or human-review session.');
    }
    await session.transition('RECOVERY_PENDING', `Human recovery requested: ${reason}`);
  }

  async complete(session: RuntimeSession, recoveryToken: string, authority: HumanRecoveryAuthority): Promise<void> {
    if (session.currentState !== 'RECOVERY_PENDING') {
      throw new Error('Recovery must be requested before it can be completed.');
    }
    if (!recoveryToken || !(await authority.authorize(session.sessionId, recoveryToken))) {
      await session.recordTrace(`recovery-denied-${session.sessionId}`, 'recovery_denied', 'Human recovery authorization failed.', {});
      throw new Error('Human recovery authorization failed.');
    }
    await session.recordTrace(`recovery-approved-${session.sessionId}`, 'recovery_approved', 'Out-of-band human recovery was authorized.', {});
    await session.transition('ACTIVE', 'Out-of-band human recovery completed.');
  }
}
