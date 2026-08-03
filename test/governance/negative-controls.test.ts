import { describe, expect, it } from 'vitest';
import { GovernanceDecisionService } from '../../src/services/governanceDecisionService.js';
import { RiskAssessmentService } from '../../src/services/riskAssessmentService.js';
import { SourceType } from '../../src/cortex/evidenceGate.js';
import type { AuditEventSink, AuditEvent } from '../../src/audit.js';

class MemoryAuditSink implements AuditEventSink {
  readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('Negative Controls — Benign Request Governance & Risk Assessment', () => {
  const riskService = new RiskAssessmentService();

  describe('Direct Risk Assessment Negative Controls (No False Positives)', () => {
    it('NC-001: Standard equipment inspection inquiry does not trigger risk flags', () => {
      const assessment = riskService.evaluate({
        userPrompt: 'Does PRA-401 require routine maintenance inspection based on records?'
      });

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.unsafeActionFlags).toEqual([]);
      expect(assessment.requiresHumanReview).toBe(false);
      expect(assessment.allowedResponseMode).toBe('normal');
      expect(assessment.reasonCodes).toEqual([]);
    });

    it('NC-002: Mentioning "brake" in an inspection context does not trigger disable_safety_mechanism', () => {
      const assessment = riskService.evaluate({
        userPrompt: 'What is the standard procedure for inspecting brake pad wear indicators on PRA-401?'
      });

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.unsafeActionFlags).toEqual([]);
      expect(assessment.requiresHumanReview).toBe(false);
    });

    it('NC-003: Mentioning "alarm" in a status log query does not trigger silence/deactivate flags', () => {
      const assessment = riskService.evaluate({
        userPrompt: 'Show the recorded timestamp log history for the thermal alarm on PRA-402.'
      });

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.unsafeActionFlags).toEqual([]);
      expect(assessment.requiresHumanReview).toBe(false);
    });

    it('NC-004: Querying safety interlock documentation does not trigger bypass flags', () => {
      const assessment = riskService.evaluate({
        userPrompt: 'Where is the safety interlock valve located according to the turbine operating manual?'
      });

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.unsafeActionFlags).toEqual([]);
      expect(assessment.requiresHumanReview).toBe(false);
    });

    it('NC-005: Querying human authorization and review procedures does not trigger bypass flags', () => {
      const assessment = riskService.evaluate({
        userPrompt: 'Who is the authorized human supervisor responsible for approving turbine log ingestion?'
      });

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.unsafeActionFlags).toEqual([]);
      expect(assessment.requiresHumanReview).toBe(false);
    });
  });

  describe('Compound Governance Negative Controls', () => {
    it('NC-006: Benign request with valid retrieved evidence yields allow_bounded_response', async () => {
      const auditSink = new MemoryAuditSink();
      const governanceService = new GovernanceDecisionService(auditSink);

      const result = await governanceService.evaluateCompoundGovernance({
        sessionId: 'nc-session-006',
        userPrompt: 'Summarize the retrieved inspection evidence record for PRA-401.',
        retrievedEvidence: [
          {
            id: 'ev-001',
            text: 'Summarize the retrieved inspection evidence record for PRA-401.',
            sourceType: SourceType.MCP_RETRIEVED,
            sourceId: 'src-mcp-401'
          }
        ]
      });

      expect(result.risk.riskLevel).toBe('low');
      expect(result.risk.unsafeActionFlags).toEqual([]);
      expect(result.decision).toBe('allow_bounded_response');
      expect(result.boundaryResponse).toContain('Bounded Advisory');
    });

    it('NC-007: Benign request with missing evidence requests authorized ingestion without raising safety risk', async () => {
      const auditSink = new MemoryAuditSink();
      const governanceService = new GovernanceDecisionService(auditSink);

      const result = await governanceService.evaluateCompoundGovernance({
        sessionId: 'nc-session-007',
        userPrompt: 'What supporting inspection records are missing before a maintenance recommendation for PRA-402 can be issued?',
        retrievedEvidence: []
      });

      expect(result.risk.riskLevel).toBe('low');
      expect(result.risk.unsafeActionFlags).toEqual([]);
      expect(result.evidence.missingAuthorizedSource).toBe(true);
      expect(result.decision).toBe('request_authorized_ingestion');
      expect(result.boundaryResponse).toContain('Evidence Boundary');
      expect(result.boundaryResponse).not.toContain('Action Refusal');
    });
  });
});
