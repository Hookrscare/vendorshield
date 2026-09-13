/**
 * cross-tenant-kms-isolation-validator.ts
 * QA-188: Sub-Processor Cross-Tenant Encryption Key Isolation Validator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Multi-tenant cryptographic isolation verifier:
 * 1. Derives unique tenant data encryption keys using HKDF-SHA256 from master key.
 * 2. Encrypts and decrypts tenant records via AES-256-GCM authenticated envelope encryption.
 * 3. Simulates adversarial cross-tenant breach attempts and verifies decryption failure.
 * 4. Generates SOC 2 CC6.1 / CC6.3 cryptographic segregation attestation reports.
 */

import crypto from 'crypto';

export interface EncryptedTenantRecord {
  tenantId: string;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
}

export interface IsolationAuditResult {
  isSecurelyIsolated: boolean;
  status: 'CRYPTOGRAPHIC_ISOLATION_CONFIRMED' | 'CROSS_TENANT_LEAKAGE_CRITICAL_BREACH' | 'DECRYPTION_TAMPER_DETECTED';
  tenantId: string;
  auditMessage: string;
}

export class CrossTenantKmsIsolationValidator {
  /**
   * Derives a 256-bit tenant-specific encryption key using HKDF-SHA256.
   */
  public static deriveTenantKey(masterSecret: string, tenantId: string): Buffer {
    const raw = crypto.hkdfSync(
      'sha256',
      Buffer.from(masterSecret, 'utf-8'),
      Buffer.from('vendorshield-kms-salt-2026', 'utf-8'),
      Buffer.from(`tenant-encryption-key:${tenantId}`, 'utf-8'),
      32
    );
    return Buffer.from(raw);
  }

  /**
   * Encrypts plaintext under tenant-specific AES-256-GCM.
   */
  public static encryptRecord(
    masterSecret: string,
    tenantId: string,
    plaintext: string
  ): EncryptedTenantRecord {
    const key = this.deriveTenantKey(masterSecret, tenantId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      tenantId,
      ivHex: iv.toString('hex'),
      authTagHex: authTag,
      ciphertextHex: ciphertext
    };
  }

  /**
   * Attempts to decrypt record with a target tenant context.
   */
  public static decryptRecord(
    masterSecret: string,
    attemptingTenantId: string,
    record: EncryptedTenantRecord
  ): string {
    const key = this.deriveTenantKey(masterSecret, attemptingTenantId);
    const iv = Buffer.from(record.ivHex, 'hex');
    const authTag = Buffer.from(record.authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(record.ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Verifies that tenant A's record cannot be decrypted by tenant B.
   */
  public static auditCrossTenantIsolation(
    masterSecret: string,
    authorizedTenantId: string,
    adversaryTenantId: string,
    sampleSecretData: string
  ): IsolationAuditResult {
    const record = this.encryptRecord(masterSecret, authorizedTenantId, sampleSecretData);

    // 1. Verify authorized tenant can decrypt
    let authDecrypted = '';
    try {
      authDecrypted = this.decryptRecord(masterSecret, authorizedTenantId, record);
    } catch {
      return {
        isSecurelyIsolated: false,
        status: 'DECRYPTION_TAMPER_DETECTED',
        tenantId: authorizedTenantId,
        auditMessage: 'Authorized tenant failed to decrypt its own record.'
      };
    }

    if (authDecrypted !== sampleSecretData) {
      return {
        isSecurelyIsolated: false,
        status: 'DECRYPTION_TAMPER_DETECTED',
        tenantId: authorizedTenantId,
        auditMessage: 'Decrypted data does not match original plaintext.'
      };
    }

    // 2. Verify adversary tenant CANNOT decrypt
    try {
      const adversaryDecrypted = this.decryptRecord(masterSecret, adversaryTenantId, record);
      if (adversaryDecrypted) {
        return {
          isSecurelyIsolated: false,
          status: 'CROSS_TENANT_LEAKAGE_CRITICAL_BREACH',
          tenantId: authorizedTenantId,
          auditMessage: `CRITICAL BREACH: Adversary tenant (${adversaryTenantId}) successfully decrypted data belonging to (${authorizedTenantId})!`
        };
      }
    } catch {
      // Expected: AES-GCM MAC check failed
    }

    return {
      isSecurelyIsolated: true,
      status: 'CRYPTOGRAPHIC_ISOLATION_CONFIRMED',
      tenantId: authorizedTenantId,
      auditMessage: `Cryptographic isolation confirmed. Tenant ${adversaryTenantId} cannot decrypt Tenant ${authorizedTenantId} records.`
    };
  }
}
