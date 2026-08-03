import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';

const expectedTools = [
  'evaluate_evidence_boundary',
  'search_maintenance_records',
  'get_equipment_history',
  'get_recent_anomalies',
  'get_recurring_patterns',
  'get_source_metadata',
  'retrieve_supporting_evidence',
  'retrieve_document_excerpt',
  'retrieve_prior_cases',
  'retrieve_anomaly_context',
  'submit_review_advisory_packet'
];

describe('MCP stdio smoke test', () => {
  it('lists and calls every tool over the real stdio transport', async () => {
    const client = new Client({ name: 'praetor-smoke-test', version: '0.1.0' });
    const transport = new StdioClientTransport({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['tsx', 'src/index.ts'],
      cwd: process.cwd()
    });

    await client.connect(transport);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map(tool => tool.name).sort()).toEqual(expectedTools.sort());

      const calls = [
        client.callTool({ name: 'search_maintenance_records', arguments: { equipment_id: 'PRA-401' } }),
        client.callTool({ name: 'get_equipment_history', arguments: { equipment_id: 'PRA-401' } }),
        client.callTool({ name: 'get_recent_anomalies', arguments: { equipment_id: 'PRA-403', days: 120 } }),
        client.callTool({ name: 'get_recurring_patterns', arguments: { equipment_id: 'PRA-401' } }),
        client.callTool({ name: 'get_source_metadata', arguments: { source_id: 'SRC-401-A' } }),
        client.callTool({ name: 'retrieve_supporting_evidence', arguments: { equipment_id: 'PRA-401', anomaly_code: 'VIB-14' } }),
        client.callTool({ name: 'retrieve_document_excerpt', arguments: { excerpt_id: 'EX-401-A' } }),
        client.callTool({ name: 'retrieve_prior_cases', arguments: { equipment_id: 'PRA-401', anomaly_code: 'VIB-14' } }),
        client.callTool({ name: 'retrieve_anomaly_context', arguments: { record_id: 'REC-403-A' } })
      ];
      const results = await Promise.all(calls);
      expect(results.every(result => result.content.length > 0)).toBe(true);

      const submission = await client.callTool({
        name: 'submit_review_advisory_packet',
        arguments: {
          packet_id: 'PKT-SMOKE',
          advisory_id: 'ADV-SMOKE',
          finding: 'Repeated vibration may indicate a recurring hydraulic pattern.',
          equipment_id: 'PRA-401',
          subsystem: 'hydraulic',
          component: 'pump seal',
          evidence_summary: 'Independent synthetic vibration observations.',
          source_ids: ['SRC-401-A', 'SRC-401-B'],
          provenance: 'Smoke-test synthetic source set.',
          supporting_evidence: [
            {
              source_id: 'SRC-401-A',
              source_type: 'synthetic_inspection_log',
              timestamp: '2026-07-01T00:00:00.000Z',
              excerpt: 'Synthetic vibration observation.',
              provenance_metadata: 'Smoke-test synthetic source.',
              uncertainty_notes: ['Synthetic test data only.'],
              independence_group: 'SRC-401-A',
              assessment: 'elevated'
            },
            {
              source_id: 'SRC-401-B',
              source_type: 'synthetic_followup_report',
              timestamp: '2026-07-02T00:00:00.000Z',
              excerpt: 'Independent synthetic follow-up observation.',
              provenance_metadata: 'Smoke-test synthetic source.',
              uncertainty_notes: ['Synthetic test data only.'],
              independence_group: 'SRC-401-B',
              assessment: 'elevated'
            }
          ],
          confidence: 0.7,
          uncertainty: ['Root cause is not established.'],
          contradiction_status: 'not_detected',
          circular_evidence_status: 'not_detected',
          human_review_required: true,
          advisory_only_statement: 'Evidence suggests this should be reviewed; advisory only.',
          guardrail_results: [{
            check: 'evidence_presence',
            guardrail: 'evidence_presence',
            status: 'pass',
            detail: 'Caller claim; governance recomputes this result.',
            severity: 'low',
            reason: 'Caller claim; governance recomputes this result.',
            affected_fields: ['supporting_evidence'],
            recommended_action: 'Review authoritative governance output.'
          }],
          integrity_verdict: 'doubtful'
        }
      });

      expect(submission.isError).not.toBe(true);
      expect(submission.content[0]?.type).toBe('text');
      const text = submission.content[0]?.type === 'text' ? submission.content[0].text : '';
      expect(text).toContain('integrity_verdict');
      expect(text).toContain('human_review_required');

      const rejectedWrite = await client.callTool({
        name: 'submit_review_advisory_packet',
        arguments: {
          advisory_id: 'ADV-GOVERNANCE-REJECTED',
          equipment_id: 'PRA-401',
          subsystem: 'hydraulic',
          component: 'pump seal',
          finding: 'Maintenance action required; confirmed failure.',
          evidence_summary: 'Synthetic evidence supplied for governance rejection.',
          source_ids: ['SRC-401-A', 'SRC-401-B'],
          provenance: 'Smoke-test synthetic source set.',
          supporting_evidence: [
            {
              source_id: 'SRC-401-A',
              source_type: 'synthetic_inspection_log',
              timestamp: '2026-07-01T00:00:00.000Z',
              excerpt: 'Synthetic vibration observation.',
              provenance_metadata: 'Smoke-test synthetic source.',
              uncertainty_notes: ['Synthetic test data only.'],
              independence_group: 'SRC-401-A',
              assessment: 'elevated'
            },
            {
              source_id: 'SRC-401-B',
              source_type: 'synthetic_followup_report',
              timestamp: '2026-07-02T00:00:00.000Z',
              excerpt: 'Independent synthetic follow-up observation.',
              provenance_metadata: 'Smoke-test synthetic source.',
              uncertainty_notes: ['Synthetic test data only.'],
              independence_group: 'SRC-401-B',
              assessment: 'elevated'
            }
          ],
          confidence: 0.7,
          uncertainty: ['Root cause is not established.'],
          contradiction_status: 'not_detected',
          circular_evidence_status: 'not_detected',
          human_review_required: true,
          advisory_only_statement: 'Evidence suggests this should be reviewed; advisory only.',
          guardrail_results: [{
            check: 'evidence_presence',
            guardrail: 'evidence_presence',
            status: 'pass',
            detail: 'Caller claim; governance recomputes this result.',
            severity: 'low',
            reason: 'Caller claim; governance recomputes this result.',
            affected_fields: ['supporting_evidence'],
            recommended_action: 'Review authoritative governance output.'
          }],
          integrity_verdict: 'safe'
        }
      });
      expect(rejectedWrite.isError).toBe(true);
      const rejectedWriteText = rejectedWrite.content[0]?.type === 'text' ? rejectedWrite.content[0].text : '';
      expect(JSON.parse(rejectedWriteText)).toEqual({
        error: {
          code: 'governance_rejected',
          detail: 'The packet violates a mission boundary and cannot be treated as a safe advisory.'
        }
      });
    } finally {
      await client.close();
    }
  }, 30_000);
});
