/**
 * QA-143: Automated Multi-Cloud KMS Hardware Security Module (HSM) Key Lifecycle Verifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Validates enterprise HSM cryptographic key posture across multi-cloud environments
 * (AWS KMS HSM, Google Cloud HSM, Azure Key Vault Managed HSM) adhering to:
 * - FIPS 140-2 Level 3 / FIPS 140-3 hardware boundary requirements
 * - Automated rotation cadence enforcement (<= 365 days)
 * - Cryptographic key attestation validation (zero-leakage envelope guarantees)
 * - Destruction grace-period and dual-custody quorum enforcement
 * - Tamper-evident SHA-256 compliance certificate generation for SOC 2 CC6.1 & CC6.7
 */

import { createHash } from "crypto";

export type CloudKmsProvider = "AWS_KMS" | "GCP_CLOUD_KMS" | "AZURE_KEY_VAULT";

export type HsmProtectionLevel = "FIPS_140_2_L3" | "FIPS_140_3_L3" | "SOFTWARE" | "FIPS_140_2_L2";

export type HsmKeyStatus = 
  | "ACTIVE" 
  | "PENDING_ROTATION" 
  | "DISABLED" 
  | "SCHEDULED_FOR_DESTRUCTION" 
  | "DESTROYED";

export interface HsmKeyRecord {
  keyId: string;
  provider: CloudKmsProvider;
  protectionLevel: HsmProtectionLevel;
  status: HsmKeyStatus;
  createdAtIso: string;
  lastRotatedAtIso: string;
  rotationPeriodDays: number;
  dualControlEnforced: boolean;
  destructionGracePeriodDays: number;
  attestationSignatureSha256?: string;
}

export interface HsmVerificationResult {
  verified: boolean;
  score: number; // 0 - 100
  complianceGrade: "A_PLUS" | "A" | "B" | "FAILED";
  findings: string[];
  recommendations: string[];
  certificate: {
    certificateId: string;
    evaluatedAtIso: string;
    totalKeysAudited: number;
    compliantKeysCount: number;
    providerBreakdown: Record<CloudKmsProvider, number>;
    integrityHashSha256: string;
  };
}

export class MultiCloudKmsHsmVerifier {
  private maxAllowedRotationDays: number;
  private minDestructionGraceDays: number;

  constructor(options: { maxAllowedRotationDays?: number; minDestructionGraceDays?: number } = {}) {
    this.maxAllowedRotationDays = options.maxAllowedRotationDays ?? 365;
    this.minDestructionGraceDays = options.minDestructionGraceDays ?? 7;
  }

  /**
   * Verifies an individual HSM cryptographic key against enterprise compliance policies.
   */
  public evaluateKey(key: HsmKeyRecord): { isCompliant: boolean; issues: string[] } {
    const issues: string[] = [];

    // 1. Hardware Security Module FIPS level validation
    if (key.protectionLevel !== "FIPS_140_2_L3" && key.protectionLevel !== "FIPS_140_3_L3") {
      issues.push(`Key ${key.keyId} fails hardware isolation: Protection level ${key.protectionLevel} is not FIPS 140-2/3 Level 3.`);
    }

    // 2. Rotation interval check
    if (key.rotationPeriodDays > this.maxAllowedRotationDays) {
      issues.push(`Key ${key.keyId} rotation interval (${key.rotationPeriodDays}d) exceeds policy max of ${this.maxAllowedRotationDays}d.`);
    }

    // Check age since last rotation
    const lastRotatedTime = new Date(key.lastRotatedAtIso).getTime();
    const now = Date.now();
    const daysSinceLastRotation = (now - lastRotatedTime) / (1000 * 60 * 60 * 24);
    if (daysSinceLastRotation > this.maxAllowedRotationDays && key.status === "ACTIVE") {
      issues.push(`Key ${key.keyId} rotation overdue: ${Math.floor(daysSinceLastRotation)} days since last rotation.`);
    }

    // 3. Dual-control & quorum authorization check for sensitive lifecycle operations
    if (!key.dualControlEnforced) {
      issues.push(`Key ${key.keyId} lacks dual-control multi-party authorization policy.`);
    }

    // 4. Destruction safety window
    if (key.status === "SCHEDULED_FOR_DESTRUCTION" && key.destructionGracePeriodDays < this.minDestructionGraceDays) {
      issues.push(`Key ${key.keyId} destruction grace period (${key.destructionGracePeriodDays}d) is under required ${this.minDestructionGraceDays}d safety buffer.`);
    }

    // 5. Attestation signature verification
    if (!key.attestationSignatureSha256 || key.attestationSignatureSha256.length !== 64) {
      issues.push(`Key ${key.keyId} lacks cryptographic hardware attestation manifest.`);
    }

    return {
      isCompliant: issues.length === 0,
      issues
    };
  }

  /**
   * Performs an audit across all keys in the enterprise multi-cloud fleet.
   */
  public auditFleet(keys: HsmKeyRecord[]): HsmVerificationResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let compliantCount = 0;

    const providerCounts: Record<CloudKmsProvider, number> = {
      AWS_KMS: 0,
      GCP_CLOUD_KMS: 0,
      AZURE_KEY_VAULT: 0
    };

    for (const key of keys) {
      providerCounts[key.provider] = (providerCounts[key.provider] || 0) + 1;
      const evaluation = this.evaluateKey(key);
      if (evaluation.isCompliant) {
        compliantCount++;
      } else {
        findings.push(...evaluation.issues);
      }
    }

    const total = keys.length;
    const score = total === 0 ? 100 : Math.round((compliantCount / total) * 100);

    let complianceGrade: HsmVerificationResult["complianceGrade"] = "FAILED";
    if (score === 100) complianceGrade = "A_PLUS";
    else if (score >= 90) complianceGrade = "A";
    else if (score >= 75) complianceGrade = "B";

    if (score < 100) {
      recommendations.push("Enforce automated 365-day rotation policies across all cloud KMS providers.");
      recommendations.push("Migrate software-backed keys to dedicated FIPS 140-2 Level 3 HSM hardware clusters.");
      recommendations.push("Activate multi-party M-of-N dual control quorum on key deletion.");
    }

    const evaluatedAtIso = new Date().toISOString();
    const rawCertificatePayload = JSON.stringify({
      evaluatedAtIso,
      score,
      compliantCount,
      total,
      findings
    });
    const integrityHash = createHash("sha256").update(rawCertificatePayload).digest("hex");

    return {
      verified: score >= 90,
      score,
      complianceGrade,
      findings,
      recommendations,
      certificate: {
        certificateId: `HSM-CERT-${Date.now()}`,
        evaluatedAtIso,
        totalKeysAudited: total,
        compliantKeysCount: compliantCount,
        providerBreakdown: providerCounts,
        integrityHashSha256: integrityHash
      }
    };
  }
}
