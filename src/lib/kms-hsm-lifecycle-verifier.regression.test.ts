/**
 * QA-143: Regression tests for MultiCloud KMS HSM Lifecycle Verifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import { MultiCloudKmsHsmVerifier, HsmKeyRecord } from "./kms-hsm-lifecycle-verifier";

describe("MultiCloudKmsHsmVerifier (QA-143)", () => {
  const verifier = new MultiCloudKmsHsmVerifier({
    maxAllowedRotationDays: 365,
    minDestructionGraceDays: 7
  });

  const validKey: HsmKeyRecord = {
    keyId: "arn:aws:kms:us-east-1:123456789012:key/hsm-001",
    provider: "AWS_KMS",
    protectionLevel: "FIPS_140_2_L3",
    status: "ACTIVE",
    createdAtIso: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    lastRotatedAtIso: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    rotationPeriodDays: 365,
    dualControlEnforced: true,
    destructionGracePeriodDays: 14,
    attestationSignatureSha256: "a".repeat(64)
  };

  it("passes evaluation for fully compliant FIPS 140-2 Level 3 HSM key", () => {
    const result = verifier.evaluateKey(validKey);
    expect(result.isCompliant).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("fails evaluation if key uses SOFTWARE protection level instead of HSM", () => {
    const nonHsmKey: HsmKeyRecord = {
      ...validKey,
      protectionLevel: "SOFTWARE"
    };
    const result = verifier.evaluateKey(nonHsmKey);
    expect(result.isCompliant).toBe(false);
    expect(result.issues.some(i => i.includes("fails hardware isolation"))).toBe(true);
  });

  it("flags rotation overdue keys", () => {
    const overdueKey: HsmKeyRecord = {
      ...validKey,
      lastRotatedAtIso: new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString()
    };
    const result = verifier.evaluateKey(overdueKey);
    expect(result.isCompliant).toBe(false);
    expect(result.issues.some(i => i.includes("rotation overdue"))).toBe(true);
  });

  it("enforces dual control policies", () => {
    const noDualControlKey: HsmKeyRecord = {
      ...validKey,
      dualControlEnforced: false
    };
    const result = verifier.evaluateKey(noDualControlKey);
    expect(result.isCompliant).toBe(false);
    expect(result.issues.some(i => i.includes("dual-control"))).toBe(true);
  });

  it("audits multi-cloud key fleet and produces signed certificate", () => {
    const fleet: HsmKeyRecord[] = [
      validKey,
      {
        ...validKey,
        keyId: "projects/corp/locations/us/keyRings/hsm/cryptoKeys/gcp-01",
        provider: "GCP_CLOUD_KMS",
        protectionLevel: "FIPS_140_3_L3"
      },
      {
        ...validKey,
        keyId: "https://corp-vault.managedhsm.azure.net/keys/az-01",
        provider: "AZURE_KEY_VAULT",
        protectionLevel: "FIPS_140_2_L3"
      }
    ];

    const audit = verifier.auditFleet(fleet);
    expect(audit.verified).toBe(true);
    expect(audit.score).toBe(100);
    expect(audit.complianceGrade).toBe("A_PLUS");
    expect(audit.certificate.compliantKeysCount).toBe(3);
    expect(audit.certificate.providerBreakdown.AWS_KMS).toBe(1);
    expect(audit.certificate.providerBreakdown.GCP_CLOUD_KMS).toBe(1);
    expect(audit.certificate.providerBreakdown.AZURE_KEY_VAULT).toBe(1);
    expect(audit.certificate.integrityHashSha256).toHaveLength(64);
  });
});
