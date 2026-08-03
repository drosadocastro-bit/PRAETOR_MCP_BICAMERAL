import type {
  SyntheticDocumentExcerpt,
  SyntheticMaintenanceRecord,
  SyntheticPriorCase,
  SyntheticSourceMetadata
} from './types.js';

export const REFERENCE_DATE = new Date('2026-07-23T00:00:00.000Z');

export const maintenanceRecords: SyntheticMaintenanceRecord[] = [
  {
    record_id: 'REC-401-A',
    equipment_id: 'PRA-401',
    subsystem: 'hydraulic',
    component: 'pump seal',
    event_date: '2026-03-02T00:00:00.000Z',
    event_type: 'vibration_spike',
    anomaly_code: 'VIB-14',
    severity: 'medium',
    technician_note: 'Repeated oscillation during warm-up observed three times.',
    corrective_action: 'Logged, monitored, and routed for review.',
    recurrence_count: 3,
    source_id: 'SRC-401-A',
    source_type: 'synthetic_inspection_log',
    confidence_hint: 0.84,
    independence_group: 'grp-401-a',
    assessment: 'elevated'
  },
  {
    record_id: 'REC-401-B',
    equipment_id: 'PRA-401',
    subsystem: 'hydraulic',
    component: 'pump seal',
    event_date: '2026-04-10T00:00:00.000Z',
    event_type: 'seal_wear_note',
    anomaly_code: 'VIB-14',
    severity: 'medium',
    technician_note: 'Minor seal wear aligns with the repeated oscillation pattern.',
    corrective_action: 'Deferred action pending human review.',
    recurrence_count: 4,
    source_id: 'SRC-401-B',
    source_type: 'synthetic_technician_note',
    confidence_hint: 0.79,
    independence_group: 'grp-401-b',
    assessment: 'elevated'
  },
  {
    record_id: 'REC-401-C',
    equipment_id: 'PRA-401',
    subsystem: 'hydraulic',
    component: 'pressure line',
    event_date: '2026-04-18T00:00:00.000Z',
    event_type: 'inspection_followup',
    anomaly_code: 'VIB-14',
    severity: 'low',
    technician_note: 'Noise consistent with prior oscillation and not yet resolved.',
    corrective_action: 'No operational action taken.',
    recurrence_count: 4,
    source_id: 'SRC-401-C',
    source_type: 'synthetic_followup_report',
    confidence_hint: 0.77,
    independence_group: 'grp-401-c',
    assessment: 'elevated'
  },
  {
    record_id: 'REC-402-A',
    equipment_id: 'PRA-402',
    subsystem: 'ventilation',
    component: 'fan belt',
    event_date: '2026-05-03T00:00:00.000Z',
    event_type: 'technician_note',
    anomaly_code: 'NOTE-01',
    severity: 'low',
    technician_note: 'Might be normal airflow noise; no second observation recorded.',
    corrective_action: 'No action recorded.',
    recurrence_count: 1,
    source_id: 'SRC-402-A',
    source_type: 'synthetic_technician_note',
    confidence_hint: 0.31,
    independence_group: 'grp-402-a',
    assessment: 'uncertain'
  },
  {
    record_id: 'REC-403-A',
    equipment_id: 'PRA-403',
    subsystem: 'cooling',
    component: 'fan assembly',
    event_date: '2026-05-14T00:00:00.000Z',
    event_type: 'temperature_rise',
    anomaly_code: 'TEMP-09',
    severity: 'medium',
    technician_note: 'Temperature rise correlates with unusual fan noise and higher current draw.',
    corrective_action: 'Escalated for further review.',
    recurrence_count: 2,
    source_id: 'SRC-403-A',
    source_type: 'synthetic_inspection_log',
    confidence_hint: 0.68,
    independence_group: 'grp-403-a',
    assessment: 'elevated'
  },
  {
    record_id: 'REC-403-B',
    equipment_id: 'PRA-403',
    subsystem: 'cooling',
    component: 'fan assembly',
    event_date: '2026-05-21T00:00:00.000Z',
    event_type: 'followup_check',
    anomaly_code: 'TEMP-09',
    severity: 'low',
    technician_note: 'Follow-up found normal range fan speed and no sustained temperature rise.',
    corrective_action: 'Returned to monitoring.',
    recurrence_count: 1,
    source_id: 'SRC-403-B',
    source_type: 'synthetic_followup_report',
    confidence_hint: 0.51,
    independence_group: 'grp-403-b',
    assessment: 'normal'
  },
  {
    record_id: 'REC-404-A',
    equipment_id: 'PRA-404',
    subsystem: 'electrical',
    component: 'power relay',
    event_date: '2026-04-05T00:00:00.000Z',
    event_type: 'relay_chatter',
    anomaly_code: 'REL-12',
    severity: 'medium',
    technician_note: 'Relay chatter observed; source note references same upstream inspection log.',
    corrective_action: 'No action; synthetic note only.',
    recurrence_count: 2,
    source_id: 'SRC-404-A',
    source_type: 'synthetic_case_note',
    confidence_hint: 0.56,
    independence_group: 'grp-404-shared',
    assessment: 'uncertain'
  },
  {
    record_id: 'REC-404-B',
    equipment_id: 'PRA-404',
    subsystem: 'electrical',
    component: 'power relay',
    event_date: '2026-04-06T00:00:00.000Z',
    event_type: 'advisory_repeat',
    anomaly_code: 'REL-12',
    severity: 'medium',
    technician_note: 'Repeated advisory mirrors the same upstream case note and adds no new evidence.',
    corrective_action: 'No action; repeat advisory.',
    recurrence_count: 2,
    source_id: 'SRC-404-A',
    source_type: 'synthetic_case_note',
    confidence_hint: 0.56,
    independence_group: 'grp-404-shared',
    assessment: 'uncertain'
  },
  {
    record_id: 'REC-404-C',
    equipment_id: 'PRA-404',
    subsystem: 'electrical',
    component: 'power relay',
    event_date: '2026-04-07T00:00:00.000Z',
    event_type: 'advisory_repeat',
    anomaly_code: 'REL-12',
    severity: 'medium',
    technician_note: 'Third advisory still traces to the same upstream assumption.',
    corrective_action: 'No action; repeat advisory.',
    recurrence_count: 2,
    source_id: 'SRC-404-A',
    source_type: 'synthetic_case_note',
    confidence_hint: 0.56,
    independence_group: 'grp-404-shared',
    assessment: 'uncertain'
  },
  {
    record_id: 'REC-405-A',
    equipment_id: 'PRA-405',
    subsystem: 'sensor',
    component: 'harness',
    event_date: '2026-06-11T00:00:00.000Z',
    event_type: 'intermittent_signal_drop',
    anomaly_code: 'SIG-07',
    severity: 'medium',
    technician_note: 'Intermittent signal drop appears when harness flexes.',
    corrective_action: 'Reviewed locally only.',
    recurrence_count: 2,
    source_id: 'SRC-405-A',
    source_type: 'synthetic_inspection_log',
    confidence_hint: 0.73,
    independence_group: 'grp-405-a',
    assessment: 'elevated'
  }
];

export const sourceMetadata: SyntheticSourceMetadata[] = [
  {
    source_id: 'SRC-401-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-03-02T00:00:00.000Z',
    title: 'Hydraulic warm-up inspection log',
    provenance_metadata: 'Local synthetic logbook entry captured by inspection crew alpha.',
    independence_group: 'grp-401-a',
    uncertainty_notes: ['Derived from controlled synthetic dataset.']
  },
  {
    source_id: 'SRC-401-B',
    source_type: 'synthetic_technician_note',
    timestamp: '2026-04-10T00:00:00.000Z',
    title: 'Seal wear technician note',
    provenance_metadata: 'Local synthetic technician note created independently from the first log entry.',
    independence_group: 'grp-401-b',
    uncertainty_notes: ['Technician note is observational and not diagnostic.']
  },
  {
    source_id: 'SRC-401-C',
    source_type: 'synthetic_followup_report',
    timestamp: '2026-04-18T00:00:00.000Z',
    title: 'Hydraulic follow-up report',
    provenance_metadata: 'Follow-up inspection authored by a separate synthetic reviewer.',
    independence_group: 'grp-401-c',
    uncertainty_notes: ['Follow-up confirms persistence but not root cause.']
  },
  {
    source_id: 'SRC-402-A',
    source_type: 'synthetic_technician_note',
    timestamp: '2026-05-03T00:00:00.000Z',
    title: 'Single vague noise note',
    provenance_metadata: 'Single-note synthetic record with no corroborating observation.',
    independence_group: 'grp-402-a',
    uncertainty_notes: ['Low confidence by design.']
  },
  {
    source_id: 'SRC-403-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-05-14T00:00:00.000Z',
    title: 'Cooling system temperature report',
    provenance_metadata: 'Inspection log capturing a transient temperature rise.',
    independence_group: 'grp-403-a',
    uncertainty_notes: ['Elevated temperature may be transient.']
  },
  {
    source_id: 'SRC-403-B',
    source_type: 'synthetic_followup_report',
    timestamp: '2026-05-21T00:00:00.000Z',
    title: 'Cooling follow-up normal range report',
    provenance_metadata: 'Follow-up report showing a normal measurement window.',
    independence_group: 'grp-403-b',
    uncertainty_notes: ['Contradicts the earlier elevated reading.']
  },
  {
    source_id: 'SRC-404-A',
    source_type: 'synthetic_case_note',
    timestamp: '2026-04-05T00:00:00.000Z',
    title: 'Upstream case note reused across advisories',
    provenance_metadata: 'Deliberately reused source for false-consensus testing.',
    independence_group: 'grp-404-shared',
    uncertainty_notes: ['Multiple advisories share this upstream assumption.']
  },
  {
    source_id: 'SRC-405-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-06-11T00:00:00.000Z',
    title: 'Sensor harness flex observation',
    provenance_metadata: 'Single observational record for write-gate testing.',
    independence_group: 'grp-405-a',
    uncertainty_notes: ['Supports a review-only advisory packet.']
  }
];

export const documentExcerpts: SyntheticDocumentExcerpt[] = [
  {
    excerpt_id: 'EX-401-A',
    source_id: 'SRC-401-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-03-02T00:00:00.000Z',
    equipment_id: 'PRA-401',
    anomaly_code: 'VIB-14',
    excerpt: 'Warm-up vibration exceeded the synthetic baseline three times during the same shift.',
    provenance_metadata: 'Excerpted from the local synthetic inspection log.',
    uncertainty_notes: ['Observation only; no diagnostic conclusion attached.'],
    independence_group: 'grp-401-a'
  },
  {
    excerpt_id: 'EX-401-B',
    source_id: 'SRC-401-B',
    source_type: 'synthetic_technician_note',
    timestamp: '2026-04-10T00:00:00.000Z',
    equipment_id: 'PRA-401',
    anomaly_code: 'VIB-14',
    excerpt: 'Seal wear noted in the observation margin; no operational instruction issued.',
    provenance_metadata: 'Independent synthetic note for review.',
    uncertainty_notes: ['Should be corroborated with the earlier inspection log.'],
    independence_group: 'grp-401-b'
  },
  {
    excerpt_id: 'EX-403-A',
    source_id: 'SRC-403-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-05-14T00:00:00.000Z',
    equipment_id: 'PRA-403',
    anomaly_code: 'TEMP-09',
    excerpt: 'Temperature rose alongside fan noise and a small current increase.',
    provenance_metadata: 'Synthetic inspection excerpt used for contradiction testing.',
    uncertainty_notes: ['Later follow-up contradicts the elevated condition.'],
    independence_group: 'grp-403-a'
  },
  {
    excerpt_id: 'EX-403-B',
    source_id: 'SRC-403-B',
    source_type: 'synthetic_followup_report',
    timestamp: '2026-05-21T00:00:00.000Z',
    equipment_id: 'PRA-403',
    anomaly_code: 'TEMP-09',
    excerpt: 'Follow-up returned to normal range and did not reproduce the earlier rise.',
    provenance_metadata: 'Synthetic follow-up excerpt used for contradiction testing.',
    uncertainty_notes: ['Creates an unresolved contradiction for review.'],
    independence_group: 'grp-403-b'
  },
  {
    excerpt_id: 'EX-405-A',
    source_id: 'SRC-405-A',
    source_type: 'synthetic_inspection_log',
    timestamp: '2026-06-11T00:00:00.000Z',
    equipment_id: 'PRA-405',
    anomaly_code: 'SIG-07',
    excerpt: 'Intermittent signal drop appears when harness flexes.',
    provenance_metadata: 'Synthetic harness observation for write-gated packet testing.',
    uncertainty_notes: ['Advisory-only language remains required.'],
    independence_group: 'grp-405-a'
  }
];

export const priorCases: SyntheticPriorCase[] = [
  {
    case_id: 'CASE-401-1',
    source_id: 'SRC-401-C',
    source_type: 'synthetic_followup_report',
    timestamp: '2026-04-18T00:00:00.000Z',
    equipment_id: 'PRA-401',
    anomaly_code: 'VIB-14',
    finding: 'Recurring hydraulic vibration pattern may indicate a seal issue.',
    excerpt: 'Prior case notes show repeated vibration without an operational conclusion.',
    provenance_metadata: 'Independent synthetic prior case.',
    uncertainty_notes: ['Supports review, not action.'],
    independence_group: 'grp-401-c'
  },
  {
    case_id: 'CASE-403-1',
    source_id: 'SRC-403-B',
    source_type: 'synthetic_followup_report',
    timestamp: '2026-05-21T00:00:00.000Z',
    equipment_id: 'PRA-403',
    anomaly_code: 'TEMP-09',
    finding: 'Later follow-up returned normal despite the earlier temperature rise.',
    excerpt: 'This case remains contradictory and requires human review.',
    provenance_metadata: 'Contradictory synthetic prior case.',
    uncertainty_notes: ['No confident recommendation is allowed.'],
    independence_group: 'grp-403-b'
  },
  {
    case_id: 'CASE-404-1',
    source_id: 'SRC-404-A',
    source_type: 'synthetic_case_note',
    timestamp: '2026-04-05T00:00:00.000Z',
    equipment_id: 'PRA-404',
    anomaly_code: 'REL-12',
    finding: 'Prior advisory repeated the same upstream assumption.',
    excerpt: 'No independent confirmation was added to the later advisory.',
    provenance_metadata: 'False-consensus synthetic prior case.',
    uncertainty_notes: ['Consensus is not independent evidence.'],
    independence_group: 'grp-404-shared'
  }
];

export function findRecordById(recordId: string): SyntheticMaintenanceRecord | undefined {
  return maintenanceRecords.find(record => record.record_id === recordId);
}

export function findSourceById(sourceId: string): SyntheticSourceMetadata | undefined {
  return sourceMetadata.find(source => source.source_id === sourceId);
}
