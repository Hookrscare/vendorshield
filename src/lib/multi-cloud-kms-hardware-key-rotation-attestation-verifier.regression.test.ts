/**
 * src/lib/multi-cloud-kms-hardware-key-rotation-attestation-verifier.regression.test.ts
 * Regression tests for QA-185: Multi-Cloud KMS Hardware Key Rotation Attestation Verifier.
 */

import { describe, it, expect } from "vitest";
import {
  MultiCloudKmsHardwareKeyRotationAttestationVerifier,
  type KeyRotationRequest,
} from "./multi-cloud-kms-hardware-key-rotation-attestation-verifier";

describe("QA-185: Multi-Cloud KMS Hardware Key Rotation Attestation Verifier", () => {
  const verifier = new MultiCloudKmsHardwareKeyRotationAttestationVerifier({
    maxKeyAgeDays: 90,
    minCustodianSignatures: 2,
  });

  const validPcr = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("should approve valid key rotation with M-of-N quorum and valid PCR attestation", () => {
    const req: KeyRotationRequest = {
      keyId: "kms-root-key-aws-us-east-1",
      provider: "AWS_KMS",
      currentKeyVersion: 3,
      creationTimestampIso: "2026-06-01T00:00:00Z",
      pcrDigestHex: validPcr,
      custodianSignatures: [
        { custodianId: "sec-ops-alice", signatureHex: "a1b2c3d4e5f67890123456789abcdef012345678", timestamp: "2026-09-13T10:00:00Z" },
        { custodianId: "ciso-bob", signatureHex: "f9e8d7c6b5a43210fedcba9876543210fedcba98", timestamp: "2026-09-13T10:05:00Z" },
      ],
      sampleEncryptedDekBase64: "dGVzdC1lbmNyeXB0ZWQtZGVrLXNhbXBsZQ==",
    };

    const res = verifier.verifyAndRotate(req, "2026-09-13T12:00:00Z");

    expect(res.rotationApproved).toBe(true);
    expect(res.rotatedKeyVersion).toBe(4);
    expect(res.complianceStatus).toBe("COMPLIANT");
    expect(res.hardwarePcrVerified).toBe(true);
    expect(res.keyAgeDays).toBeGreaterThanOrEqual(90);
    expect(res.rewrappedDekBase64).not.toBe(req.sampleEncryptedDekBase64);
    expect(res.attestationTokenSha256).toHaveLength(64);
  });

  it("should reject key rotation when custodian quorum is insufficient", () => {
    const req: KeyRotationRequest = {
      keyId: "kms-gcp-eu-central",
      provider: "GCP_CLOUD_HSM",
      currentKeyVersion: 1,
      creationTimestampIso: "2026-05-01T00:00:00Z",
      pcrDigestHex: validPcr,
      custodianSignatures: [
        { custodianId: "sec-ops-alice", signatureHex: "a1b2c3d4e5f67890123456789abcdef012345678", timestamp: "2026-09-13T10:00:00Z" }
        // Only 1 signature provided, minimum required is 2
      ],
      sampleEncryptedDekBase64: "c2FtcGxlLWRlaw==",
    };

    const res = verifier.verifyAndRotate(req, "2026-09-13T12:00:00Z");

    expect(res.rotationApproved).toBe(false);
    expect(res.rotatedKeyVersion).toBe(1); // Unchanged
    expect(res.complianceStatus).toBe("INSUFFICIENT_QUORUM");
  });

  it("should reject invalid or zeroed PCR hardware measurements", () => {
    const req: KeyRotationRequest = {
      keyId: "kms-azure-asia-east",
      provider: "AZURE_MANAGED_HSM",
      currentKeyVersion: 2,
      creationTimestampIso: "2026-06-01T00:00:00Z",
      pcrDigestHex: "0000000000000000000000000000000000000000000000000000000000000000",
      custodianSignatures: [
        { custodianId: "c1", signatureHex: "1234567890abcdef1234567890abcdef", timestamp: "2026-09-13T10:00:00Z" },
        { custodianId: "c2", signatureHex: "abcdef1234567890abcdef1234567890", timestamp: "2026-09-13T10:00:00Z" },
      ],
      sampleEncryptedDekBase64: "ZGVrLXNhbXBsZQ==",
    };

    const res = verifier.verifyAndRotate(req, "2026-09-13T12:00:00Z");

    expect(res.rotationApproved).toBe(false);
    expect(res.hardwarePcrVerified).toBe(false);
    expect(res.complianceStatus).toBe("NON_COMPLIANT_POLICY_BREACH");
  });
});
