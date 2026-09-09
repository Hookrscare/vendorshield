import { describe, it, expect } from "vitest";
import { ZeroKnowledgeKeyRotationPipeline } from "./zero-knowledge-key-rotation";

describe("QA-136: Multi-Tenant Zero-Knowledge Data Encryption Key Rotation Pipeline", () => {
  it("initializes tenant keyring and validates envelope encryption round-trip", () => {
    const pipeline = new ZeroKnowledgeKeyRotationPipeline();
    const tenantId = "tenant-enterprise-99";
    const keyring = pipeline.initializeTenant(tenantId, { maxAgeDays: 30, maxEncryptions: 5 });

    expect(keyring.tenantId).toBe(tenantId);
    expect(keyring.activeVersion).toBe(1);
    expect(keyring.keys).toHaveLength(1);
    expect(keyring.keys[0].status).toBe("ACTIVE");

    const secretText = "Confidential B2B Vendor Compliance Dossier";
    const payload = pipeline.encryptData(tenantId, secretText);

    expect(payload.keyVersion).toBe(1);
    expect(payload.ciphertextBase64).toBeTruthy();
    expect(payload.tagBase64).toBeTruthy();
    expect(payload.fingerprintSha256).toBe(keyring.keys[0].keyFingerprintSha256);

    const decrypted = pipeline.decryptData(payload);
    expect(decrypted).toBe(secretText);
  });

  it("triggers volume threshold and executes key rotation with zero-knowledge re-encryption", () => {
    const pipeline = new ZeroKnowledgeKeyRotationPipeline();
    const tenantId = "tenant-finance-42";
    pipeline.initializeTenant(tenantId, { maxEncryptions: 2 });

    const p1 = pipeline.encryptData(tenantId, "Record 1: SOC 2 Evidence");
    const p2 = pipeline.encryptData(tenantId, "Record 2: DPA Addendum");

    const check = pipeline.checkRotationNeeded(tenantId);
    expect(check.needed).toBe(true);
    expect(check.reason).toBe("VOLUME_THRESHOLD");

    const { certificate, reEncryptedPayloads } = pipeline.rotateKey(
      tenantId,
      "VOLUME_THRESHOLD",
      [p1, p2]
    );

    expect(certificate.previousVersion).toBe(1);
    expect(certificate.newVersion).toBe(2);
    expect(certificate.rotationReason).toBe("VOLUME_THRESHOLD");
    expect(certificate.reEncryptedPayloadCount).toBe(2);
    expect(certificate.certificateHashSha256).toHaveLength(64);

    const keyring = pipeline.getKeyring(tenantId);
    expect(keyring.activeVersion).toBe(2);
    expect(keyring.keys.find(k => k.version === 1)?.status).toBe("RETIRED");
    expect(keyring.keys.find(k => k.version === 2)?.status).toBe("ACTIVE");

    // Verify re-encrypted payloads are on version 2 and decrypt to original values
    expect(reEncryptedPayloads[0].keyVersion).toBe(2);
    expect(reEncryptedPayloads[1].keyVersion).toBe(2);
    expect(pipeline.decryptData(reEncryptedPayloads[0])).toBe("Record 1: SOC 2 Evidence");
    expect(pipeline.decryptData(reEncryptedPayloads[1])).toBe("Record 2: DPA Addendum");
  });

  it("handles emergency key revocation for compromised keys", () => {
    const pipeline = new ZeroKnowledgeKeyRotationPipeline();
    const tenantId = "tenant-compromised-incident";
    pipeline.initializeTenant(tenantId);

    const payload = pipeline.encryptData(tenantId, "Sensitive PII Data");
    const { certificate, reEncryptedPayloads } = pipeline.rotateKey(
      tenantId,
      "EMERGENCY_REVOCATION",
      [payload]
    );

    expect(certificate.rotationReason).toBe("EMERGENCY_REVOCATION");
    const keyring = pipeline.getKeyring(tenantId);
    const v1Key = keyring.keys.find(k => k.version === 1);
    expect(v1Key?.status).toBe("COMPROMISED_REVOKED");
    expect(v1Key?.revocationReason).toContain("emergency security incident");

    expect(pipeline.decryptData(reEncryptedPayloads[0])).toBe("Sensitive PII Data");
  });
});
