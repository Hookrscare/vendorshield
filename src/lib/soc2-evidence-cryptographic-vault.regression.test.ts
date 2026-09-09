/**
 * Regression tests for QA-136: Multi-Tenant SOC 2 Type II Automated Evidence Repository Cryptographic Vault.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SOC2EvidenceCryptographicVault,
  EvidenceArtifact
} from "./soc2-evidence-cryptographic-vault";

describe("QA-136: SOC2EvidenceCryptographicVault Regression Tests", () => {
  let vault: SOC2EvidenceCryptographicVault;

  beforeEach(() => {
    vault = new SOC2EvidenceCryptographicVault("test-audit-key-99");
  });

  it("seals artifacts and computes reproducible Merkle root hashes", () => {
    const art1: EvidenceArtifact = {
      artifactId: "ART-001",
      tenantId: "TENANT-ALPHA",
      trustCriteria: "SECURITY_CC6",
      controlId: "CC6.1",
      title: "Quarterly IAM Access Review",
      rawPayload: JSON.stringify({ usersReviewed: 142, revokedCount: 3 }),
      collectedAt: "2026-09-01T10:00:00Z"
    };

    const art2: EvidenceArtifact = {
      artifactId: "ART-002",
      tenantId: "TENANT-ALPHA",
      trustCriteria: "SECURITY_CC6",
      controlId: "CC6.8",
      title: "Automated KMS Key Rotation Audit",
      rawPayload: JSON.stringify({ keyAlias: "kms/primary", rotationPeriodDays: 90 }),
      collectedAt: "2026-09-02T12:00:00Z"
    };

    const sealed1 = vault.sealArtifact(art1);
    const sealed2 = vault.sealArtifact(art2);

    expect(sealed1.artifactHash).toHaveLength(64);
    expect(sealed2.artifactHash).toHaveLength(64);

    const root = vault.computeTenantMerkleRoot("TENANT-ALPHA");
    expect(root).toHaveLength(64);

    const audit = vault.verifyTenantVault("TENANT-ALPHA");
    expect(audit.totalArtifacts).toBe(2);
    expect(audit.tamperEvidentChainValid).toBe(true);
    expect(audit.criteriaCoverage["SECURITY_CC6"]).toBe(2);
    expect(audit.hmacSignature).toHaveLength(64);
  });

  it("detects tampering when an artifact payload has been altered", () => {
    const art: EvidenceArtifact = {
      artifactId: "ART-MOD",
      tenantId: "TENANT-BETA",
      trustCriteria: "AVAILABILITY_A1",
      controlId: "A1.2",
      title: "Multi-AZ Disaster Recovery Simulation",
      rawPayload: "RTO=15min;RPO=1min",
      collectedAt: "2026-09-05T00:00:00Z"
    };

    const sealed = vault.sealArtifact(art);
    expect(sealed.artifactHash).toBeDefined();

    // Tamper with payload in-memory
    sealed.rawPayload = "RTO=48hr;RPO=24hr";

    const audit = vault.verifyTenantVault("TENANT-BETA");
    expect(audit.tamperEvidentChainValid).toBe(false);
  });
});
