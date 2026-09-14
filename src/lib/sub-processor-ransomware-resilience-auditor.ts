/**
 * QA-120: Automated B2B Sub-Processor Ransomware Resilience & Backup Immutability Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements automated vendor disaster recovery, WORM storage, and extortion resilience auditing:
 * - Validates WORM (Write Once Read Many) / Object Lock retention policies (minimum 30 days).
 * - Enforces dual-custody / multi-party authorization (M-of-N) on backup bucket destruction.
 * - Assesses RPO (Recovery Point Objective <= 1 hr) and RTO (Recovery Time Objective <= 4 hrs).
 * - Verifies cross-region / cross-account air-gapped secondary vault replication.
 * - Computes a standardized 0-100 Ransomware Resilience Index (RRI).
 * - Emits tamper-evident SHA-256 cryptographic audit digests for SOC 2 CC7.3 / ISO 27001 A.12.3.
 */

import { createHash } from "crypto";

export type VendorCriticalityTier = "TIER_1_MISSION_CRITICAL" | "TIER_2_BUSINESS_OPERATIONAL" | "TIER_3_SUPPORTING";

export interface SubProcessorBackupPolicy {
  vendorId: string;
  vendorName: string;
  criticalityTier: VendorCriticalityTier;
  wormObjectLockEnabled: boolean;
  immutableRetentionDays: number;
  dualCustodyQuorumEnabled: boolean;
  quorumMinimumApprovers: number;
  rpoMinutes: number;
  rtoMinutes: number;
  airGappedSecondaryVault: boolean;
  lastSimulatedRestoreTestIso?: string;
  maxDaysSinceLastDrTestAllowed?: number; // Defaults to 180 days
}

export interface RansomwareResilienceAuditReport {
  vendorId: string;
  vendorName: string;
  isCompliant: boolean;
  resilienceScore: number; // 0 to 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deficiencies: string[];
  recommendations: string[];
  auditDigestSha256: string;
}

export class SubProcessorRansomwareResilienceAuditor {
  private static readonly MIN_IMMUTABLE_RETENTION_DAYS = 30;
  private static readonly MAX_ALLOWED_RPO_MINUTES = 60; // 1 hour for Tier 1
  private static readonly MAX_ALLOWED_RTO_MINUTES = 240; // 4 hours for Tier 1

  /**
   * Evaluates vendor backup policies and produces a cryptographic compliance audit.
   */
  public static evaluateResilience(
    policy: SubProcessorBackupPolicy
  ): RansomwareResilienceAuditReport {
    if (!policy.vendorId || !policy.vendorName) {
      throw new Error("Invalid policy: vendorId and vendorName are required.");
    }

    const deficiencies: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 1. WORM Object Lock & Retention Audit
    if (!policy.wormObjectLockEnabled) {
      score -= 30;
      deficiencies.push("WORM / Immutable Object Lock is disabled on backup storage.");
      recommendations.push("Enable S3/GCS Object Lock in Compliance mode with strict retention lock.");
    } else if (policy.immutableRetentionDays < this.MIN_IMMUTABLE_RETENTION_DAYS) {
      score -= 15;
      deficiencies.push(
        `Immutable retention period (${policy.immutableRetentionDays}d) is below the minimum required standard (30d).`
      );
      recommendations.push("Extend immutable WORM retention to at least 30 days.");
    }

    // 2. Multi-Party Quorum / Dual-Custody Protection
    if (!policy.dualCustodyQuorumEnabled || policy.quorumMinimumApprovers < 2) {
      score -= 20;
      deficiencies.push("Dual-custody quorum deletion is absent or requires fewer than 2 distinct approvers.");
      recommendations.push("Enforce M-of-N multi-party approval workflows for backup lifecycle modifications.");
    }

    // 3. Air-Gapped / Isolated Secondary Vault
    if (!policy.airGappedSecondaryVault) {
      score -= 20;
      deficiencies.push("Air-gapped secondary vault replication is not configured.");
      recommendations.push("Replicate encrypted immutable backups to an isolated, cross-account AWS/GCP vault.");
    }

    // 4. RPO and RTO Thresholds (Tier 1 stringent check)
    if (policy.criticalityTier === "TIER_1_MISSION_CRITICAL") {
      if (policy.rpoMinutes > this.MAX_ALLOWED_RPO_MINUTES) {
        score -= 10;
        deficiencies.push(`RPO of ${policy.rpoMinutes}m exceeds Tier 1 limit (${this.MAX_ALLOWED_RPO_MINUTES}m).`);
        recommendations.push("Increase continuous snapshot frequency to achieve RPO <= 60 minutes.");
      }
      if (policy.rtoMinutes > this.MAX_ALLOWED_RTO_MINUTES) {
        score -= 10;
        deficiencies.push(`RTO of ${policy.rtoMinutes}m exceeds Tier 1 limit (${this.MAX_ALLOWED_RTO_MINUTES}m).`);
        recommendations.push("Implement automated IAC failover orchestration to lower RTO <= 240 minutes.");
      }
    }

    // 5. DR Simulation Recency
    const maxDrDays = policy.maxDaysSinceLastDrTestAllowed ?? 180;
    if (!policy.lastSimulatedRestoreTestIso) {
      score -= 10;
      deficiencies.push("No recorded disaster recovery restore simulation on record.");
      recommendations.push("Execute and document an annual or bi-annual bare-metal restore drill.");
    } else {
      const lastTestDate = new Date(policy.lastSimulatedRestoreTestIso).getTime();
      const now = Date.now();
      const daysSince = (now - lastTestDate) / (1000 * 60 * 60 * 24);
      if (daysSince > maxDrDays) {
        score -= 10;
        deficiencies.push(`Last DR restore test was ${Math.round(daysSince)} days ago, exceeding threshold (${maxDrDays}d).`);
        recommendations.push("Schedule an immediate DR tabletop and synthetic restore test.");
      }
    }

    const finalScore = Math.max(0, score);
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (finalScore < 50) riskLevel = "CRITICAL";
    else if (finalScore < 70) riskLevel = "HIGH";
    else if (finalScore < 85) riskLevel = "MEDIUM";

    const isCompliant = deficiencies.length === 0 && finalScore >= 85;

    const digestPayload = {
      vendorId: policy.vendorId,
      finalScore,
      riskLevel,
      deficienciesCount: deficiencies.length,
      wormObjectLockEnabled: policy.wormObjectLockEnabled,
      isCompliant
    };

    const auditDigestSha256 = createHash("sha256")
      .update(JSON.stringify(digestPayload))
      .digest("hex");

    return {
      vendorId: policy.vendorId,
      vendorName: policy.vendorName,
      isCompliant,
      resilienceScore: finalScore,
      riskLevel,
      deficiencies,
      recommendations,
      auditDigestSha256
    };
  }
}
