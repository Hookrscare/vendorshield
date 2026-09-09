/**
 * QA-132 Regression Test Suite: Sub-Processor SOC 2 Continuous Evidence Telemetry Pipeline.
 */

import { describe, it, expect } from "vitest";
import {
  Soc2ContinuousEvidencePipeline,
  EvidenceRecord
} from "./soc2-continuous-evidence";

describe("QA-132: SOC 2 Continuous Evidence Telemetry Pipeline", () => {
  it("scores 100% AUDIT_READY for comprehensive passing evidence stream", () => {
    const stream: EvidenceRecord[] = [
      {
        evidenceId: "ev-iam-1",
        vendorId: "v-aws",
        tscCategory: "CC6_1_ACCESS_CONTROL",
        providerSource: "AWS",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "PASS",
        details: { mfaEnforcedUsersPct: 100 }
      },
      {
        evidenceId: "ev-waf-1",
        vendorId: "v-aws",
        tscCategory: "CC6_6_BOUNDARY_PROTECTION",
        providerSource: "CLOUDFLARE",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "PASS",
        details: { tlsVersion: "TLSv1.3", ddosMitigationActive: true }
      },
      {
        evidenceId: "ev-vuln-1",
        vendorId: "v-aws",
        tscCategory: "CC7_1_VULNERABILITY_MANAGEMENT",
        providerSource: "GITHUB",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "PASS",
        details: { dependabotAlertsOpen: 0 }
      },
      {
        evidenceId: "ev-pr-1",
        vendorId: "v-aws",
        tscCategory: "CC8_1_CHANGE_MANAGEMENT",
        providerSource: "GITHUB",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "PASS",
        details: { peerReviewsEnforced: true, branchProtection: true }
      },
      {
        evidenceId: "ev-bak-1",
        vendorId: "v-aws",
        tscCategory: "A1_2_BACKUP_AND_RECOVERY",
        providerSource: "INSFORGE",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "PASS",
        details: { lastBackupVerified: true, replicationLagSeconds: 0.8 }
      }
    ];

    const summary = Soc2ContinuousEvidencePipeline.evaluateContinuousEvidence("v-aws", stream);
    expect(summary.auditReadinessStatus).toBe("AUDIT_READY");
    expect(summary.overallReadinessScore).toBe(100);
    expect(summary.passingCount).toBe(5);
    expect(summary.failingCount).toBe(0);
    expect(summary.evidenceMerkleRootSha256).toBeDefined();
  });

  it("flags REMEDIATION_REQUIRED when critical criteria fail", () => {
    const stream: EvidenceRecord[] = [
      {
        evidenceId: "ev-iam-fail",
        vendorId: "v-legacy",
        tscCategory: "CC6_1_ACCESS_CONTROL",
        providerSource: "AWS",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "FAIL",
        details: { unmanagedRootAccounts: 2 }
      },
      {
        evidenceId: "ev-vuln-warn",
        vendorId: "v-legacy",
        tscCategory: "CC7_1_VULNERABILITY_MANAGEMENT",
        providerSource: "GITHUB",
        collectedAtIso: "2026-09-09T00:00:00Z",
        status: "WARNING",
        details: { overdueMediumCve: 1 }
      }
    ];

    const summary = Soc2ContinuousEvidencePipeline.evaluateContinuousEvidence("v-legacy", stream);
    expect(summary.failingCount).toBe(1);
    expect(summary.auditReadinessStatus).toBe("CRITICAL_NON_COMPLIANCE");
    expect(summary.overallReadinessScore).toBeLessThan(50);
  });

  it("handles empty evidence stream gracefully", () => {
    const summary = Soc2ContinuousEvidencePipeline.evaluateContinuousEvidence("v-empty", []);
    expect(summary.totalEvidenceCount).toBe(0);
    expect(summary.overallReadinessScore).toBe(0);
    expect(summary.auditReadinessStatus).toBe("CRITICAL_NON_COMPLIANCE");
  });
});
