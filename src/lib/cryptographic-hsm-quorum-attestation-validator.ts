/**
 * QA-203: Cryptographic Hardware Security Module (HSM) Quorum Attestation & Key Escrow Validator.
 * Part of VendorShield Third-Party Risk & Cryptographic Compliance Engine.
 */

import { createHash } from 'crypto';

export interface HsmAttestationStatement {
  hsmVendor: 'AWS_CLOUDHSM' | 'GOOGLE_CLOUD_HSM' | 'AZURE_DEDICATED_HSM' | 'THALES_LUNA' | 'YUBIHSM2';
  fipsLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';
  firmwareVersion: string;
  hardwareSerial: string;
  attestationCertFingerprint: string;
  isExportable: boolean;
  tamperEvidentSealVerified: boolean;
}

export interface EscrowQuorumConfig {
  thresholdM: number;
  totalSharesN: number;
  maxShareAgeHours?: number;
  enforceGeographicSeparation?: boolean;
}

export interface EscrowShare {
  shareIndex?: number;
  shareId?: number;
  custodianId: string;
  commitmentHash?: string;
  shareHash?: string;
  encryptedSharePayload?: string;
  encryptedKeyShare?: string;
  expiresAt?: string;
  issuedAt?: Date;
  dataCenterRegion?: string;
}

export interface HsmValidationResult {
  isValid: boolean;
  complianceRating: 'COMPLIANT' | 'NON_COMPLIANT';
  violations: string[];
}

export interface QuorumVerificationResult {
  quorumSatisfied: boolean;
  validSharesPresent: number;
  requiredThreshold: number;
  attestationDigest: string;
  violations: string[];
}

export interface QuorumValidationResult {
  isQuorumSatisfied: boolean;
  activeSharesCount: number;
  requiredThreshold: number;
  hsmComplianceVerified: boolean;
  violations: string[];
  auditDigest: string;
  recommendedAction: 'APPROVE_OPERATION' | 'REJECT_OPERATION' | 'REQUIRE_ADDITIONAL_SHARES';
}

export class CryptographicHsmQuorumAttestationValidator {
  public static validateAttestationStatement(statement: HsmAttestationStatement): HsmValidationResult {
    const violations: string[] = [];

    if (statement.fipsLevel !== 'LEVEL_3' && statement.fipsLevel !== 'LEVEL_4') {
      violations.push(`HSM does not meet required FIPS 140-3 Level 3/4 baseline (actual: ${statement.fipsLevel})`);
    }

    if (statement.isExportable) {
      violations.push('CRITICAL: HSM key material is marked as exportable, violating non-extractable key policy');
    }

    if (!statement.tamperEvidentSealVerified) {
      violations.push('Physical tamper-evident seal or cryptographic enclosure attestation failed');
    }

    const isValid = violations.length === 0;
    return {
      isValid,
      complianceRating: isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
      violations,
    };
  }

  public static validateHsmAttestation(statement: HsmAttestationStatement): HsmValidationResult {
    return this.validateAttestationStatement(statement);
  }

  public static verifyQuorumEscrow(
    shares: EscrowShare[],
    requiredThreshold: number,
    totalShares: number,
    now: Date = new Date()
  ): QuorumVerificationResult {
    const violations: string[] = [];

    const seenIndices = new Set<number>();
    const seenCustodians = new Set<string>();
    const validShares: EscrowShare[] = [];

    for (const share of shares) {
      const idx = share.shareIndex ?? share.shareId ?? 0;
      if (seenIndices.has(idx)) {
        violations.push(`Duplicate share index: ${idx}`);
        continue;
      }
      seenIndices.add(idx);

      if (seenCustodians.has(share.custodianId)) {
        violations.push(`Duplicate custodian: ${share.custodianId}`);
        continue;
      }
      seenCustodians.add(share.custodianId);

      if (share.expiresAt) {
        const exp = new Date(share.expiresAt);
        if (exp.getTime() < now.getTime()) {
          violations.push(`Share expired at ${share.expiresAt}`);
          continue;
        }
      }

      validShares.push(share);
    }

    const quorumSatisfied = validShares.length >= requiredThreshold;
    const hash = createHash('sha256');
    hash.update(String(requiredThreshold));
    hash.update(String(totalShares));
    for (const s of validShares) {
      hash.update(s.commitmentHash || s.shareHash || s.custodianId);
    }
    const attestationDigest = hash.digest('hex');

    return {
      quorumSatisfied,
      validSharesPresent: validShares.length,
      requiredThreshold,
      attestationDigest,
      violations,
    };
  }

  public static validateQuorum(
    statement: HsmAttestationStatement,
    config: EscrowQuorumConfig,
    shares: EscrowShare[],
    now: Date = new Date()
  ): QuorumValidationResult {
    const hsmRes = this.validateAttestationStatement(statement);
    const quorumRes = this.verifyQuorumEscrow(shares, config.thresholdM, config.totalSharesN, now);

    const isQuorumSatisfied = quorumRes.quorumSatisfied && hsmRes.isValid;
    let recommendedAction: 'APPROVE_OPERATION' | 'REJECT_OPERATION' | 'REQUIRE_ADDITIONAL_SHARES' = 'APPROVE_OPERATION';

    if (!hsmRes.isValid) {
      recommendedAction = 'REJECT_OPERATION';
    } else if (!quorumRes.quorumSatisfied) {
      recommendedAction = quorumRes.validSharesPresent > 0 ? 'REQUIRE_ADDITIONAL_SHARES' : 'REJECT_OPERATION';
    }

    return {
      isQuorumSatisfied,
      activeSharesCount: quorumRes.validSharesPresent,
      requiredThreshold: config.thresholdM,
      hsmComplianceVerified: hsmRes.isValid,
      violations: [...hsmRes.violations, ...quorumRes.violations],
      auditDigest: quorumRes.attestationDigest,
      recommendedAction,
    };
  }
}
