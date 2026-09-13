import { describe, it, expect } from "vitest";
import {
  SOC2ScopedEvidenceArchiveSealer,
  ScopedEvidenceItem,
  TrustServiceCategory,
} from "./soc2-scoped-evidence-archive-seal";

describe("QA-167: SOC2 Scoped Evidence Archive Export & Integrity Seal", () => {
  const sealer = new SOC2ScopedEvidenceArchiveSealer("test-audit-seal-key-99");

  const sampleItems: ScopedEvidenceItem[] = [
    {
      itemId: "EV-001",
      tenantId: "TENANT-ACME",
      category: "SECURITY_CC",
      controlRef: "CC6.1",
      title: "Logical Access Controls IAM Role Matrix",
      content: JSON.stringify({ role: "admin", mfaRequired: true }),
      collectedAt: "2026-05-10T12:00:00Z",
    },
    {
      itemId: "EV-002",
      tenantId: "TENANT-ACME",
      category: "AVAILABILITY_A",
      controlRef: "A1.2",
      title: "Automated Multi-Region Disaster Recovery Drill",
      content: JSON.stringify({ rtoMinutes: 12, rpoMinutes: 0, status: "PASSED" }),
      collectedAt: "2026-06-15T15:30:00Z",
    },
    {
      itemId: "EV-003",
      tenantId: "TENANT-OTHER", // Different tenant - must be excluded
      category: "SECURITY_CC",
      controlRef: "CC6.1",
      title: "Other Corp IAM Config",
      content: "SECRET_OTHER_DATA",
      collectedAt: "2026-05-12T10:00:00Z",
    },
    {
      itemId: "EV-004",
      tenantId: "TENANT-ACME",
      category: "CONFIDENTIALITY_C",
      controlRef: "C1.1",
      title: "KMS Envelope Encryption Key Rotation Logs",
      content: JSON.stringify({ keyId: "kms-acme-prod-01", rotationPeriodDays: 90 }),
      collectedAt: "2026-07-01T08:00:00Z",
    },
    {
      itemId: "EV-005",
      tenantId: "TENANT-ACME",
      category: "SECURITY_CC",
      controlRef: "CC7.1",
      title: "Out of audit window evidence",
      content: "ANCIENT_LOG",
      collectedAt: "2025-01-01T00:00:00Z", // Out of period - must be excluded
    },
  ];

  it("should generate a strictly scoped archive isolating tenant and date window", () => {
    const period = { startDate: "2026-05-01T00:00:00Z", endDate: "2026-06-30T23:59:59Z" };
    const categories: TrustServiceCategory[] = ["SECURITY_CC", "AVAILABILITY_A"];

    const pkg = sealer.generateScopedArchive("TENANT-ACME", sampleItems, period, categories);

    expect(pkg.manifest.tenantId).toBe("TENANT-ACME");
    expect(pkg.manifest.totalArtifacts).toBe(2);
    expect(pkg.manifest.artifacts.map((a) => a.itemId)).toEqual(["EV-001", "EV-002"]);
    expect(pkg.payloads["EV-003"]).toBeUndefined();
    expect(pkg.payloads["EV-005"]).toBeUndefined();
    expect(pkg.manifest.merkleRootHash).toBeDefined();
    expect(pkg.manifest.integritySealSignature).toBeDefined();
  });

  it("should verify valid archive package with zero tamper warnings", () => {
    const period = { startDate: "2026-05-01T00:00:00Z", endDate: "2026-07-31T23:59:59Z" };
    const categories: TrustServiceCategory[] = ["SECURITY_CC", "AVAILABILITY_A", "CONFIDENTIALITY_C"];

    const pkg = sealer.generateScopedArchive("TENANT-ACME", sampleItems, period, categories);
    const report = sealer.verifyArchiveSeal(pkg);

    expect(report.isValid).toBe(true);
    expect(report.merkleRootMatches).toBe(true);
    expect(report.signatureMatches).toBe(true);
    expect(report.tamperedArtifactIds).toHaveLength(0);
    expect(report.checkedArtifacts).toBe(3);
  });

  it("should detect artifact payload modification and invalidate Merkle root", () => {
    const period = { startDate: "2026-05-01T00:00:00Z", endDate: "2026-07-31T23:59:59Z" };
    const categories: TrustServiceCategory[] = ["SECURITY_CC", "AVAILABILITY_A", "CONFIDENTIALITY_C"];

    const pkg = sealer.generateScopedArchive("TENANT-ACME", sampleItems, period, categories);

    // Tamper with payload
    pkg.payloads["EV-001"] = JSON.stringify({ role: "admin", mfaRequired: false, backdoor: true });

    const report = sealer.verifyArchiveSeal(pkg);
    expect(report.isValid).toBe(false);
    expect(report.tamperedArtifactIds).toContain("EV-001");
    expect(report.merkleRootMatches).toBe(false);
  });

  it("should detect forged seal signature", () => {
    const period = { startDate: "2026-05-01T00:00:00Z", endDate: "2026-07-31T23:59:59Z" };
    const categories: TrustServiceCategory[] = ["SECURITY_CC"];

    const pkg = sealer.generateScopedArchive("TENANT-ACME", sampleItems, period, categories);
    pkg.manifest.integritySealSignature = "forged_malicious_signature_hex";

    const report = sealer.verifyArchiveSeal(pkg);
    expect(report.isValid).toBe(false);
    expect(report.signatureMatches).toBe(false);
  });
});
