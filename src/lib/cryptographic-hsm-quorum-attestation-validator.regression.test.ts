import { describe, it, expect } from "vitest";
import {
  CryptographicHsmQuorumAttestationValidator,
  HsmAttestationStatement,
  EscrowShare,
  EscrowQuorumConfig
} from "./cryptographic-hsm-quorum-attestation-validator";

describe("QA-203: CryptographicHsmQuorumAttestationValidator", () => {
  const validStatement: HsmAttestationStatement = {
    hsmVendor: "AWS_CLOUDHSM",
    fipsLevel: "LEVEL_3",
    firmwareVersion: "v3.4.1",
    hardwareSerial: "HSM-SERIAL-US-EAST-9901",
    attestationCertFingerprint: "sha256:abcd1234efgh5678ijkl9012mnop3456",
    isExportable: false,
    tamperEvidentSealVerified: true
  };

  const quorumConfig: EscrowQuorumConfig = {
    thresholdM: 2,
    totalSharesN: 3,
    maxShareAgeHours: 24,
    enforceGeographicSeparation: false
  };

  it("should validate compliant FIPS 140-3 Level 3 HSM statements", () => {
    const res = CryptographicHsmQuorumAttestationValidator.validateHsmAttestation(validStatement);
    expect(res.isValid).toBe(true);
    expect(res.complianceRating).toBe("COMPLIANT");
    expect(res.violations).toHaveLength(0);
  });

  it("should reject exportable keys or unverified tamper seals", () => {
    const invalidStatement: HsmAttestationStatement = {
      ...validStatement,
      isExportable: true,
      tamperEvidentSealVerified: false
    };
    const res = CryptographicHsmQuorumAttestationValidator.validateHsmAttestation(invalidStatement);
    expect(res.isValid).toBe(false);
    expect(res.complianceRating).toBe("NON_COMPLIANT");
    expect(res.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("should verify M-of-N threshold quorum key escrow shares", () => {
    const now = new Date();
    const shares: EscrowShare[] = [
      {
        shareId: 1,
        custodianId: "custodian_alice",
        encryptedKeyShare: "enc_payload_1",
        shareHash: "a".repeat(64),
        issuedAt: new Date(now.getTime() - 3600000),
        dataCenterRegion: "us-east-1"
      },
      {
        shareId: 2,
        custodianId: "custodian_bob",
        encryptedKeyShare: "enc_payload_2",
        shareHash: "b".repeat(64),
        issuedAt: new Date(now.getTime() - 3600000),
        dataCenterRegion: "us-west-2"
      }
    ];

    const quorumRes = CryptographicHsmQuorumAttestationValidator.validateQuorum(
      validStatement,
      quorumConfig,
      shares,
      now
    );
    expect(quorumRes.isQuorumSatisfied).toBe(true);
    expect(quorumRes.activeSharesCount).toBe(2);
    expect(quorumRes.recommendedAction).toBe("APPROVE_OPERATION");
    expect(quorumRes.auditDigest).toHaveLength(64);
  });
});
