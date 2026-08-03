import type { AdvisoryPacketRecord } from './types.js';

export interface PrototypeMetrics {
  total_packets: number;
  complete_evidence_packets: number;
  weak_advisories_flagged: number;
  mission_drift_blocked: number;
  false_consensus_detected: number;
  low_confidence_routed_to_review: number;
  reconstructable_packets: number;
}

export function calculatePrototypeMetrics(packets: AdvisoryPacketRecord[]): PrototypeMetrics {
  return {
    total_packets: packets.length,
    complete_evidence_packets: packets.filter(packet => packet.source_ids.length > 0).length,
    weak_advisories_flagged: packets.filter(packet => packet.integrity_verdict !== 'safe').length,
    mission_drift_blocked: packets.filter(packet => packet.guardrail_results.some(result => result.check === 'mission_boundary' && result.status === 'block')).length,
    false_consensus_detected: packets.filter(packet => packet.guardrail_results.some(result => result.check === 'false_consensus' && result.status === 'flag')).length,
    low_confidence_routed_to_review: packets.filter(packet => packet.human_review_required).length,
    reconstructable_packets: packets.filter(packet => packet.source_ids.length === packet.supporting_evidence.length).length
  };
}
