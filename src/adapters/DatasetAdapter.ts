import type {
  EvidenceItem,
  SyntheticDocumentExcerpt,
  SyntheticMaintenanceRecord,
  SyntheticPriorCase,
  SyntheticSourceMetadata
} from '../types.js';

export type AdapterMode = 'synthetic' | 'external';

export interface SearchRecordsQuery {
  query?: string;
  equipment_id?: string;
  subsystem?: string;
  component?: string;
  anomaly_code?: string;
  severity?: string;
  limit?: number;
}

export interface RecordResult extends SyntheticMaintenanceRecord {}

export interface RecentAnomaliesQuery {
  equipment_id?: string;
  subsystem?: string;
  days?: number;
}

export interface RecurringPatternsQuery {
  equipment_id?: string;
  component?: string;
}

export interface PatternResult {
  anomaly_code: string;
  equipment_id: string;
  component: string;
  count: number;
  recurrence_count_max: number;
  average_confidence_hint: number;
}

export interface DatasetAdapter {
  readonly name: string;
  readonly mode: AdapterMode;

  searchRecords(query: SearchRecordsQuery): Promise<RecordResult[]>;
  getRecordById(recordId: string): Promise<RecordResult | null>;
  getSourceMetadata(sourceId: string): Promise<SyntheticSourceMetadata | null>;
  getRecentAnomalies(query: RecentAnomaliesQuery): Promise<{
    reference_date: string;
    window_start: string;
    anomalies: RecordResult[];
  }>;
  getRecurringPatterns(query: RecurringPatternsQuery): Promise<PatternResult[]>;
  getSupportingEvidence(query: {
    equipment_id?: string;
    anomaly_code?: string;
    finding?: string;
  }): Promise<EvidenceItem[]>;
  getDocumentExcerpt(sourceId?: string, excerptId?: string): Promise<SyntheticDocumentExcerpt | null>;
  getPriorCases(query: { equipment_id?: string; anomaly_code?: string }): Promise<SyntheticPriorCase[]>;
}
