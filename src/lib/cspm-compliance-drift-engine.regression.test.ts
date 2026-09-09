/**
 * Regression test suite for QA-147: Automated Cloud Security Posture (CSPM) Compliance Drift Heuristics Engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CSPMComplianceDriftEngine,
  CloudResourceSnapshot,
} from "./cspm-compliance-drift-engine";

describe("QA-147: CSPM Compliance Drift Heuristics Engine", () => {
  let engine: CSPMComplianceDriftEngine;

  beforeEach(() => {
    engine = new CSPMComplianceDriftEngine();
  });

  it("should pass fully compliant hardened cloud resources with 100 posture score", () => {
    const resource: CloudResourceSnapshot = {
      resourceId: "arn:aws:s3:::vendorshield-soc2-vault",
      resourceType: "STORAGE_BUCKET",
      provider: "AWS",
      region: "us-east-1",
      isPubliclyAccessible: false,
      encryptionAtRestEnabled: true,
      kmsKeyRotationEnabled: true,
      mfaRequiredForAccess: true,
      openIngressPorts: [],
      backupRetentionDays: 90,
      tags: { Environment: "production", DataClassification: "Restricted" },
    };

    const res = engine.evaluateResource(resource);
    expect(res.isCompliant).toBe(true);
    expect(res.violations.length).toBe(0);
    expect(res.postureScore).toBe(100);
    expect(res.driftAuditHash).toHaveLength(64);
  });

  it("should flag public S3/GCS bucket and open database ports as CRITICAL violations", () => {
    const leakyResource: CloudResourceSnapshot = {
      resourceId: "gcp-storage-leaky-bucket-01",
      resourceType: "STORAGE_BUCKET",
      provider: "GCP",
      region: "us-central1",
      isPubliclyAccessible: true,
      encryptionAtRestEnabled: false,
      kmsKeyRotationEnabled: false,
      mfaRequiredForAccess: false,
      openIngressPorts: [5432, 22],
      backupRetentionDays: 1,
      tags: { Environment: "staging" },
    };

    const res = engine.evaluateResource(leakyResource);
    expect(res.isCompliant).toBe(false);
    expect(res.violations.length).toBeGreaterThanOrEqual(3);

    const criticalViolations = res.violations.filter((v) => v.severity === "CRITICAL");
    expect(criticalViolations.length).toBeGreaterThanOrEqual(2);
    expect(criticalViolations.some((v) => v.ruleId === "CSPM-STR-001")).toBe(true);
    expect(criticalViolations.some((v) => v.ruleId === "CSPM-NET-004")).toBe(true);
    expect(res.postureScore).toBeLessThan(50);
  });

  it("should aggregate multi-cloud fleet posture into an executive summary report with cryptographic digest", () => {
    const fleet: CloudResourceSnapshot[] = [
      {
        resourceId: "kms-cmk-01",
        resourceType: "KMS_KEY",
        provider: "AWS",
        region: "us-east-1",
        isPubliclyAccessible: false,
        encryptionAtRestEnabled: true,
        kmsKeyRotationEnabled: false, // medium violation
        mfaRequiredForAccess: true,
        openIngressPorts: [],
        backupRetentionDays: 30,
        tags: {},
      },
      {
        resourceId: "db-replica-01",
        resourceType: "DATABASE",
        provider: "INSFORGE",
        region: "us-west-2",
        isPubliclyAccessible: false,
        encryptionAtRestEnabled: true,
        kmsKeyRotationEnabled: true,
        mfaRequiredForAccess: true,
        openIngressPorts: [],
        backupRetentionDays: 30,
        tags: {},
      },
    ];

    const report = engine.generateSummaryReport(fleet);
    expect(report.totalEvaluated).toBe(2);
    expect(report.compliantCount).toBe(1);
    expect(report.criticalViolationsCount).toBe(0);
    expect(report.overallPostureScore).toBeGreaterThan(80);
    expect(report.reportDigestSha256).toHaveLength(64);
  });
});
