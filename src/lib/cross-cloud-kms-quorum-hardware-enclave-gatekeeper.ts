/**
 * src/lib/cross-cloud-kms-quorum-hardware-enclave-gatekeeper.ts
 * Part of VendorShield Enterprise Trust & Third-Party Governance Suite.
 *
 * QA-204: Automated Cryptographic Attestation & Cross-Cloud KMS Quorum Hardware Enclave Gatekeeper.
 * 
 * Enforces hardware-rooted cryptographic attestation quorum requirements across heterogeneous
 * confidential computing platforms (AWS Nitro Enclaves, GCP Confidential Space / AMD SEV-SNP,
 * Azure Confidential Computing / Intel TDX & SGX) before granting KMS key release or decryption.
 *
 * Validates:
 * 1. Platform Configuration Register (PCR) / SEV-SNP / TDX measurement digests against golden baselines.
 * 2. Hardware vendor PKI certificate chain validity and Trusted Execution Environment (TEE) TCB status.
 * 3. Freshness nonce binding to eliminate cryptographic replay attacks.
 * 4. M-of-N quorum consensus with multi-cloud provider diversity thresholds.
 * 5. Tamper-evident cryptographic authorization grants conforming to SOC 2 Type II CC6.1/CC6.3 and FIPS 140-3 Level 3.
 */

import { createHash } from "crypto";

export type TeeType = "NITRO" | "SEV_SNP" | "TDX" | "SGX";
export type CloudProvider = "AWS" | "GCP" | "AZURE";
export type KeyOperationPurpose = "DECRYPT" | "SIGN" | "KEY_EXPORT" | "UNSEAL";

export interface HardwareEnclaveAttestationToken {
  enclaveId: string;
  teeType: TeeType;
  provider: CloudProvider;
  measurementDigest: string; // PCR0 / MRENCLAVE / SEV-SNP measurement hash
  nonce: string;
  hardwareSignatureValid: boolean;
  tcbUpToDate: boolean;
  timestampEpochMs: number;
  signerCaRoot: string;
}

export interface KmsKeyReleaseRequest {
  requestId: string;
  targetKmsKeyArn: string;
  targetProvider: CloudProvider;
  purpose: KeyOperationPurpose;
  clientSessionNonce: string;
  thresholdM: number;
  requestedAtEpochMs: number;
}

export interface EnclaveGoldenBaselinePolicy {
  allowedMeasurementsByTee: Partial<Record<TeeType, string[]>>;
  trustedCaRoots: string[];
  maxClockSkewMs: number;
  requireMultiCloudDiversity: boolean;
  minDistinctProviders: number;
}

export interface EnclaveEvaluationDetail {
  enclaveId: string;
  provider: CloudProvider;
  teeType: TeeType;
  trusted: boolean;
  disqualificationReasons: string[];
}

export interface GatekeeperDecision {
  requestId: string;
  approved: boolean;
  quorumAchieved: boolean;
  thresholdM: number;
  validEnclaveCount: number;
  participatingProviders: CloudProvider[];
  rejectionReasons: string[];
  evaluationDetails: EnclaveEvaluationDetail[];
  tamperEvidentAttestationToken: string;
  kmsAuthorizationGrant?: {
    grantToken: string;
    targetKmsKeyArn: string;
    purpose: KeyOperationPurpose;
    expiresAtEpochMs: number;
    auditLogSha256: string;
  };
}

export class CrossCloudKmsQuorumHardwareEnclaveGatekeeper {
  private readonly baselinePolicy: EnclaveGoldenBaselinePolicy;

  constructor(policy?: Partial<EnclaveGoldenBaselinePolicy>) {
    this.baselinePolicy = {
      allowedMeasurementsByTee: policy?.allowedMeasurementsByTee ?? {
        NITRO: [
          "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "sha256:a4f89d30c5e94b2a8d4389f4172f3e098a543210fedcba9876543210abcdef01"
        ],
        SEV_SNP: [
          "sha256:b16b4f738a3d1297eedb9a8f4c2e6d10a9f8b7c6d5e4f3a2b1c0d9e8f7a6b5c4",
          "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        ],
        TDX: [
          "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
        ],
        SGX: [
          "sha256:ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db2"
        ]
      },
      trustedCaRoots: policy?.trustedCaRoots ?? [
        "AWS_NITRO_ROOT_CA_G1",
        "AMD_SEV_SNP_KDS_ROOT_CA",
        "MICROSOFT_AZURE_ATTESTATION_ROOT_CA"
      ],
      maxClockSkewMs: policy?.maxClockSkewMs ?? 120_000, // 2 minutes
      requireMultiCloudDiversity: policy?.requireMultiCloudDiversity ?? true,
      minDistinctProviders: policy?.minDistinctProviders ?? 2
    };
  }

  /**
   * Evaluates an array of hardware enclave attestation tokens against the release request and policy.
   */
  public evaluateQuorum(
    request: KmsKeyReleaseRequest,
    attestations: HardwareEnclaveAttestationToken[],
    currentEpochMs: number = Date.now()
  ): GatekeeperDecision {
    const rejectionReasons: string[] = [];
    const evaluationDetails: EnclaveEvaluationDetail[] = [];
    const validProviders = new Set<CloudProvider>();
    let validEnclaveCount = 0;

    // Validate request constraints
    if (!request.requestId || !request.targetKmsKeyArn || !request.clientSessionNonce) {
      rejectionReasons.push("INVALID_RELEASE_REQUEST: Missing mandatory fields (requestId, targetKmsKeyArn, clientSessionNonce).");
    }

    if (request.thresholdM <= 0) {
      rejectionReasons.push("INVALID_THRESHOLD: Quorum threshold M must be greater than zero.");
    }

    const seenEnclaveIds = new Set<string>();

    for (const att of attestations) {
      const disqualifications: string[] = [];

      // 1. Uniqueness check (anti-duplication)
      if (seenEnclaveIds.has(att.enclaveId)) {
        disqualifications.push(`DUPLICATE_ENCLAVE_ID: Enclave ${att.enclaveId} supplied multiple times.`);
      }
      seenEnclaveIds.add(att.enclaveId);

      // 2. Hardware signature and Root CA verification
      if (!att.hardwareSignatureValid) {
        disqualifications.push("INVALID_HARDWARE_SIGNATURE: Enclave hardware cryptographic signature failed verification.");
      }
      if (!this.baselinePolicy.trustedCaRoots.includes(att.signerCaRoot)) {
        disqualifications.push(`UNTRUSTED_CA_ROOT: Signer root CA '${att.signerCaRoot}' is not in trusted root store.`);
      }

      // 3. TCB Status
      if (!att.tcbUpToDate) {
        disqualifications.push("TCB_DEGRADED: Hardware enclave TCB is out-of-date or vulnerable to known errata.");
      }

      // 4. Nonce binding (replay protection)
      if (att.nonce !== request.clientSessionNonce) {
        disqualifications.push("NONCE_MISMATCH: Attestation token nonce does not match client session nonce.");
      }

      // 5. Clock skew / freshness check
      const skew = Math.abs(currentEpochMs - att.timestampEpochMs);
      if (skew > this.baselinePolicy.maxClockSkewMs) {
        disqualifications.push(`CLOCK_SKEW_EXCEEDED: Attestation age/skew (${skew}ms) exceeds limit (${this.baselinePolicy.maxClockSkewMs}ms).`);
      }

      // 6. Golden baseline measurement digest match
      const allowedDigests = this.baselinePolicy.allowedMeasurementsByTee[att.teeType] ?? [];
      if (!allowedDigests.includes(att.measurementDigest)) {
        disqualifications.push(`UNAUTHORIZED_MEASUREMENT: Enclave measurement ${att.measurementDigest} does not match golden baseline for ${att.teeType}.`);
      }

      const isTrusted = disqualifications.length === 0;
      if (isTrusted) {
        validEnclaveCount++;
        validProviders.add(att.provider);
      }

      evaluationDetails.push({
        enclaveId: att.enclaveId,
        provider: att.provider,
        teeType: att.teeType,
        trusted: isTrusted,
        disqualificationReasons: disqualifications
      });
    }

    // Evaluate Quorum Threshold
    const quorumAchieved = validEnclaveCount >= request.thresholdM;
    if (!quorumAchieved) {
      rejectionReasons.push(`QUORUM_DEFICIT: Valid enclaves (${validEnclaveCount}) did not meet required threshold (${request.thresholdM}).`);
    }

    // Evaluate Provider Diversity
    if (this.baselinePolicy.requireMultiCloudDiversity && validProviders.size < this.baselinePolicy.minDistinctProviders) {
      rejectionReasons.push(
        `DIVERSITY_FAILURE: Valid enclaves span only ${validProviders.size} provider(s); minimum ${this.baselinePolicy.minDistinctProviders} required.`
      );
    }

    const approved = rejectionReasons.length === 0;
    const participatingProviders = Array.from(validProviders);

    // Compute tamper-evident SHA-256 digest
    const attestationPayload = JSON.stringify({
      requestId: request.requestId,
      targetKmsKeyArn: request.targetKmsKeyArn,
      approved,
      validEnclaveCount,
      participatingProviders,
      nonce: request.clientSessionNonce,
      timestamp: currentEpochMs
    });
    const tamperEvidentAttestationToken = createHash("sha256").update(attestationPayload).digest("hex");

    let kmsAuthorizationGrant: GatekeeperDecision["kmsAuthorizationGrant"] = undefined;
    if (approved) {
      const grantPayload = `${request.requestId}:${request.targetKmsKeyArn}:${request.purpose}:${currentEpochMs + 300_000}`;
      const grantToken = "grant-" + createHash("sha256").update(grantPayload).digest("hex");
      kmsAuthorizationGrant = {
        grantToken,
        targetKmsKeyArn: request.targetKmsKeyArn,
        purpose: request.purpose,
        expiresAtEpochMs: currentEpochMs + 300_000, // 5 minute grant window
        auditLogSha256: tamperEvidentAttestationToken
      };
    }

    return {
      requestId: request.requestId,
      approved,
      quorumAchieved,
      thresholdM: request.thresholdM,
      validEnclaveCount,
      participatingProviders,
      rejectionReasons,
      evaluationDetails,
      tamperEvidentAttestationToken,
      kmsAuthorizationGrant
    };
  }
}
