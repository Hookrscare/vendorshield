import { describe, it, expect } from "vitest";
import {
  SubProcessorRansomwareResilienceAuditor,
  SubProcessorBackupPolicy
} from "./sub-processor-ransomware-resilience-auditor";

describe("SubProcessorRansomwareResilienceAuditor (QA-120)", () => {
  const compliantPolicy: SubProcessorBackupPolicy = {
    vendorId: "VND-SNOWFLAKE-01",
    vendorName: "Snowflake Data Cloud",
    criticalityTier: "TIER_1_MISSION_CRITICAL",
    wormObjectLockEnabled: true,
    immutableRetentionDays: 90,
    dualCustodyQuorumEnabled: true,
    quorumMinimumApprovers: 3,
    rpoMinutes: 15,
    rtoMinutes: 60,
    airGappedSecondaryVault: true,
    lastSimulatedRestoreTestIso: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
  };

  it("should validate a compliant vendor with 100 resilience score and low risk", () => {
    const report = SubProcessorRansomwareResilienceAuditor.evaluateResilience(compliantPolicy);

    expect(report.isCompliant).toBe(true);
    expect(report.resilienceScore).toBe(100);
    expect(report.riskLevel).toBe("LOW");
    expect(report.deficiencies).toHaveLength(0);
    expect(report.recommendations).toHaveLength(0);
    expect(report.auditDigestSha256).toHaveLength(64);
  });

  it("should penalize vendor lacking WORM locks and air-gapped backups as CRITICAL risk", () => {
    const vulnerablePolicy: SubProcessorBackupPolicy = {
      vendorId: "VND-LEGACY-09",
      vendorName: "Legacy Invoicing Service",
      criticalityTier: "TIER_1_MISSION_CRITICAL",
      wormObjectLockEnabled: false,
      immutableRetentionDays: 0,
      dualCustodyQuorumEnabled: false,
      quorumMinimumApprovers: 1,
      rpoMinutes: 180, // Exceeds 60 min limit
      rtoMinutes: 600, // Exceeds 240 min limit
      airGappedSecondaryVault: false
    };

    const report = SubProcessorRansomwareResilienceAuditor.evaluateResilience(vulnerablePolicy);

    expect(report.isCompliant).toBe(false);
    expect(report.resilienceScore).toBeLessThan(50);
    expect(report.riskLevel).toBe("CRITICAL");
    expect(report.deficiencies).toContain("WORM / Immutable Object Lock is disabled on backup storage.");
    expect(report.deficiencies).toContain("Air-gapped secondary vault replication is not configured.");
    expect(report.recommendations.length).toBeGreaterThanOrEqual(3);
  });

  it("should fail validation if vendorId is missing", () => {
    expect(() => {
      SubProcessorRansomwareResilienceAuditor.evaluateResilience({
        ...compliantPolicy,
        vendorId: ""
      });
    }).toThrow(/vendorId and vendorName are required/);
  });
});
