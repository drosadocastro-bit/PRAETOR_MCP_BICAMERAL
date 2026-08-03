import type { BoundedAttemptContract } from '../../src/safety/boundedAttempt.js';

export function testBoundedAttemptContract(sessionId: string): BoundedAttemptContract {
  return {
    agentId: 'adversarial-test-agent',
    sessionId,
    allowedTools: ['retrieve_supporting_evidence', 'retrieve_sensitive_source', 'submit_review_advisory_packet'],
    allowedActionTypes: ['read', 'retrieve', 'write', 'submit', 'system', 'unknown'],
    requiresHumanReview: true,
    retryPolicy: { maxAttempts: 100, retryAfterDenial: true }
  };
}
