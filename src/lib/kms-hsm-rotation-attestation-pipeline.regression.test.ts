/**
 * QA-183: Regression Test Suite for Multi-Cloud KMS HSM Key Rotation Audit & Cryptographic Attestation Pipeline.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MultiCloudKmsHsmRotationPipeline,
  HsmDeviceAttestation,
  KeyRotationSpec,
  OfficerApproval,
} from "./kms-hsm-rotation-attestation-pipeline";

describe("QA-183: Multi-Cloud KMS HSM Key Rotation Audit & Cryptographic Attestation Pipeline", () => {
  let pipeline: MultiCloudKmsHsmRotationPipeline;
  const validDevice: HsmDeviceAttestation = {
    deviceId: "hsm-us-east-aws-01",
    provider: "AWS_KMS",
    region: "us-east-1",
    firmwareHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    certificationTier: "FIPS_140_3_L3",
    attestationTokenHex: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
    attestedAt: new Date().toISOString(),
  };

  const validApprovals: OfficerApproval[] = [
    { officerId: "officer-ciso-01", role: "CISO", signature: "sig-ciso-998811" },
    { officerId: "officer-crypto-02", role: "CRYPTO_LEAD", signature: "sig-crypto-776622" },
  ];

  beforeEach(() => {
    pipeline = new MultiCloudKmsHsmRotationPipeline();
    pipeline.registerHsmDevice(validDevice);
  });

  it("successfully executes KMS HSM key rotation with valid quorum and hardware attestation", () => {
    const spec: KeyRotationSpec = {
      keyAlias: "alias/vendor-shield-master-dek",
      currentVersion: 3,
      targetVersion: 4,
      algorithm: "AES-256-GCM",
      autoRewrapDeks: true,
    };

    const sampleDeks = [
      "0123456789abcdef0123456789abcdef",
      "fedcba9876543210fedcba9876543210",
    ];

    const result = pipeline.executeRotation(spec, validDevice.deviceId, validApprovals, sampleDeks);

    expect(result.keyAlias).toBe(spec.keyAlias);
    expect(result.previousVersion).toBe(3);
    expect(result.currentVersion).toBe(4);
    expect(result.hardwareAttested).toBe(true);
    expect(result.officersApproved).toBe(2);
    expect(result.reWrappedDeksCount).toBe(2);
    expect(result.auditAttestationToken).toHaveLength(64);
    expect(pipeline.getAuditHistory()).toHaveLength(1);
  });

  it("fails if target version is not strictly greater than current version", () => {
    const invalidSpec: KeyRotationSpec = {
      keyAlias: "alias/test-key",
      currentVersion: 4,
      targetVersion: 4,
      algorithm: "AES-256-GCM",
      autoRewrapDeks: false,
    };

    expect(() =>
      pipeline.executeRotation(invalidSpec, validDevice.deviceId, validApprovals)
    ).toThrow("strictly greater");
  });

  it("enforces separation of duties across officer approvals", () => {
    const duplicateRoleApprovals: OfficerApproval[] = [
      { officerId: "user-1", role: "CISO", signature: "sig-1" },
      { officerId: "user-2", role: "CISO", signature: "sig-2" },
    ];

    const spec: KeyRotationSpec = {
      keyAlias: "alias/test-key",
      currentVersion: 1,
      targetVersion: 2,
      algorithm: "AES-256-GCM",
      autoRewrapDeks: false,
    };

    expect(() =>
      pipeline.executeRotation(spec, validDevice.deviceId, duplicateRoleApprovals)
    ).toThrow("separation of duties across distinct roles");
  });

  it("rejects unregistered or unverified HSM devices", () => {
    const spec: KeyRotationSpec = {
      keyAlias: "alias/test-key",
      currentVersion: 1,
      targetVersion: 2,
      algorithm: "AES-256-GCM",
      autoRewrapDeks: false,
    };

    expect(() =>
      pipeline.executeRotation(spec, "unknown-device-999", validApprovals)
    ).toThrow("Unrecognized or unverified HSM device ID");
  });
});
