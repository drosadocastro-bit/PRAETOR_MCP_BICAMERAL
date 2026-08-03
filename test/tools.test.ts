import { describe, expect, it } from 'vitest';

import {
  buildAnomalyContext,
  buildDocumentExcerpt,
  buildEquipmentHistory,
  buildPriorCases,
  buildRecurringPatterns,
  buildRecentAnomalies,
  buildSourceMetadata,
  collectSupportingEvidence,
  searchMaintenanceRecordsData
} from '../src/tools.js';

describe('tool helpers', () => {
  it('searches maintenance records by query and filters', () => {
    const results = searchMaintenanceRecordsData({ query: 'hydraulic vibration', equipment_id: 'PRA-401' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(record => record.equipment_id === 'PRA-401')).toBe(true);
  });

  it('returns an ordered equipment history', () => {
    const history = buildEquipmentHistory('PRA-401');
    expect(history.map(record => record.record_id)).toEqual(['REC-401-A', 'REC-401-B', 'REC-401-C']);
  });

  it('returns recent anomalies within the window', () => {
    const recent = buildRecentAnomalies({ equipment_id: 'PRA-403', days: 120 });
    expect(recent.anomalies.length).toBeGreaterThan(0);
    expect(recent.reference_date).toBe('2026-07-23T00:00:00.000Z');
  });

  it('summarizes recurring patterns', () => {
    const patterns = buildRecurringPatterns({ equipment_id: 'PRA-401' });
    expect(patterns.some(pattern => pattern.anomaly_code === 'VIB-14')).toBe(true);
  });

  it('returns source metadata and excerpts', () => {
    expect(buildSourceMetadata('SRC-401-A')?.source_id).toBe('SRC-401-A');
    expect(buildDocumentExcerpt('SRC-401-A', 'EX-401-A')?.excerpt).toContain('Warm-up vibration');
  });

  it('collects supporting evidence and prior cases', () => {
    const evidence = collectSupportingEvidence({ equipment_id: 'PRA-401', anomaly_code: 'VIB-14' });
    const cases = buildPriorCases({ equipment_id: 'PRA-401', anomaly_code: 'VIB-14' });
    expect(evidence.length).toBeGreaterThan(0);
    expect(cases.length).toBeGreaterThan(0);
  });

  it('builds anomaly context', () => {
    const context = buildAnomalyContext({ record_id: 'REC-403-A' });
    expect(context.record?.record_id).toBe('REC-403-A');
    expect(context.evidence.length).toBeGreaterThan(0);
    expect(context.source?.source_id).toBe('SRC-403-A');
  });
});
