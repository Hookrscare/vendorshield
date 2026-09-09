/**
 * QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor.
 * Part of VendorShield B2B Enterprise Compliance & Trust Hub.
 *
 * Implements automated compliance auditing for tenant key custody, crypto-period aging,
 * HSM hardware attestation validation, and Zero-Knowledge challenge-response proofs
 * compliant with NIST SP 800-57, SOC 2 CC6.1, and PCI-DSS 4.0 Requirement 3.6.
 */

import { createHmac, createHash, randomBytes } from 'crypto';

export type KeyCustodyStatus =
  | 'COMPLIANT_IN_CUSTODY'
  | 'ROTATION_DUE_SOON'
  | 'ROTATION_OVERDUE_EXPIRED'
  | 'HSM_ATTESTATION_FAILED'
  | 'EMERGENCY_REVOCATION_COMPROMISED';

export interface KeyCustodyRecord {
  tenantId: string;
  keyId: string;
  keyVersion: number;
  hsmProvider: 'AWS_KMS_CLOUDHSM' | 'AZURE_DEDICATED_HSM' | 'GCP_CLOUD_HSM' | 'ON_PREM_PKCS11';
  createdAtIso: string;
  lastRotatedAtIso: string;
  cryptoPeriodDays: number; // Defaults to 90 days
  attestationChallengeNonce?: string;
  lastAttestationVerifiedAtIso?: string;
  isCompromisedFlag: boolean;
}

export interface CustodyAuditReport {
  tenantId: string;
  keyId: string;
  keyVersion: number;
  keyAgeDays: number;
  daysRemainingBeforeExpiry: number;
  status: KeyCustodyStatus;
  isRotationUrgent: boolean;
  complianceFrameworks: {
    nistSp800_57: boolean;
    soc2Cc6_1: boolean;
    pciDss3_6: boolean;
  };
  recommendedAction: string;
  auditRecordHash: string;
}

export class ZkKeyCustodyMonitor {
  private custodyRecords: Map<string, KeyCustodyRecord> = new Map();

  /**
   * Registers or updates a tenant's cryptographic key custody record.
   */
  public registerKeyCustody(record: KeyCustodyRecord): void {
    this.custodyRecords.set(record.keyId, record);
  }

  /**
   * Generates a random cryptographic challenge nonce for ZK custody attestation.
   */
  public issueCustodyChallenge(keyId: string): string {
    const record = this.custodyRecords.get(keyId);
    if (!record) {
      throw new Error(`Key record ${keyId} not found in custody registry`);
    }
    const nonce = randomBytes(32).toString('hex');
    record.attestationChallengeNonce = nonce;
    return nonce;
  }

  /**
   * Verifies an HSM zero-knowledge attestation signature response against the challenge nonce.
   */
  public verifyCustodyAttestation(
    keyId: string,
    hsmSharedSecret: string,
    attestationProofHex: string
  ): boolean {
    const record = this.custodyRecords.get(keyId);
    if (!record || !record.attestationChallengeNonce) {
      return false;
    }

    const expectedProof = createHmac('sha256', hsmSharedSecret)
      .update(`${keyId}:${record.attestationChallengeNonce}:${record.keyVersion}`)
      .digest('hex');

    const isValid = expectedProof === attestationProofHex;
    if (isValid) {
      record.lastAttestationVerifiedAtIso = new Date().toISOString();
      record.attestationChallengeNonce = undefined; // Single-use challenge
    }
    return isValid;
  }

  /**
   * Audits a tenant key's custody status and cryptographic aging.
   */
  public auditKeyCustody(keyId: string, referenceTimeIso?: string): CustodyAuditReport {
    const record = this.custodyRecords.get(keyId);
    if (!record) {
      throw new Error(`Key record ${keyId} not found`);
    }

    const now = referenceTimeIso ? new Date(referenceTimeIso) : new Date();
    const lastRotation = new Date(record.lastRotatedAtIso);
    const elapsedMs = now.getTime() - lastRotation.getTime();
    const keyAgeDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = record.cryptoPeriodDays - keyAgeDays;

    let status: KeyCustodyStatus;
    let recommendedAction: string;

    if (record.isCompromisedFlag) {
      status = 'EMERGENCY_REVOCATION_COMPROMISED';
      recommendedAction = 'CRITICAL: Immediate cryptographic key destruction and emergency rotation required.';
    } else if (!record.lastAttestationVerifiedAtIso) {
      status = 'HSM_ATTESTATION_FAILED';
      recommendedAction = 'Dispatch zero-knowledge custody challenge to HSM provider to verify physical key enclave integrity.';
    } else if (daysRemaining <= 0) {
      status = 'ROTATION_OVERDUE_EXPIRED';
      recommendedAction = 'Key has exceeded maximum NIST crypto-period. Immediate automated re-encryption rotation required.';
    } else if (daysRemaining <= Math.ceil(record.cryptoPeriodDays * 0.2)) {
      status = 'ROTATION_DUE_SOON';
      recommendedAction = 'Key approaching crypto-period expiration. Trigger automated background key rotation job.';
    } else {
      status = 'COMPLIANT_IN_CUSTODY';
      recommendedAction = 'Key custody and crypto-period valid. Maintain continuous monitoring.';
    }

    const isCompliant = status === 'COMPLIANT_IN_CUSTODY';
    const isRotationUrgent = status === 'ROTATION_OVERDUE_EXPIRED' || status === 'EMERGENCY_REVOCATION_COMPROMISED';

    const auditPayload = `${record.tenantId}:${record.keyId}:${record.keyVersion}:${status}:${keyAgeDays}`;
    const auditRecordHash = createHash('sha256').update(auditPayload).digest('hex');

    return {
      tenantId: record.tenantId,
      keyId: record.keyId,
      keyVersion: record.keyVersion,
      keyAgeDays,
      daysRemainingBeforeExpiry: daysRemaining,
      status,
      isRotationUrgent,
      complianceFrameworks: {
        nistSp800_57: isCompliant,
        soc2Cc6_1: isCompliant,
        pciDss3_6: isCompliant,
      },
      recommendedAction,
      auditRecordHash,
    };
  }

  /**
   * Audits all registered tenant keys across the fleet.
   */
  public auditAllKeys(): CustodyAuditReport[] {
    const reports: CustodyAuditReport[] = [];
    for (const keyId of this.custodyRecords.keys()) {
      reports.push(this.auditKeyCustody(keyId));
    }
    return reports;
  }
}
