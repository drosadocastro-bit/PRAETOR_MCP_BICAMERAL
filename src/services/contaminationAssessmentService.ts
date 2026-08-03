import {
  AgentHandoff,
  ContaminationClass,
  ContaminationStatus,
  HandoffSourceType
} from '../handoffs/schema.js';

export interface ContaminationAssessmentResult {
  chainContaminated: boolean;
  primaryContaminationClass: ContaminationClass;
  propagationDepth: number;
  falseConsensusDetected: boolean;
  sharedSourceIds: string[];
  affectedAgentIds: string[];
  findings: string[];
}

export class ContaminationAssessmentService {
  /**
   * Assesses an execution trace of multi-agent handoffs for cross-agent contamination propagation.
   */
  public evaluateChain(handoffs: AgentHandoff[]): ContaminationAssessmentResult {
    const findings: string[] = [];
    const affectedAgentIds = new Set<string>();
    const sharedSourceIds = new Set<string>();
    let propagationDepth = 0;
    let primaryClass = ContaminationClass.C0_CLEAN;

    if (handoffs.length === 0) {
      return {
        chainContaminated: false,
        primaryContaminationClass: ContaminationClass.C0_CLEAN,
        propagationDepth: 0,
        falseConsensusDetected: false,
        sharedSourceIds: [],
        affectedAgentIds: [],
        findings: ['Empty handoff trace']
      };
    }

    // 1. Identify primary contamination across handoffs in sequence
    let contaminatedFound = false;
    for (let idx = 0; idx < handoffs.length; idx++) {
      const h = handoffs[idx];
      if (
        h.contaminationStatus === ContaminationStatus.CONFIRMED ||
        h.contaminationStatus === ContaminationStatus.SUSPECTED ||
        (h.contaminationClass && h.contaminationClass !== ContaminationClass.C0_CLEAN) ||
        h.validationStatus === 'CONTAMINATED'
      ) {
        contaminatedFound = true;
        affectedAgentIds.add(h.sourceAgentId);
        affectedAgentIds.add(h.destinationAgentId);
        if (primaryClass === ContaminationClass.C0_CLEAN) {
          primaryClass = h.contaminationClass;
        }
        propagationDepth = Math.max(propagationDepth, handoffs.length - idx);
        findings.push(`Contamination detected at index ${idx} (${h.sourceAgentId} -> ${h.destinationAgentId}): ${h.contaminationClass}`);
      }
    }

    // 2. Check for Circular Reinforcement (C9)
    for (let i = 0; i < handoffs.length; i++) {
      for (let j = i + 1; j < handoffs.length; j++) {
        const h1 = handoffs[i];
        const h2 = handoffs[j];
        if (
          h1.sourceAgentId === h2.destinationAgentId &&
          h1.destinationAgentId === h2.sourceAgentId &&
          h1.sourceType === HandoffSourceType.MODEL_INFERENCE &&
          (h2.content.includes(h1.content) || h2.evidenceIds.includes(h1.handoffId))
        ) {
          contaminatedFound = true;
          findings.push(
            `Contamination C9: Circular Reinforcement loop detected between ${h1.sourceAgentId} and ${h2.sourceAgentId}.`
          );
          if (primaryClass === ContaminationClass.C0_CLEAN) {
            primaryClass = ContaminationClass.C9_CIRCULAR_REINFORCEMENT;
          }
        }
      }
    }

    const falseConsensusDetected = primaryClass === ContaminationClass.C4_SHARED_SOURCE_FALSE_CONSENSUS;

    return {
      chainContaminated: contaminatedFound,
      primaryContaminationClass: primaryClass,
      propagationDepth,
      falseConsensusDetected,
      sharedSourceIds: Array.from(sharedSourceIds),
      affectedAgentIds: Array.from(affectedAgentIds),
      findings
    };
  }
}
