/**
 * QA-147: Automated Cloud Security Posture (CSPM) Compliance Drift Heuristics Engine.
 * VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Evaluates infrastructure configuration drift against SOC 2 Trust Services Criteria (CC6.1-CC7.2),
 * ISO 27001:2022 Annex A, and GDPR Article 32 technical security baselines across multi-cloud workloads.
 */

import { createHash } from "crypto";

export type CloudProvider = "AWS" | "GCP" | "AZURE" | "INSFORGE";

export type ResourceType =
  | "STORAGE_BUCKET"
  | "IAM_ROLE"
  | "KMS_KEY"
  | "COMPUTE_INSTANCE"
  | "DATABASE"
  | "SECURITY_GROUP";

export type DriftSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CloudResourceSnapshot {
  resourceId: string;
  resourceType: ResourceType;
  provider: CloudProvider;
  region: string;
  isPubliclyAccessible: boolean;
  encryptionAtRestEnabled: boolean;
  kmsKeyRotationEnabled: boolean;
  mfaRequiredForAccess: boolean;
  openIngressPorts: number[];
  backupRetentionDays: number;
  tags: Record<string, string>;
}

export interface ComplianceDriftViolation {
  ruleId: string;
  title: string;
  severity: DriftSeverity;
  frameworkControl: "SOC2_CC6.1" | "SOC2_CC6.6" | "SOC2_CC6.7" | "SOC2_CC7.1" | "GDPR_ART_32";
  remediationPlan: string;
}

export interface CSPMEvaluationResult {
  resourceId: string;
  provider: CloudProvider;
  resourceType: ResourceType;
  isCompliant: boolean;
  violations: ComplianceDriftViolation[];
  postureScore: number; // 0 - 100
  driftAuditHash: string;
}

export interface CSPMSummaryReport {
  timestamp: string;
  totalEvaluated: number;
  compliantCount: number;
  criticalViolationsCount: number;
  overallPostureScore: number;
  results: CSPMEvaluationResult[];
  reportDigestSha256: string;
}

export class CSPMComplianceDriftEngine {
  private severityWeights: Record<DriftSeverity, number> = {
    INFO: 1,
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30,
    CRITICAL: 50,
  };

  public evaluateResource(resource: CloudResourceSnapshot): CSPMEvaluationResult {
    const violations: ComplianceDriftViolation[] = [];

    // 1. Storage bucket public exposure check
    if (resource.resourceType === "STORAGE_BUCKET" && resource.isPubliclyAccessible) {
      violations.push({
        ruleId: "CSPM-STR-001",
        title: "Public Storage Bucket Egress Exposure",
        severity: "CRITICAL",
        frameworkControl: "SOC2_CC6.6",
        remediationPlan: "Enable Block Public Access (BPA) and enforce strict IAM bucket policy.",
      });
    }

    // 2. Encryption at rest check
    if (!resource.encryptionAtRestEnabled) {
      violations.push({
        ruleId: "CSPM-ENC-001",
        title: "Missing Encryption at Rest",
        severity: "HIGH",
        frameworkControl: "GDPR_ART_32",
        remediationPlan: "Enforce AES-256 or KMS customer-managed key (CMK) encryption.",
      });
    }

    // 3. KMS key rotation
    if (resource.resourceType === "KMS_KEY" && !resource.kmsKeyRotationEnabled) {
      violations.push({
        ruleId: "CSPM-KMS-002",
        title: "Disabled Automatic Key Rotation",
        severity: "MEDIUM",
        frameworkControl: "SOC2_CC6.7",
        remediationPlan: "Enable annual or 90-day automatic cryptographic key rotation.",
      });
    }

    // 4. Privileged IAM Role MFA
    if (resource.resourceType === "IAM_ROLE" && !resource.mfaRequiredForAccess) {
      violations.push({
        ruleId: "CSPM-IAM-003",
        title: "IAM Role Accessible Without Multi-Factor Authentication",
        severity: "HIGH",
        frameworkControl: "SOC2_CC6.1",
        remediationPlan: "Attach aws:MultiFactorAuthPresent condition to assume-role policy.",
      });
    }

    // 5. Unrestricted ingress (SSH 22, RDP 3389, DB 5432/3306)
    const dangerousPorts = [22, 3389, 5432, 3306, 27017];
    const exposedDangerous = resource.openIngressPorts.filter((p) => dangerousPorts.includes(p));
    if (exposedDangerous.length > 0) {
      violations.push({
        ruleId: "CSPM-NET-004",
        title: `Management/Database Port Publicly Reachable (${exposedDangerous.join(", ")})`,
        severity: "CRITICAL",
        frameworkControl: "SOC2_CC6.6",
        remediationPlan: "Remove 0.0.0.0/0 ingress rules and restrict to VPN/Bastion CIDR blocks.",
      });
    }

    // 6. Data retention and backup
    if (["DATABASE", "STORAGE_BUCKET"].includes(resource.resourceType) && resource.backupRetentionDays < 7) {
      violations.push({
        ruleId: "CSPM-BCP-005",
        title: "Insufficient Disaster Recovery Backup Retention Window",
        severity: "LOW",
        frameworkControl: "SOC2_CC7.1",
        remediationPlan: "Increase snapshot/WAL archive retention policy to minimum 30 days.",
      });
    }

    // Calculate score
    const penalty = violations.reduce((acc, v) => acc + this.severityWeights[v.severity], 0);
    const postureScore = Math.max(0, 100 - penalty);
    const isCompliant = violations.length === 0;

    const digestPayload = `${resource.resourceId}:${resource.provider}:${postureScore}:${violations.length}`;
    const driftAuditHash = createHash("sha256").update(digestPayload).digest("hex");

    return {
      resourceId: resource.resourceId,
      provider: resource.provider,
      resourceType: resource.resourceType,
      isCompliant,
      violations,
      postureScore,
      driftAuditHash,
    };
  }

  public generateSummaryReport(resources: CloudResourceSnapshot[]): CSPMSummaryReport {
    const timestamp = new Date().toISOString();
    const results = resources.map((r) => this.evaluateResource(r));

    const compliantCount = results.filter((r) => r.isCompliant).length;
    const criticalViolationsCount = results.reduce(
      (acc, r) => acc + r.violations.filter((v) => v.severity === "CRITICAL").length,
      0
    );

    const overallPostureScore =
      results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.postureScore, 0) / results.length)
        : 100;

    const reportPayload = `${timestamp}:${results.length}:${overallPostureScore}:${criticalViolationsCount}`;
    const reportDigestSha256 = createHash("sha256").update(reportPayload).digest("hex");

    return {
      timestamp,
      totalEvaluated: results.length,
      compliantCount,
      criticalViolationsCount,
      overallPostureScore,
      results,
      reportDigestSha256,
    };
  }
}
