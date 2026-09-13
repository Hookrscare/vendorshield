/**
 * src/lib/confidential-computing-enclave-attestor.regression.test.ts
 * Tests for QA-183: Confidential Computing Nitro / SEV-SNP Remote Memory Enclave Attestor.
 */

import { describe, it, expect } from "vitest";
import {
  ConfidentialComputingEnclaveAttestor,
  RemoteAttestationDocument,
  EnclaveAttestationPolicy
} from "./confidential-computing-enclave-attestor";

describe("ConfidentialComputingEnclaveAttestor (QA-183)", () => {
  const goldenPcrs = {
    pcr0_image_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    pcr1_kernel_hash: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    pcr2_application_hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"
  };

  const policy: EnclaveAttestationPolicy = {
    expectedNonce: "nonce_secure_challenge_77192",
    maxFreshnessWindowSeconds: 60,
    goldenPcrs,
    requiredHardwareRootKeyFingerprint: "fp_aws_nitro_root_ca"
  };

  it("validates authentic enclave attestation within freshness bounds", () => {
    const now = 1720000000;
    const doc: RemoteAttestationDocument = {
      enclavePlatform: "AWS_NITRO",
      enclaveInstanceId: "i-0984128f81ae-enc01",
      timestampEpochSeconds: now - 15, // 15 seconds old
      sessionChallengeNonce: "nonce_secure_challenge_77192",
      runtimePcrs: { ...goldenPcrs },
      hardwareRootSignatureHex: "sig_hardware_enclave_root"
    };

    const res = ConfidentialComputingEnclaveAttestor.verifyAttestation(doc, policy, now);

    expect(res.isAttestationValid).toBe(true);
    expect(res.attestationStatus).toBe("CONFIDENTIAL_ENCLAVE_VALIDATED");
    expect(res.pcrIntegrityMatched).toBe(true);
    expect(res.tamperViolations).toHaveLength(0);
    expect(res.auditAttestationReceipt).toHaveLength(64);
  });

  it("detects tampered enclave image / memory injection (PCR mismatch)", () => {
    const now = 1720000000;
    const tamperedDoc: RemoteAttestationDocument = {
      enclavePlatform: "AMD_SEV_SNP",
      enclaveInstanceId: "i-tampered-enc02",
      timestampEpochSeconds: now - 10,
      sessionChallengeNonce: "nonce_secure_challenge_77192",
      runtimePcrs: {
        ...goldenPcrs,
        pcr0_image_hash: "tampered_rootkit_image_hash_000000000000000000000000000000000"
      },
      hardwareRootSignatureHex: "sig_amd_sev_snp"
    };

    const res = ConfidentialComputingEnclaveAttestor.verifyAttestation(tamperedDoc, policy, now);

    expect(res.isAttestationValid).toBe(false);
    expect(res.attestationStatus).toBe("ENCLAVE_ATTESTATION_TAMPERED");
    expect(res.pcrIntegrityMatched).toBe(false);
    expect(res.tamperViolations.some(v => v.includes("PCR0"))).toBe(true);
  });

  it("rejects expired / replay nonce challenges", () => {
    const now = 1720000000;
    const replayDoc: RemoteAttestationDocument = {
      enclavePlatform: "INTEL_TDX",
      enclaveInstanceId: "i-replay-enc03",
      timestampEpochSeconds: now - 180, // 3 minutes old (> 60s)
      sessionChallengeNonce: "wrong_replayed_nonce",
      runtimePcrs: { ...goldenPcrs },
      hardwareRootSignatureHex: "sig_intel_tdx"
    };

    const res = ConfidentialComputingEnclaveAttestor.verifyAttestation(replayDoc, policy, now);

    expect(res.isAttestationValid).toBe(false);
    expect(res.attestationStatus).toBe("SESSION_NONCE_EXPIRED");
    expect(res.freshnessValid).toBe(false);
    expect(res.nonceMatched).toBe(false);
  });
});
