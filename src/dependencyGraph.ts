import type { EvidenceIndependence, EvidenceItem } from './types.js';

export interface DependencyGraphReport extends EvidenceIndependence {
  circular_evidence_risk: boolean;
  edges: Array<{ evidence_id: string; source_id: string; derived_from?: string; upstream_assumption?: string }>;
}

export function analyzeEvidenceIndependence(evidence: EvidenceItem[]): DependencyGraphReport {
  const sourceCounts = new Map<string, number>();
  for (const item of evidence) {
    sourceCounts.set(item.source_id, (sourceCounts.get(item.source_id) ?? 0) + 1);
  }

  const sharedSourceIds = [...sourceCounts.entries()].filter(([, count]) => count > 1).map(([sourceId]) => sourceId);
  const excerptCounts = new Map(evidence.map(item => [item.excerpt.trim().toLowerCase(), 0]));
  for (const item of evidence) {
    const excerpt = item.excerpt.trim().toLowerCase();
    excerptCounts.set(excerpt, (excerptCounts.get(excerpt) ?? 0) + 1);
  }
  const repeatedExcerptCount = [...excerptCounts.values()].filter(count => count > 1).reduce((sum, count) => sum + count, 0);
  const paraphraseGroupCounts = new Map<string, number>();
  for (const item of evidence) {
    if (item.declared_paraphrase_group) {
      paraphraseGroupCounts.set(item.declared_paraphrase_group, (paraphraseGroupCounts.get(item.declared_paraphrase_group) ?? 0) + 1);
    }
  }
  const repeatedParaphraseGroupCount = [...paraphraseGroupCounts.values()]
    .filter(count => count > 1)
    .reduce((sum, count) => sum + count, 0);
  const independentSourceCount = new Set(evidence.map(item => item.derived_from_source_id ?? item.source_id)).size;
  const circularEvidenceRisk = sharedSourceIds.length > 0
    || repeatedExcerptCount > 0
    || repeatedParaphraseGroupCount > 0
    || evidence.some(item => Boolean(item.derived_from_source_id || item.upstream_assumption));
  const dependencyRisk = circularEvidenceRisk ? (independentSourceCount <= 1 ? 'high' : 'medium') : 'low';

  return {
    independent_source_count: independentSourceCount,
    total_evidence_count: evidence.length,
    shared_source_ids: sharedSourceIds,
    dependency_risk: dependencyRisk,
    notes: circularEvidenceRisk
      ? `Consensus is not independent evidence; source reuse, repeated excerpts, declared paraphrase groups, or upstream assumptions were detected (${repeatedExcerptCount} repeated excerpt item(s), ${repeatedParaphraseGroupCount} paraphrase-group item(s)).`
      : 'Evidence items map to distinct synthetic source lineages.',
    repeated_excerpt_count: repeatedExcerptCount,
    circular_evidence_risk: circularEvidenceRisk,
    edges: evidence.map((item, index) => ({
      evidence_id: `EV-${index + 1}`,
      source_id: item.source_id,
      derived_from: item.derived_from_source_id,
      upstream_assumption: item.upstream_assumption
    }))
  };
}
