/**
 * QA-132: Sub-Processor SOC 2 Continuous Evidence Telemetry Pipeline.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Continuous ingestion of AICPA Trust Service Criteria (TSC) compliance evidence
 * across access control, vulnerability management, change control, and backup recovery.
 * Generates cryptographic evidence chain digests for continuous audit assurance.
 */

import { createHash } from "crypto";

export type TscCategory =
  | "CC6_1_ACCESS_CONTROL"
  | "CC6_6_BOUNDARY_PROTECTION"
  | "CC7_1_VULNERABILITY_MANAGEMENT"
  | "CC8_1_CHANGE_MANAGEMENT"
  | "A1_2_BACKUP_AND_RECOVERY";

export interface EvidenceRecord {
  evidenceId: string;
  vendorId: string;
  tscCategory: TscCategory;
  providerSource: "AWS" | "GITHUB" | "CLOUDFLARE" | "DATADOG" | "INSFORGE" | "STRIPE";
  collectedAtIso: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: Record<string, any>;
  evidencePayloadSha256?: string;
}

export interface ContinuousAuditSummary {
  vendorId: string;
  evaluatedAtIso: string;
  totalEvidenceCount: number;
  passingCount: number;
  failingCount: number;
  warningCount: number;
  tscCompliancePercentages: Record<TscCategory, number>;
  overallReadinessScore: number; // 0 to 100
  auditReadinessStatus: "AUDIT_READY" | "REMEDIATION_REQUIRED" | "CRITICAL_NON_COMPLIANCE";
  evidenceMerkleRootSha256: string;
}

export class Soc2ContinuousEvidencePipeline {
  public static hashEvidence(record: EvidenceRecord): string {
    const canonical = JSON.stringify({
      id: record.evidenceId,
      vendor: record.vendorId,
      category: record.tscCategory,
      source: record.providerSource,
      status: record.status,
      details: record.details
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  public static evaluateContinuousEvidence(
    vendorId: string,
    evidenceStream: EvidenceRecord[],
    timestampIso: string = new Date().toISOString()
  ): ContinuousAuditSummary {
    if (evidenceStream.length === 0) {
      return {
        vendorId,
        evaluatedAtIso: timestampIso,
        totalEvidenceCount: 0,
        passingCount: 0,
        failingCount: 0,
        warningCount: 0,
        tscCompliancePercentages: {
          CC6_1_ACCESS_CONTROL: 0,
          CC6_6_BOUNDARY_PROTECTION: 0,
          CC7_1_VULNERABILITY_MANAGEMENT: 0,
          CC8_1_CHANGE_MANAGEMENT: 0,
          A1_2_BACKUP_AND_RECOVERY: 0
        },
        overallReadinessScore: 0,
        auditReadinessStatus: "CRITICAL_NON_COMPLIANCE",
        evidenceMerkleRootSha256: createHash("sha256").update("EMPTY").digest("hex")
      };
    }

    const hashedStream = evidenceStream.map(e => ({
      ...e,
      evidencePayloadSha256: e.evidencePayloadSha256 || this.hashEvidence(e)
    }));

    const categories: TscCategory[] = [
      "CC6_1_ACCESS_CONTROL",
      "CC6_6_BOUNDARY_PROTECTION",
      "CC7_1_VULNERABILITY_MANAGEMENT",
      "CC8_1_CHANGE_MANAGEMENT",
      "A1_2_BACKUP_AND_RECOVERY"
    ];

    const tscPercentages: Record<TscCategory, number> = {} as any;
    let passingTotal = 0;
    let failingTotal = 0;
    let warningTotal = 0;

    for (const cat of categories) {
      const items = hashedStream.filter(e => e.tscCategory === cat);
      if (items.length === 0) {
        tscPercentages[cat] = 0;
        continue;
      }
      const pass = items.filter(e => e.status === "PASS").length;
      const warn = items.filter(e => e.status === "WARNING").length;
      const fail = items.filter(e => e.status === "FAIL").length;

      passingTotal += pass;
      warningTotal += warn;
      failingTotal += fail;

      // Pass counts 100%, warning counts 50%
      const effectiveScore = (pass + warn * 0.5) / items.length;
      tscPercentages[cat] = Math.round(effectiveScore * 1000) / 10;
    }

    // Overall readiness score is average across all 5 TSC categories
    const avgCategoryScore = Object.values(tscPercentages).reduce((a, b) => a + b, 0) / categories.length;
    const readinessScore = Math.round(avgCategoryScore * 10) / 10;

    let auditStatus: ContinuousAuditSummary["auditReadinessStatus"] = "AUDIT_READY";
    if (failingTotal > 0 || readinessScore < 70) {
      auditStatus = readinessScore < 50 ? "CRITICAL_NON_COMPLIANCE" : "REMEDIATION_REQUIRED";
    }

    // Compute Merkle root of evidence hashes
    const sortedHashes = hashedStream.map(e => e.evidencePayloadSha256!).sort();
    const merklePayload = sortedHashes.join(":");
    const merkleRoot = createHash("sha256").update(merklePayload).digest("hex");

    return {
      vendorId,
      evaluatedAtIso: timestampIso,
      totalEvidenceCount: hashedStream.length,
      passingCount: passingTotal,
      failingCount: failingTotal,
      warningCount: warningTotal,
      tscCompliancePercentages: tscPercentages,
      overallReadinessScore: readinessScore,
      auditReadinessStatus: auditStatus,
      evidenceMerkleRootSha256: merkleRoot
    };
  }
}
