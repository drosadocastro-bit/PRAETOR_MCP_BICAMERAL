import { McpServer } from '@modelcontextprotocol/server';
import type { CallToolResult } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import {
  documentExcerpts,
  findRecordById,
  findSourceById,
  maintenanceRecords,
  priorCases,
  REFERENCE_DATE,
  sourceMetadata
} from './data.js';
import { evaluateAdvisoryPacket } from './governance.js';
import { analyzeEvidenceIndependence } from './dependencyGraph.js';
import { AdvisoryPacketSchema, validateAdvisoryPacket } from './schema.js';
import { appendAdvisoryPacket } from './storage.js';
import type { DatasetAdapter } from './adapters/DatasetAdapter.js';
import { getActiveDatasetAdapter } from './adapters/adapterRegistry.js';
import { adapterCall, validateEvidence, validateExcerpt, validatePatterns, validatePriorCases, validateRecord, validateRecords, validateRecentAnomalies, validateSource } from './adapters/adapterValidation.js';
import { PraetorError, safeTool } from './errors.js';
import { GovernanceDecisionService } from './services/governanceDecisionService.js';
import { CortexEvidenceGate, SourceType } from './cortex/evidenceGate.js';
import { FileAuditEventSink, type AuditEventSink } from './audit.js';
import type {
  AdvisoryPacketDraft,
  AdvisoryPacketRecord,
  EvidenceItem,
  SyntheticDocumentExcerpt,
  SyntheticMaintenanceRecord,
  SyntheticPriorCase,
  SyntheticSourceMetadata
} from './types.js';

function jsonResult(payload: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function maintenanceRecordToEvidence(record: SyntheticMaintenanceRecord): EvidenceItem {
  const source = findSourceById(record.source_id);
  return {
    source_id: record.source_id,
    source_type: record.source_type,
    timestamp: record.event_date,
    excerpt: `${record.event_type}: ${record.technician_note}`,
    provenance_metadata: source?.provenance_metadata ?? 'Synthetic record provenance.',
    uncertainty_notes: source?.uncertainty_notes ?? [],
    independence_group: record.independence_group,
    assessment: record.assessment
  };
}

function excerptToEvidence(excerpt: SyntheticDocumentExcerpt): EvidenceItem {
  return {
    source_id: excerpt.source_id,
    source_type: excerpt.source_type,
    timestamp: excerpt.timestamp,
    excerpt: excerpt.excerpt,
    provenance_metadata: excerpt.provenance_metadata,
    uncertainty_notes: excerpt.uncertainty_notes,
    independence_group: excerpt.independence_group
  };
}

function priorCaseToEvidence(priorCase: SyntheticPriorCase): EvidenceItem {
  return {
    source_id: priorCase.source_id,
    source_type: priorCase.source_type,
    timestamp: priorCase.timestamp,
    excerpt: priorCase.excerpt,
    provenance_metadata: priorCase.provenance_metadata,
    uncertainty_notes: priorCase.uncertainty_notes,
    independence_group: priorCase.independence_group
  };
}

function sourceSummary(source: SyntheticSourceMetadata | undefined) {
  if (!source) {
    return null;
  }

  return {
    source_id: source.source_id,
    source_type: source.source_type,
    timestamp: source.timestamp,
    title: source.title,
    provenance_metadata: source.provenance_metadata,
    independence_group: source.independence_group,
    uncertainty_notes: source.uncertainty_notes
  };
}

function toLower(value: string): string {
  return value.toLowerCase();
}

function recordMatchesQuery(record: SyntheticMaintenanceRecord, query: string): boolean {
  const haystack = [
    record.record_id,
    record.equipment_id,
    record.subsystem,
    record.component,
    record.event_type,
    record.anomaly_code,
    record.technician_note,
    record.corrective_action
  ]
    .join(' ')
    .toLowerCase();

  return toLower(query)
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term));
}

export function searchMaintenanceRecordsData(args: {
  query?: string;
  equipment_id?: string;
  subsystem?: string;
  component?: string;
  anomaly_code?: string;
  severity?: string;
  limit?: number;
}): SyntheticMaintenanceRecord[] {
  const query = args.query?.trim();
  return maintenanceRecords
    .filter(record => (query ? recordMatchesQuery(record, query) : true))
    .filter(record => (args.equipment_id ? record.equipment_id === args.equipment_id : true))
    .filter(record => (args.subsystem ? record.subsystem === args.subsystem : true))
    .filter(record => (args.component ? record.component === args.component : true))
    .filter(record => (args.anomaly_code ? record.anomaly_code === args.anomaly_code : true))
    .filter(record => (args.severity ? record.severity === args.severity : true))
    .slice(0, args.limit ?? 10);
}

export function collectSupportingEvidence(args: { equipment_id?: string; anomaly_code?: string; finding?: string }): EvidenceItem[] {
  const recordMatches = maintenanceRecords.filter(record =>
    [args.equipment_id, args.anomaly_code, args.finding]
      .filter(Boolean)
      .every(term => {
        const needle = String(term).toLowerCase();
        return [record.equipment_id, record.anomaly_code, record.technician_note, record.event_type].some(field => field.toLowerCase().includes(needle));
      })
  );

  const excerptMatches = documentExcerpts.filter(excerpt =>
    [args.equipment_id, args.anomaly_code, args.finding]
      .filter(Boolean)
      .every(term => {
        const needle = String(term).toLowerCase();
        return [excerpt.equipment_id, excerpt.anomaly_code, excerpt.excerpt].some(field => field.toLowerCase().includes(needle));
      })
  );

  const priorCaseMatches = priorCases.filter(priorCase =>
    [args.equipment_id, args.anomaly_code, args.finding]
      .filter(Boolean)
      .every(term => {
        const needle = String(term).toLowerCase();
        return [priorCase.equipment_id, priorCase.anomaly_code, priorCase.finding, priorCase.excerpt].some(field => field.toLowerCase().includes(needle));
      })
  );

  return [
    ...recordMatches.map(maintenanceRecordToEvidence),
    ...excerptMatches.map(excerptToEvidence),
    ...priorCaseMatches.map(priorCaseToEvidence)
  ];
}

export function buildEquipmentHistory(equipment_id: string): SyntheticMaintenanceRecord[] {
  return maintenanceRecords.filter(record => record.equipment_id === equipment_id).sort((left, right) => left.event_date.localeCompare(right.event_date));
}

export function buildRecentAnomalies(args: { equipment_id?: string; subsystem?: string; days?: number }): { reference_date: string; window_start: string; anomalies: SyntheticMaintenanceRecord[] } {
  const days = args.days ?? 30;
  const windowStart = new Date(REFERENCE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
  const anomalies = maintenanceRecords.filter(record => new Date(record.event_date) >= windowStart).filter(record => (args.equipment_id ? record.equipment_id === args.equipment_id : true)).filter(record => (args.subsystem ? record.subsystem === args.subsystem : true));

  return { reference_date: REFERENCE_DATE.toISOString(), window_start: windowStart.toISOString(), anomalies };
}

export function buildRecurringPatterns(args: { equipment_id?: string; component?: string }): Array<{ anomaly_code: string; equipment_id: string; component: string; count: number; recurrence_count_max: number; average_confidence_hint: number }> {
  const matching = maintenanceRecords.filter(record => (args.equipment_id ? record.equipment_id === args.equipment_id : true)).filter(record => (args.component ? record.component === args.component : true));
  return matching.reduce<Array<{ anomaly_code: string; equipment_id: string; component: string; count: number; recurrence_count_max: number; average_confidence_hint: number }>>((accumulator, record) => {
    const existing = accumulator.find(item => item.anomaly_code === record.anomaly_code && item.equipment_id === record.equipment_id && item.component === record.component);
    if (!existing) {
      accumulator.push({
        anomaly_code: record.anomaly_code,
        equipment_id: record.equipment_id,
        component: record.component,
        count: 1,
        recurrence_count_max: record.recurrence_count,
        average_confidence_hint: record.confidence_hint
      });
    } else {
      existing.count += 1;
      existing.recurrence_count_max = Math.max(existing.recurrence_count_max, record.recurrence_count);
      existing.average_confidence_hint = Number(((existing.average_confidence_hint * (existing.count - 1) + record.confidence_hint) / existing.count).toFixed(3));
    }
    return accumulator;
  }, []);
}

export function buildSourceMetadata(source_id: string): ReturnType<typeof sourceSummary> {
  return sourceSummary(findSourceById(source_id));
}

export function buildDocumentExcerpt(source_id?: string, excerpt_id?: string): SyntheticDocumentExcerpt | null {
  return documentExcerpts.find(excerpt => (source_id ? excerpt.source_id === source_id : true) && (excerpt_id ? excerpt.excerpt_id === excerpt_id : true)) ?? null;
}

export function buildPriorCases(args: { equipment_id?: string; anomaly_code?: string }): SyntheticPriorCase[] {
  return priorCases.filter(priorCase => (args.equipment_id ? priorCase.equipment_id === args.equipment_id : true)).filter(priorCase => (args.anomaly_code ? priorCase.anomaly_code === args.anomaly_code : true));
}

export function buildAnomalyContext(args: { record_id?: string; equipment_id?: string; anomaly_code?: string }): {
  record: SyntheticMaintenanceRecord | null;
  source: ReturnType<typeof sourceSummary>;
  evidence: EvidenceItem[];
  prior_cases: SyntheticPriorCase[];
} {
  const record = args.record_id ? findRecordById(args.record_id) : maintenanceRecords.find(entry => (args.equipment_id ? entry.equipment_id === args.equipment_id : true) && (args.anomaly_code ? entry.anomaly_code === args.anomaly_code : true));
  const evidence = collectSupportingEvidence({ equipment_id: args.equipment_id ?? record?.equipment_id, anomaly_code: args.anomaly_code ?? record?.anomaly_code, finding: record?.technician_note });

  return {
    record: record ?? null,
    source: record ? sourceSummary(findSourceById(record.source_id)) : null,
    evidence,
    prior_cases: priorCases.filter(priorCase => (record ? priorCase.equipment_id === record.equipment_id : true) && (record ? priorCase.anomaly_code === record.anomaly_code : true))
  };
}

export function registerPraetorTools(server: McpServer, adapter: DatasetAdapter = getActiveDatasetAdapter(), auditSink: AuditEventSink = new FileAuditEventSink()): void {
  const governanceService = new GovernanceDecisionService(auditSink);

  server.registerTool(
    'search_maintenance_records',
    {
      description: 'Search the synthetic maintenance dataset.',
      inputSchema: z.object({
        query: z.string().optional(),
        equipment_id: z.string().optional(),
        subsystem: z.string().optional(),
        component: z.string().optional(),
        anomaly_code: z.string().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.number().int().positive().max(25).optional()
      })
    },
    async input => safeTool(async () => {
      const records = await adapterCall('searchRecords', () => adapter.searchRecords(input), validateRecords);
      return jsonResult({ query: input, count: records.length, records });
    })
  );

  server.registerTool(
    'get_equipment_history',
    {
      description: 'Return the synthetic history for one equipment identifier.',
      inputSchema: z.object({ equipment_id: z.string() })
    },
    async ({ equipment_id }) => safeTool(async () => {
      const history = (await adapterCall('searchRecords', () => adapter.searchRecords({ equipment_id, limit: 100 }), validateRecords)).sort((left, right) => left.event_date.localeCompare(right.event_date)).slice(0, 100);
      return jsonResult({ equipment_id, history });
    })
  );

  server.registerTool(
    'get_recent_anomalies',
    {
      description: 'Return the latest synthetic anomalies near the reference date.',
      inputSchema: z.object({
        equipment_id: z.string().optional(),
        subsystem: z.string().optional(),
        days: z.number().int().positive().max(180).default(30)
      })
    },
    async ({ equipment_id, subsystem, days }) => safeTool(async () => jsonResult(await adapterCall('getRecentAnomalies', () => adapter.getRecentAnomalies({ equipment_id, subsystem, days }), validateRecentAnomalies)))
  );

  server.registerTool(
    'get_recurring_patterns',
    {
      description: 'Summarize recurring synthetic patterns for an equipment or component.',
      inputSchema: z.object({ equipment_id: z.string().optional(), component: z.string().optional() })
    },
    async ({ equipment_id, component }) => safeTool(async () => jsonResult({ equipment_id, component, patterns: await adapterCall('getRecurringPatterns', () => adapter.getRecurringPatterns({ equipment_id, component }), validatePatterns) }))
  );

  server.registerTool(
    'get_source_metadata',
    {
      description: 'Return the synthetic source metadata for one source identifier.',
      inputSchema: z.object({ source_id: z.string() })
    },
    async ({ source_id }) => safeTool(async () => jsonResult({ source: await adapterCall('getSourceMetadata', () => adapter.getSourceMetadata(source_id), validateSource) }))
  );

  server.registerTool(
    'retrieve_supporting_evidence',
    {
      description: 'Collect synthetic supporting evidence for an equipment finding.',
      inputSchema: z.object({
        equipment_id: z.string().optional(),
        anomaly_code: z.string().optional(),
        finding: z.string().optional()
      })
    },
    async input => safeTool(async () => jsonResult({ criteria: input, evidence: await adapterCall('getSupportingEvidence', () => adapter.getSupportingEvidence(input), validateEvidence) }))
  );

  server.registerTool(
    'retrieve_document_excerpt',
    {
      description: 'Return one synthetic document excerpt by source identifier or excerpt identifier.',
      inputSchema: z.object({ source_id: z.string().optional(), excerpt_id: z.string().optional() })
    },
    async ({ source_id, excerpt_id }) => safeTool(async () => jsonResult({ excerpt: await adapterCall('getDocumentExcerpt', () => adapter.getDocumentExcerpt(source_id, excerpt_id), validateExcerpt) }))
  );

  server.registerTool(
    'retrieve_prior_cases',
    {
      description: 'Return prior synthetic cases that support the current advisory review.',
      inputSchema: z.object({ equipment_id: z.string().optional(), anomaly_code: z.string().optional() })
    },
    async ({ equipment_id, anomaly_code }) => safeTool(async () => jsonResult({ cases: await adapterCall('getPriorCases', () => adapter.getPriorCases({ equipment_id, anomaly_code }), validatePriorCases) }))
  );

  server.registerTool(
    'retrieve_anomaly_context',
    {
      description: 'Return synthetic anomaly context for a record or equipment identifier.',
      inputSchema: z.object({ record_id: z.string().optional(), equipment_id: z.string().optional(), anomaly_code: z.string().optional() })
    },
    async input => safeTool(async () => {
      const record = input.record_id
        ? await adapterCall('getRecordById', () => adapter.getRecordById(input.record_id!), validateRecord)
        : (await adapterCall('searchRecords', () => adapter.searchRecords({ equipment_id: input.equipment_id, anomaly_code: input.anomaly_code, limit: 1 }), validateRecords))[0] ?? null;
      const evidence = await adapterCall('getSupportingEvidence', () => adapter.getSupportingEvidence({
        equipment_id: input.equipment_id ?? record?.equipment_id,
        anomaly_code: input.anomaly_code ?? record?.anomaly_code,
        finding: record?.technician_note
      }), validateEvidence);
      const source = record ? await adapterCall('getSourceMetadata', () => adapter.getSourceMetadata(record.source_id), validateSource) : null;
      const priorCases = await adapterCall('getPriorCases', () => adapter.getPriorCases({
        equipment_id: record?.equipment_id,
        anomaly_code: record?.anomaly_code
      }), validatePriorCases);
      return jsonResult({ record, source, evidence, prior_cases: priorCases });
    })
  );

  server.registerTool(
    'evaluate_evidence_boundary',
    {
      description: 'Review whether a proposed answer separates chat claims, retrieved evidence, model inference, and actual audit events. The MCP host must supply the prompt and retrieved context explicitly; this tool does not inspect chat implicitly.',
      inputSchema: z.object({
        session_id: z.string().min(1).max(256),
        user_prompt: z.string().min(1).max(8000),
        draft_answer: z.string().max(8000).optional(),
        domain: z.string().max(120).optional(),
        retrieved_evidence: z.array(z.object({
          id: z.string().min(1).max(120),
          text: z.string().min(1).max(4000),
          source_type: z.enum([SourceType.MCP_RETRIEVED, SourceType.TOOL_RETRIEVED, SourceType.CHAT_CLAIM, SourceType.MODEL_INFERENCE, SourceType.UNKNOWN]),
          source_id: z.string().max(120).optional(),
          source_domain: z.string().max(120).optional(),
          provenance: z.string().max(1000).optional()
        })).max(50).default([]),
        comparison_handoff: z.object({
          handoff_type: z.literal('untrusted_comparison_analysis'),
          status: z.enum(['compared', 'refused']),
          confidence: z.number().finite().min(0).max(0.49),
          human_review_required: z.literal(true),
          authoritative: z.literal(false),
          independent_corroboration: z.literal(false),
          source_ids: z.array(z.string().max(120)).max(32),
          independence_groups: z.array(z.string().max(120)).max(32),
          flags: z.array(z.string().max(120)).max(16),
          summary: z.string().max(1000)
        }).optional()
      })
    },
    async input => safeTool(async () => {
      const evaluation = await governanceService.evaluateCompoundGovernance({
        sessionId: input.session_id,
        userPrompt: input.user_prompt,
        draftAnswer: input.draft_answer,
        domain: input.domain,
        retrievedEvidence: input.retrieved_evidence.map(item => ({
          id: item.id,
          text: item.text,
          sourceType: item.source_type,
          sourceId: item.source_id,
          sourceDomain: item.source_domain,
          provenance: item.provenance
        })),
        toolCallsUsed: input.retrieved_evidence
          .map(item => item.source_type)
          .filter((sourceType, index, sourceTypes) => sourceTypes.indexOf(sourceType) === index)
      });
      return jsonResult({
        ...evaluation.evidence,
        risk: evaluation.risk,
        compoundDecision: evaluation.decision,
        compoundGovernance: evaluation
      });
    })
  );

  server.registerTool(
    'submit_review_advisory_packet',
    {
      description: 'Persist a review-only synthetic advisory packet after deterministic governance checks pass.',
      inputSchema: AdvisoryPacketSchema
    },
    async input => safeTool(async () => {
      const validation = validateAdvisoryPacket(input);
      if (!validation.valid) {
        throw new PraetorError('schema_rejected', 'The advisory packet failed schema validation.');
      }

      const packet = validation.data as AdvisoryPacketDraft;
      const assessment = evaluateAdvisoryPacket(packet);
      const contradictionStatus = assessment.guardrail_results.some(result => result.check === 'contradiction_handling' && result.status === 'flag') ? 'present' : 'not_detected';
      const circularEvidenceStatus = assessment.guardrail_results.some(result => result.check === 'false_consensus' && result.status === 'flag') ? 'present' : 'not_detected';
      const record: AdvisoryPacketRecord = {
        ...packet,
        advisory_id: packet.advisory_id!,
        subsystem: packet.subsystem!,
        component: packet.component!,
        source_ids: packet.source_ids!,
        evidence_summary: packet.evidence_summary!,
        provenance: packet.provenance!,
        contradiction_status: contradictionStatus,
        circular_evidence_status: circularEvidenceStatus,
        integrity_verdict: assessment.verdict,
        integrity_summary: assessment.summary,
        stored_at: new Date().toISOString(),
        guardrail_results: assessment.guardrail_results,
        evidence_independence: analyzeEvidenceIndependence(packet.supporting_evidence)
      };

      if (!assessment.accepted) {
        throw new PraetorError('governance_rejected', assessment.summary);
      }

      await appendAdvisoryPacket(record);

      return jsonResult({
        status: 'stored',
        assessment,
        packet: record
      });
    })
  );
}
