import { describe, it, expect } from "vitest";
import {
  CrossCloudKmsQuorumHardwareEnclaveGatekeeper,
  KmsKeyReleaseRequest,
  HardwareEnclaveAttestationToken
} from "./cross-cloud-kms-quorum-hardware-enclave-gatekeeper";

describe("QA-204: Cross-Cloud KMS Quorum Hardware Enclave Gatekeeper", () => {
  const gatekeeper = new CrossCloudKmsQuorumHardwareEnclaveGatekeeper();
  const currentEpoch = 1758088800000; // Fixed deterministic test epoch

  const validRequest: KmsKeyReleaseRequest = {
    requestId: "req-kms-release-901",
    targetKmsKeyArn: "arn:aws:kms:us-east-1:112233445566:key/mrk-sec-enc-01",
    targetProvider: "AWS",
    purpose: "DECRYPT",
    clientSessionNonce: "nonce-sec-rand-981273918237",
    thresholdM: 2,
    requestedAtEpochMs: currentEpoch
  };

  const nitroToken: HardwareEnclaveAttestationToken = {
    enclaveId: "i-0981723-nitro-enc-1",
    teeType: "NITRO",
    provider: "AWS",
    measurementDigest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    nonce: "nonce-sec-rand-981273918237",
    hardwareSignatureValid: true,
    tcbUpToDate: true,
    timestampEpochMs: currentEpoch - 5000,
    signerCaRoot: "AWS_NITRO_ROOT_CA_G1"
  };

  const sevSnpToken: HardwareEnclaveAttestationToken = {
    enclaveId: "gcp-conf-space-worker-4",
    teeType: "SEV_SNP",
    provider: "GCP",
    measurementDigest: "sha256:b16b4f738a3d1297eedb9a8f4c2e6d10a9f8b7c6d5e4f3a2b1c0d9e8f7a6b5c4",
    nonce: "nonce-sec-rand-981273918237",
    hardwareSignatureValid: true,
    tcbUpToDate: true,
    timestampEpochMs: currentEpoch - 2000,
    signerCaRoot: "AMD_SEV_SNP_KDS_ROOT_CA"
  };

  const tdxToken: HardwareEnclaveAttestationToken = {
    enclaveId: "azure-cc-vm-tdx-9",
    teeType: "TDX",
    provider: "AZURE",
    measurementDigest: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    nonce: "nonce-sec-rand-981273918237",
    hardwareSignatureValid: true,
    tcbUpToDate: true,
    timestampEpochMs: currentEpoch - 1000,
    signerCaRoot: "MICROSOFT_AZURE_ATTESTATION_ROOT_CA"
  };

  it("approves release when 2-of-3 quorum is reached with cross-cloud provider diversity", () => {
    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, sevSnpToken],
      currentEpoch
    );

    expect(decision.approved).toBe(true);
    expect(decision.quorumAchieved).toBe(true);
    expect(decision.validEnclaveCount).toBe(2);
    expect(decision.participatingProviders).toContain("AWS");
    expect(decision.participatingProviders).toContain("GCP");
    expect(decision.rejectionReasons).toHaveLength(0);
    expect(decision.kmsAuthorizationGrant).toBeDefined();
    expect(decision.kmsAuthorizationGrant?.targetKmsKeyArn).toBe(validRequest.targetKmsKeyArn);
    expect(decision.kmsAuthorizationGrant?.grantToken).toMatch(/^grant-[0-9a-f]{64}$/);
    expect(decision.tamperEvidentAttestationToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects release when valid enclaves fall below quorum threshold M", () => {
    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken], // Only 1 enclave when M=2
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    expect(decision.quorumAchieved).toBe(false);
    expect(decision.validEnclaveCount).toBe(1);
    expect(decision.kmsAuthorizationGrant).toBeUndefined();
    expect(decision.rejectionReasons.some(r => r.includes("QUORUM_DEFICIT"))).toBe(true);
  });

  it("rejects release when multi-cloud diversity requirement is violated", () => {
    const secondNitroToken: HardwareEnclaveAttestationToken = {
      ...nitroToken,
      enclaveId: "i-0981723-nitro-enc-2"
    };

    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, secondNitroToken], // 2 enclaves, but both from AWS
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    expect(decision.quorumAchieved).toBe(true); // 2 enclaves >= M=2
    expect(decision.validEnclaveCount).toBe(2);
    expect(decision.rejectionReasons.some(r => r.includes("DIVERSITY_FAILURE"))).toBe(true);
    expect(decision.kmsAuthorizationGrant).toBeUndefined();
  });

  it("disqualifies enclave with non-matching replay nonce", () => {
    const replayedToken: HardwareEnclaveAttestationToken = {
      ...sevSnpToken,
      nonce: "stale-replay-nonce-attack-001"
    };

    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, replayedToken],
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    expect(decision.validEnclaveCount).toBe(1);
    const detail = decision.evaluationDetails.find(d => d.enclaveId === replayedToken.enclaveId);
    expect(detail?.trusted).toBe(false);
    expect(detail?.disqualificationReasons.some(r => r.includes("NONCE_MISMATCH"))).toBe(true);
  });

  it("disqualifies enclave with tampered or unapproved measurement hash", () => {
    const tamperedToken: HardwareEnclaveAttestationToken = {
      ...nitroToken,
      measurementDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
    };

    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [tamperedToken, sevSnpToken],
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    const detail = decision.evaluationDetails.find(d => d.enclaveId === tamperedToken.enclaveId);
    expect(detail?.disqualificationReasons.some(r => r.includes("UNAUTHORIZED_MEASUREMENT"))).toBe(true);
  });

  it("disqualifies enclave with outdated or vulnerable TCB status", () => {
    const vulnerableTdxToken: HardwareEnclaveAttestationToken = {
      ...tdxToken,
      tcbUpToDate: false
    };

    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, vulnerableTdxToken],
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    const detail = decision.evaluationDetails.find(d => d.enclaveId === vulnerableTdxToken.enclaveId);
    expect(detail?.disqualificationReasons.some(r => r.includes("TCB_DEGRADED"))).toBe(true);
  });

  it("disqualifies enclave whose timestamp exceeds allowed clock skew", () => {
    const expiredToken: HardwareEnclaveAttestationToken = {
      ...sevSnpToken,
      timestampEpochMs: currentEpoch - 300_000 // 5 minutes ago (limit is 2 minutes)
    };

    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, expiredToken],
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    const detail = decision.evaluationDetails.find(d => d.enclaveId === expiredToken.enclaveId);
    expect(detail?.disqualificationReasons.some(r => r.includes("CLOCK_SKEW_EXCEEDED"))).toBe(true);
  });

  it("disqualifies duplicate enclave IDs in the attestation payload", () => {
    const decision = gatekeeper.evaluateQuorum(
      validRequest,
      [nitroToken, nitroToken], // Duplicate identical token
      currentEpoch
    );

    expect(decision.approved).toBe(false);
    expect(decision.evaluationDetails[1].disqualificationReasons.some(r => r.includes("DUPLICATE_ENCLAVE_ID"))).toBe(true);
  });
});
