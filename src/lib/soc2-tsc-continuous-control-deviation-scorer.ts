/**
 * QA-188: Automated SOC 2 Trust Services Criteria Continuous Control Deviation Scorer.
 * Part of VendorShield B2B Enterprise Compliance & Trust Hub.
 * 
 * Continuously evaluates control deviations across AICPA TSC categories (CC1-CC9, A1, C1, PI1, P1-P8).
 * Quantifies deviation frequency, duration, sample population impact rate, and compensating controls
 * to forecast SOC 2 Type II auditor opinion risk (Unqualified vs. Qualified / Adverse).
 */

export type TrustServiceCategory =
  | 'SECURITY'
  | 'AVAILABILITY'
  | 'CONFIDENTIALITY'
  | 'PROCESSING_INTEGRITY'
  | 'PRIVACY';

export interface ControlDeviationEvent {
  eventId: string;
  criteriaCode: string; // e.g. 'CC6.1', 'CC7.2', 'CC8.1'
  category: TrustServiceCategory;
  description: string;
  durationHours: number;
  affectedAssetsCount: number;
  totalPopulationAssets: number;
  hasCompensatingControl: boolean;
  compensatingControlDescription?: string;
}

export interface EvaluatedDeviation {
  eventId: string;
  criteriaCode: string;
  deviationRatePct: number;
  rawRiskWeight: number;
  mitigatedRiskWeight: number;
  requiresAuditorManagementLetterNote: boolean;
}

export interface Soc2TscDeviationAuditReport {
  timestamp: string;
  totalDeviations: number;
  aggregateRiskScore: number; // 0 - 100
  auditOpinionForecast: 'CLEAN_UNQUALIFIED' | 'QUALIFIED_EXCEPTION_RISK' | 'ADVERSE_OPINION_RISK';
  isAuditorDisclosureMandatory: boolean;
  recommendations: string[];
  evaluatedDeviations: EvaluatedDeviation[];
}

export class Soc2TscContinuousControlDeviationScorer {
  private qualifiedThreshold: number;
  private adverseThreshold: number;

  constructor(qualifiedThreshold: number = 35.0, adverseThreshold: number = 75.0) {
    this.qualifiedThreshold = qualifiedThreshold;
    this.adverseThreshold = adverseThreshold;
  }

  /**
   * Evaluates a set of detected continuous control deviations against AICPA audit standards.
   */
  public evaluateDeviations(deviations: ControlDeviationEvent[]): Soc2TscDeviationAuditReport {
    if (!deviations || deviations.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        totalDeviations: 0,
        aggregateRiskScore: 0,
        auditOpinionForecast: 'CLEAN_UNQUALIFIED',
        isAuditorDisclosureMandatory: false,
        recommendations: ['All AICPA TSC automated controls operating effectively.'],
        evaluatedDeviations: []
      };
    }

    const evaluatedList: EvaluatedDeviation[] = [];
    let totalRisk = 0;
    let mandatoryDisclosure = false;
    const recommendations: string[] = [];

    for (const dev of deviations) {
      if (dev.totalPopulationAssets <= 0) {
        throw new Error(`Invalid totalPopulationAssets for event ${dev.eventId}`);
      }

      const rate = (dev.affectedAssetsCount / dev.totalPopulationAssets) * 100.0;
      // Duration factor: logarithmic scale
      const durationFactor = Math.min(3.0, 1.0 + Math.log10(Math.max(1, dev.durationHours)));

      // Base category weights: Security CC is highest priority
      const catWeight = dev.category === 'SECURITY' ? 1.5 : 1.0;

      // Raw deviation risk
      const rawRisk = (rate * 0.5) * durationFactor * catWeight;

      // Compensating control reduces severity by 70%
      const mitigatedRisk = dev.hasCompensatingControl ? rawRisk * 0.3 : rawRisk;
      totalRisk += mitigatedRisk;

      // AICPA guidance: deviations with rate > 5% or uncompensated for > 72 hours require management letter note
      const requiresNote = rate > 5.0 || (dev.durationHours > 72 && !dev.hasCompensatingControl);
      if (requiresNote) {
        mandatoryDisclosure = true;
        recommendations.push(
          `Document management response for ${dev.criteriaCode}: ${dev.description}`
        );
      }

      evaluatedList.push({
        eventId: dev.eventId,
        criteriaCode: dev.criteriaCode,
        deviationRatePct: Math.round(rate * 100) / 100,
        rawRiskWeight: Math.round(rawRisk * 100) / 100,
        mitigatedRiskWeight: Math.round(mitigatedRisk * 100) / 100,
        requiresAuditorManagementLetterNote: requiresNote
      });
    }

    const aggregateScore = Math.min(100.0, Math.round(totalRisk * 10) / 10);

    let forecast: 'CLEAN_UNQUALIFIED' | 'QUALIFIED_EXCEPTION_RISK' | 'ADVERSE_OPINION_RISK' = 'CLEAN_UNQUALIFIED';
    if (aggregateScore >= this.adverseThreshold) {
      forecast = 'ADVERSE_OPINION_RISK';
      recommendations.unshift('CRITICAL: High pervasive control failure risk. Immediate executive escalation required.');
    } else if (aggregateScore >= this.qualifiedThreshold || mandatoryDisclosure) {
      forecast = 'QUALIFIED_EXCEPTION_RISK';
      recommendations.unshift('WARNING: Control deviations may result in qualified audit finding or testing exception.');
    }

    return {
      timestamp: new Date().toISOString(),
      totalDeviations: deviations.length,
      aggregateRiskScore: aggregateScore,
      auditOpinionForecast: forecast,
      isAuditorDisclosureMandatory: mandatoryDisclosure,
      recommendations,
      evaluatedDeviations: evaluatedList
    };
  }
}
