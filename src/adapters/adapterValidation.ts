import * as z from 'zod/v4';

import { PraetorError } from '../errors.js';
import type {
  EvidenceItem,
  SyntheticDocumentExcerpt,
  SyntheticMaintenanceRecord,
  SyntheticPriorCase,
  SyntheticSourceMetadata
} from '../types.js';
import type { PatternResult } from './DatasetAdapter.js';

const MAX_ADAPTER_ITEMS = 100;
const MAX_ADAPTER_TEXT = 5000;

const MaintenanceRecordSchema = z.strictObject({
  record_id: z.string().min(1).max(256),
  equipment_id: z.string().min(1).max(256),
  subsystem: z.string().min(1).max(256),
  component: z.string().min(1).max(256),
  event_date: z.string().datetime(),
  event_type: z.string().min(1).max(256),
  anomaly_code: z.string().min(1).max(256),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  technician_note: z.string().min(1).max(MAX_ADAPTER_TEXT),
  corrective_action: z.string().min(1).max(MAX_ADAPTER_TEXT),
  recurrence_count: z.number().int().nonnegative().max(100000),
  source_id: z.string().min(1).max(256),
  source_type: z.string().min(1).max(256),
  confidence_hint: z.number().min(0).max(1),
  independence_group: z.string().min(1).max(256),
  assessment: z.enum(['elevated', 'stable', 'normal', 'uncertain'])
});

const SourceMetadataSchema = z.strictObject({
  source_id: z.string().min(1).max(256),
  source_type: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  title: z.string().min(1).max(MAX_ADAPTER_TEXT),
  provenance_metadata: z.string().min(1).max(MAX_ADAPTER_TEXT),
  independence_group: z.string().min(1).max(256),
  uncertainty_notes: z.array(z.string().max(MAX_ADAPTER_TEXT)).max(25)
});

const EvidenceSchema = z.strictObject({
  source_id: z.string().min(1).max(256),
  source_type: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  excerpt: z.string().min(1).max(MAX_ADAPTER_TEXT),
  provenance_metadata: z.string().min(1).max(MAX_ADAPTER_TEXT),
  uncertainty_notes: z.array(z.string().max(MAX_ADAPTER_TEXT)).max(25),
  independence_group: z.string().min(1).max(256),
  assessment: z.enum(['elevated', 'stable', 'normal', 'uncertain']).optional(),
  confidence_hint: z.number().min(0).max(1).optional(),
  derived_from_source_id: z.string().min(1).max(256).optional(),
  upstream_assumption: z.string().min(1).max(MAX_ADAPTER_TEXT).optional(),
  declared_paraphrase_group: z.string().min(1).max(256).optional()
});

const ExcerptSchema = z.strictObject({
  excerpt_id: z.string().min(1).max(256),
  source_id: z.string().min(1).max(256),
  source_type: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  equipment_id: z.string().min(1).max(256),
  anomaly_code: z.string().min(1).max(256),
  excerpt: z.string().min(1).max(MAX_ADAPTER_TEXT),
  provenance_metadata: z.string().min(1).max(MAX_ADAPTER_TEXT),
  uncertainty_notes: z.array(z.string().max(MAX_ADAPTER_TEXT)).max(25),
  independence_group: z.string().min(1).max(256)
});

const PriorCaseSchema = z.strictObject({
  case_id: z.string().min(1).max(256),
  source_id: z.string().min(1).max(256),
  source_type: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  equipment_id: z.string().min(1).max(256),
  anomaly_code: z.string().min(1).max(256),
  finding: z.string().min(1).max(MAX_ADAPTER_TEXT),
  excerpt: z.string().min(1).max(MAX_ADAPTER_TEXT),
  provenance_metadata: z.string().min(1).max(MAX_ADAPTER_TEXT),
  uncertainty_notes: z.array(z.string().max(MAX_ADAPTER_TEXT)).max(25),
  independence_group: z.string().min(1).max(256)
});

const PatternSchema = z.strictObject({
  anomaly_code: z.string().min(1).max(256),
  equipment_id: z.string().min(1).max(256),
  component: z.string().min(1).max(256),
  count: z.number().int().positive().max(100000),
  recurrence_count_max: z.number().int().nonnegative().max(100000),
  average_confidence_hint: z.number().min(0).max(1)
});

const RecentAnomaliesSchema = z.strictObject({
  reference_date: z.string().datetime(),
  window_start: z.string().datetime(),
  anomalies: z.array(MaintenanceRecordSchema).max(MAX_ADAPTER_ITEMS)
});

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new PraetorError('adapter_error', `Adapter returned invalid ${label}.`);
  }
  return result.data;
}

function parseList<T>(schema: z.ZodType<T>, value: unknown, label: string): T[] {
  if (!Array.isArray(value) || value.length > MAX_ADAPTER_ITEMS) {
    throw new PraetorError('adapter_error', `Adapter returned an invalid or oversized ${label} result.`);
  }
  return value.map((item, index) => parse(schema, item, `${label} item ${index + 1}`));
}

export function validateRecords(value: unknown): SyntheticMaintenanceRecord[] {
  return parseList(MaintenanceRecordSchema, value, 'record');
}

export function validateRecord(value: unknown): SyntheticMaintenanceRecord | null {
  return value === null ? null : parse(MaintenanceRecordSchema, value, 'record');
}

export function validateSource(value: unknown): SyntheticSourceMetadata | null {
  return value === null ? null : parse(SourceMetadataSchema, value, 'source metadata');
}

export function validateEvidence(value: unknown): EvidenceItem[] {
  return parseList(EvidenceSchema, value, 'evidence');
}

export function validateExcerpt(value: unknown): SyntheticDocumentExcerpt | null {
  return value === null ? null : parse(ExcerptSchema, value, 'document excerpt');
}

export function validatePriorCases(value: unknown): SyntheticPriorCase[] {
  return parseList(PriorCaseSchema, value, 'prior case');
}

export function validatePatterns(value: unknown): PatternResult[] {
  return parseList(PatternSchema, value, 'recurring pattern');
}

export function validateRecentAnomalies(value: unknown): {
  reference_date: string;
  window_start: string;
  anomalies: SyntheticMaintenanceRecord[];
} {
  return parse(RecentAnomaliesSchema, value, 'recent anomaly result');
}

export async function adapterCall<T>(operation: string, action: () => Promise<unknown>, validate: (value: unknown) => T): Promise<T> {
  try {
    return validate(await action());
  } catch (error) {
    if (error instanceof PraetorError) {
      throw error;
    }
    console.error(`[adapter_error:${operation}] provider failure`);
    throw new PraetorError('adapter_error', 'The dataset adapter failed to provide a valid result.', { cause: error });
  }
}
