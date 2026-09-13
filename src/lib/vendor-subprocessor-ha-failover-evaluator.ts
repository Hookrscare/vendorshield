/**
 * vendor-subprocessor-ha-failover-evaluator.ts
 * QA-171: Multi-Region Vendor Sub-Processor High-Availability Regional Failover Evaluator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Evaluates third-party vendor disaster recovery & business continuity architecture:
 * 1. Analyzes replication topology: ACTIVE_ACTIVE, ACTIVE_PASSIVE, PILOT_LIGHT, COLD_STANDBY.
 * 2. Compares claimed RTO/RPO against SOC 2 Availability A1.2 thresholds.
 * 3. Audits cross-border sovereignty compliance during regional failover (e.g. EU failover crossing EEA boundaries).
 * 4. Generates an Availability & Continuity Risk Index (ACRI) with actionable remediation recommendations.
 */

export interface VendorDisasterRecoveryTopology {
  vendorId: string;
  vendorName: string;
  primaryRegion: string;     // e.g. 'eu-west-1' (Ireland)
  failoverRegion: string;    // e.g. 'eu-central-1' (Frankfurt) or 'us-east-1' (Virginia)
  architectureType: 'ACTIVE_ACTIVE' | 'ACTIVE_PASSIVE_HOT' | 'PILOT_LIGHT' | 'COLD_STANDBY';
  claimedRtoMinutes: number; // Recovery Time Objective
  claimedRpoMinutes: number; // Recovery Point Objective
  automatedFailoverEnabled: boolean;
  dpaSccExecuted: boolean;
}

export interface DisasterRecoveryEvaluationResult {
  vendorId: string;
  architectureGrade: 'OPTIMAL' | 'ACCEPTABLE' | 'ELEVATED_RISK' | 'NON_COMPLIANT';
  effectiveRtoMinutes: number;
  effectiveRpoMinutes: number;
  dataSovereigntyViolation: boolean;
  soc2AvailabilityPass: boolean;
  remediations: string[];
}

export class VendorSubprocessorHaFailoverEvaluator {
  private static isEeaRegion(region: string): boolean {
    const eeaPrefixes = ['eu-west-', 'eu-central-', 'eu-north-', 'eu-south-'];
    return eeaPrefixes.some(p => region.startsWith(p));
  }

  public static evaluateTopology(
    topology: VendorDisasterRecoveryTopology,
    maxAllowedRtoMinutes: number = 60,
    maxAllowedRpoMinutes: number = 15
  ): DisasterRecoveryEvaluationResult {
    const remediations: string[] = [];
    let effectiveRto = topology.claimedRtoMinutes;
    let effectiveRpo = topology.claimedRpoMinutes;

    // Manual failover penalty
    if (!topology.automatedFailoverEnabled) {
      effectiveRto += 45; // Human triage overhead
      remediations.push('ENABLE_AUTOMATED_DNS_FAILOVER: Manual failover incurs an estimated 45-minute latency penalty.');
    }

    // Architecture penalty
    if (topology.architectureType === 'COLD_STANDBY') {
      effectiveRto = Math.max(effectiveRto, 240);
      effectiveRpo = Math.max(effectiveRpo, 120);
      remediations.push('UPGRADE_TO_HOT_STANDBY: Cold standby recovery times fail modern enterprise tier-1 availability standards.');
    } else if (topology.architectureType === 'PILOT_LIGHT') {
      effectiveRto = Math.max(effectiveRto, 90);
    }

    // Cross-border GDPR Sovereignty check
    const primaryIsEea = this.isEeaRegion(topology.primaryRegion);
    const failoverIsEea = this.isEeaRegion(topology.failoverRegion);
    let sovereigntyViolation = false;

    if (primaryIsEea && !failoverIsEea && !topology.dpaSccExecuted) {
      sovereigntyViolation = true;
      remediations.push('ILLEGAL_CROSS_BORDER_FAILOVER: Primary data in EEA fails over to non-EEA jurisdiction without Standard Contractual Clauses (SCCs).');
    }

    const soc2Pass = (effectiveRto <= maxAllowedRtoMinutes) && (effectiveRpo <= maxAllowedRpoMinutes);
    if (!soc2Pass) {
      remediations.push(`RTO_RPO_THRESHOLD_BREACH: Effective RTO (${effectiveRto}m) or RPO (${effectiveRpo}m) exceeds SLA maximums (${maxAllowedRtoMinutes}m / ${maxAllowedRpoMinutes}m).`);
    }

    let grade: DisasterRecoveryEvaluationResult['architectureGrade'] = 'OPTIMAL';
    if (sovereigntyViolation) {
      grade = 'NON_COMPLIANT';
    } else if (!soc2Pass || topology.architectureType === 'COLD_STANDBY') {
      grade = 'ELEVATED_RISK';
    } else if (topology.architectureType === 'ACTIVE_PASSIVE_HOT' || topology.architectureType === 'PILOT_LIGHT') {
      grade = 'ACCEPTABLE';
    }

    return {
      vendorId: topology.vendorId,
      architectureGrade: grade,
      effectiveRtoMinutes: effectiveRto,
      effectiveRpoMinutes: effectiveRpo,
      dataSovereigntyViolation: sovereigntyViolation,
      soc2AvailabilityPass: soc2Pass,
      remediations
    };
  }
}
