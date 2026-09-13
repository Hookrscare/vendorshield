/**
 * src/lib/vendor-regional-failover-evaluator.ts
 * QA-171: Multi-Region Vendor Sub-Processor High-Availability Regional Failover Evaluator.
 * 
 * Part of VendorShield B2B Enterprise Compliance & Trust Hub.
 * Evaluates third-party vendor disaster recovery, regional replication topology,
 * RTO/RPO SLAs, and cross-border residency compliance during regional outages.
 */

import { createHash } from 'crypto';

export type ReplicationTopology = 
  | 'ACTIVE_ACTIVE'
  | 'ACTIVE_PASSIVE_HOT'
  | 'ACTIVE_PASSIVE_COLD'
  | 'SINGLE_REGION_NONE';

export interface RegionalDataResidencyRule {
  allowedRegions: string[];
  strictResidencyEnforced: boolean;
  jurisdiction: 'EU_EEA' | 'US' | 'GLOBAL' | 'UK' | 'APAC';
}

export interface SubProcessorFailoverConfig {
  vendorId: string;
  vendorName: string;
  primaryRegion: string;
  failoverRegions: string[];
  topology: ReplicationTopology;
  slaRtoMinutes: number; // Recovery Time Objective
  slaRpoMinutes: number; // Recovery Point Objective
  lastDisasterRecoveryTestDate: string; // ISO date
  healthCheckIntervalSec: number;
}

export interface FailoverEvaluationResult {
  vendorId: string;
  highAvailabilityScore: number; // 0 - 100
  isCompliant: boolean;
  residencyViolations: string[];
  riskWarnings: string[];
  certificationSealSha256: string;
}

export class VendorRegionalFailoverEvaluator {
  /**
   * Evaluates sub-processor regional failover readiness and residency compliance.
   */
  public static evaluate(
    config: SubProcessorFailoverConfig,
    residencyRules?: RegionalDataResidencyRule
  ): FailoverEvaluationResult {
    const riskWarnings: string[] = [];
    const residencyViolations: string[] = [];
    let score = 100;

    // 1. Topology checks
    switch (config.topology) {
      case 'ACTIVE_ACTIVE':
        // Perfect multi-region redundancy
        break;
      case 'ACTIVE_PASSIVE_HOT':
        score -= 10;
        break;
      case 'ACTIVE_PASSIVE_COLD':
        score -= 30;
        riskWarnings.push('Cold standby failover incurs significant spin-up latency during regional disaster.');
        break;
      case 'SINGLE_REGION_NONE':
        score -= 50;
        riskWarnings.push('CRITICAL: Single region deployment with zero automated regional failover.');
        break;
    }

    // 2. RTO / RPO SLA limits (SOC 2 Availability Criteria A1.2)
    if (config.slaRtoMinutes > 60) {
      score -= 15;
      riskWarnings.push(`High Recovery Time Objective (RTO: ${config.slaRtoMinutes} min) exceeds recommended 60m threshold.`);
    }
    if (config.slaRpoMinutes > 15) {
      score -= 15;
      riskWarnings.push(`High Recovery Point Objective (RPO: ${config.slaRpoMinutes} min) risks data loss on sudden outage.`);
    }

    // 3. Disaster Recovery Recency
    if (config.lastDisasterRecoveryTestDate) {
      const testDate = new Date(config.lastDisasterRecoveryTestDate);
      const now = new Date('2026-09-13T10:00:00Z');
      const daysSinceTest = (now.getTime() - testDate.getTime()) / (1000 * 3600 * 24);
      if (daysSinceTest > 365) {
        score -= 20;
        riskWarnings.push('Disaster recovery failover simulation test is overdue (> 365 days).');
      }
    } else {
      score -= 25;
      riskWarnings.push('No documented disaster recovery test date on record.');
    }

    // 4. Data Residency Verification (GDPR Chapter V / Cross-border compliance)
    if (residencyRules && residencyRules.strictResidencyEnforced) {
      const allOperatingRegions = [config.primaryRegion, ...config.failoverRegions];
      for (const region of allOperatingRegions) {
        if (!residencyRules.allowedRegions.includes(region)) {
          const violation = `Region ${region} is outside permitted residency boundary for jurisdiction ${residencyRules.jurisdiction}.`;
          residencyViolations.push(violation);
          score -= 30;
        }
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const isCompliant = finalScore >= 70 && residencyViolations.length === 0 && config.topology !== 'SINGLE_REGION_NONE';

    const auditDigest = createHash('sha256')
      .update(JSON.stringify({
        vendorId: config.vendorId,
        score: finalScore,
        isCompliant,
        violations: residencyViolations,
        timestamp: '2026-09-13T10:00:00Z'
      }))
      .digest('hex');

    return {
      vendorId: config.vendorId,
      highAvailabilityScore: finalScore,
      isCompliant,
      residencyViolations,
      riskWarnings,
      certificationSealSha256: auditDigest
    };
  }
}
