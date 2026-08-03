import {
  documentExcerpts,
  findRecordById,
  findSourceById,
  maintenanceRecords,
  priorCases,
  REFERENCE_DATE,
  sourceMetadata
} from '../data.js';
import type {
  DatasetAdapter,
  PatternResult,
  RecentAnomaliesQuery,
  RecurringPatternsQuery,
  SearchRecordsQuery
} from './DatasetAdapter.js';
import type {
  EvidenceItem,
  SyntheticDocumentExcerpt,
  SyntheticMaintenanceRecord,
  SyntheticPriorCase,
  SyntheticSourceMetadata
} from '../types.js';

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
  ].join(' ').toLowerCase();

  return query.toLowerCase().split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}

function maintenanceRecordToEvidence(record: SyntheticMaintenanceRecord, source: SyntheticSourceMetadata | undefined): EvidenceItem {
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

export class SyntheticDatasetAdapter implements DatasetAdapter {
  readonly name = 'synthetic-dataset';
  readonly mode = 'synthetic' as const;

  async searchRecords(args: SearchRecordsQuery): Promise<SyntheticMaintenanceRecord[]> {
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

  async getRecordById(recordId: string): Promise<SyntheticMaintenanceRecord | null> {
    return findRecordById(recordId) ?? null;
  }

  async getSourceMetadata(sourceId: string): Promise<SyntheticSourceMetadata | null> {
    return findSourceById(sourceId) ?? null;
  }

  async getRecentAnomalies(args: RecentAnomaliesQuery) {
    const days = args.days ?? 30;
    const windowStart = new Date(REFERENCE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
    const anomalies = maintenanceRecords
      .filter(record => new Date(record.event_date) >= windowStart)
      .filter(record => (args.equipment_id ? record.equipment_id === args.equipment_id : true))
      .filter(record => (args.subsystem ? record.subsystem === args.subsystem : true));
    return { reference_date: REFERENCE_DATE.toISOString(), window_start: windowStart.toISOString(), anomalies };
  }

  async getRecurringPatterns(args: RecurringPatternsQuery): Promise<PatternResult[]> {
    const matching = maintenanceRecords
      .filter(record => (args.equipment_id ? record.equipment_id === args.equipment_id : true))
      .filter(record => (args.component ? record.component === args.component : true));

    return matching.reduce<PatternResult[]>((patterns, record) => {
      const existing = patterns.find(item => item.anomaly_code === record.anomaly_code && item.equipment_id === record.equipment_id && item.component === record.component);
      if (!existing) {
        patterns.push({
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
      return patterns;
    }, []);
  }

  async getSupportingEvidence(args: { equipment_id?: string; anomaly_code?: string; finding?: string }): Promise<EvidenceItem[]> {
    const terms = [args.equipment_id, args.anomaly_code, args.finding].filter(Boolean).map(String);
    const matches = (fields: string[]) => terms.every(term => fields.some(field => field.toLowerCase().includes(term.toLowerCase())));
    const recordEvidence = maintenanceRecords.filter(record => matches([record.equipment_id, record.anomaly_code, record.technician_note, record.event_type])).map(record => maintenanceRecordToEvidence(record, findSourceById(record.source_id)));
    const excerptEvidence = documentExcerpts.filter(excerpt => matches([excerpt.equipment_id, excerpt.anomaly_code, excerpt.excerpt])).map(excerptToEvidence);
    const priorEvidence = priorCases.filter(priorCase => matches([priorCase.equipment_id, priorCase.anomaly_code, priorCase.finding, priorCase.excerpt])).map(priorCaseToEvidence);
    return [...recordEvidence, ...excerptEvidence, ...priorEvidence];
  }

  async getDocumentExcerpt(sourceId?: string, excerptId?: string): Promise<SyntheticDocumentExcerpt | null> {
    return documentExcerpts.find(excerpt => (sourceId ? excerpt.source_id === sourceId : true) && (excerptId ? excerpt.excerpt_id === excerptId : true)) ?? null;
  }

  async getPriorCases(args: { equipment_id?: string; anomaly_code?: string }): Promise<SyntheticPriorCase[]> {
    return priorCases
      .filter(priorCase => (args.equipment_id ? priorCase.equipment_id === args.equipment_id : true))
      .filter(priorCase => (args.anomaly_code ? priorCase.anomaly_code === args.anomaly_code : true));
  }
}
