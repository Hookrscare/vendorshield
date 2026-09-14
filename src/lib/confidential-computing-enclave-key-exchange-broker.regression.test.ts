import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  ConfidentialComputingEnclaveKeyExchangeBroker,
  EnclaveKeyAgreementRequest,
  SealedKeyBlob
} from "./confidential-computing-enclave-key-exchange-broker";

describe("QA-198: ConfidentialComputingEnclaveKeyExchangeBroker", () => {
  const clientKey = "a".repeat(64);
  const enclaveKey = "b".repeat(64);
  const validReportDataHash = createHash("sha256")
    .update(`${clientKey}:${enclaveKey}`)
    .digest("hex");
  const validMrenclave = "c".repeat(64);
  const validMrsigner = "d".repeat(64);

  const baseRequest: EnclaveKeyAgreementRequest = {
    sessionId: "sess_enclave_9901",
    tenantId: "tenant_fintech_alpha",
    enclaveInstanceId: "i-09fba293041920nitro",
    clientEphemeralPublicKeyHex: clientKey,
    enclaveEphemeralPublicKeyHex: enclaveKey,
    attestedReportDataHash: validReportDataHash,
    mrenclave: validMrenclave,
    mrsigner: validMrsigner,
    sealingPolicy: "MRENCLAVE_STRICT",
    requestedTtlSeconds: 1800
  };

  it("successfully establishes a sealed session key under MRENCLAVE_STRICT policy", () => {
    const result = ConfidentialComputingEnclaveKeyExchangeBroker.establishSealedSessionKey(baseRequest, 1700000000);

    expect(result.isAgreementValid).toBe(true);
    expect(result.channelBindingVerified).toBe(true);
    expect(result.sealingPolicySatisfied).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sealedBlob).toBeDefined();

    const blob = result.sealedBlob!;
    expect(blob.tenantId).toBe("tenant_fintech_alpha");
    expect(blob.sealingPolicy).toBe("MRENCLAVE_STRICT");
    expect(blob.policyMeasurementHash).toBe(validMrenclave);
    expect(blob.expiresAtEpochSeconds).toBe(1700000000 + 1800);
    expect(blob.cryptographicSealReceipt).toHaveLength(64);

    // Verify blob validation helper
    const isValid = ConfidentialComputingEnclaveKeyExchangeBroker.verifySealedBlob(blob, 1700000100);
    expect(isValid).toBe(true);
  });

  it("supports MRSIGNER_UPGRADEABLE policy with vendor signer hash", () => {
    const request: EnclaveKeyAgreementRequest = {
      ...baseRequest,
      sealingPolicy: "MRSIGNER_UPGRADEABLE"
    };

    const result = ConfidentialComputingEnclaveKeyExchangeBroker.establishSealedSessionKey(request, 1700000000);

    expect(result.isAgreementValid).toBe(true);
    expect(result.sealedBlob?.sealingPolicy).toBe("MRSIGNER_UPGRADEABLE");
    expect(result.sealedBlob?.policyMeasurementHash).toBe(validMrsigner);
  });

  it("rejects handshake when channel binding (report data hash) does not match ephemeral keys", () => {
    const tamperedRequest: EnclaveKeyAgreementRequest = {
      ...baseRequest,
      attestedReportDataHash: "f".repeat(64) // mismatch
    };

    const result = ConfidentialComputingEnclaveKeyExchangeBroker.establishSealedSessionKey(tamperedRequest, 1700000000);

    expect(result.isAgreementValid).toBe(false);
    expect(result.channelBindingVerified).toBe(false);
    expect(result.errors.some(e => e.includes("Channel binding mismatch"))).toBe(true);
    expect(result.sealedBlob).toBeUndefined();
  });

  it("rejects handshake when required measurements are missing for policy", () => {
    const invalidRequest: EnclaveKeyAgreementRequest = {
      ...baseRequest,
      mrenclave: "short"
    };

    const result = ConfidentialComputingEnclaveKeyExchangeBroker.establishSealedSessionKey(invalidRequest, 1700000000);

    expect(result.isAgreementValid).toBe(false);
    expect(result.sealingPolicySatisfied).toBe(false);
    expect(result.errors.some(e => e.includes("MRENCLAVE_STRICT policy requires"))).toBe(true);
  });

  it("detects expired or tampered sealed key blobs", () => {
    const result = ConfidentialComputingEnclaveKeyExchangeBroker.establishSealedSessionKey(baseRequest, 1700000000);
    const blob = result.sealedBlob!;

    // Test expiry
    expect(ConfidentialComputingEnclaveKeyExchangeBroker.verifySealedBlob(blob, 1700002000)).toBe(false);

    // Test tamper
    const tamperedBlob: SealedKeyBlob = {
      ...blob,
      tenantId: "attacker_tenant"
    };
    expect(ConfidentialComputingEnclaveKeyExchangeBroker.verifySealedBlob(tamperedBlob, 1700000100)).toBe(false);
  });
});
