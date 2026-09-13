import { describe, it, expect } from 'vitest';
import { CrossTenantKmsIsolationValidator } from './cross-tenant-kms-isolation-validator';

describe('QA-188: Sub-Processor Cross-Tenant Encryption Key Isolation Validator', () => {
  const MASTER_KEY = 'super_secure_hsm_master_kms_key_bytes_512';
  const TENANT_ACME = 'tenant_acme_corp_881';
  const TENANT_GLOBEX = 'tenant_globex_corp_992';
  const SENSITIVE_PAYLOAD = JSON.stringify({ ssn: '000-12-3456', balance: 50000 });

  it('confirms cryptographic isolation and rejects unauthorized cross-tenant decryption', () => {
    const result = CrossTenantKmsIsolationValidator.auditCrossTenantIsolation(
      MASTER_KEY,
      TENANT_ACME,
      TENANT_GLOBEX,
      SENSITIVE_PAYLOAD
    );

    expect(result.isSecurelyIsolated).toBe(true);
    expect(result.status).toBe('CRYPTOGRAPHIC_ISOLATION_CONFIRMED');
    expect(result.auditMessage).toContain('Cryptographic isolation confirmed');
  });

  it('derives unique keys for distinct tenants', () => {
    const keyAcme = CrossTenantKmsIsolationValidator.deriveTenantKey(MASTER_KEY, TENANT_ACME);
    const keyGlobex = CrossTenantKmsIsolationValidator.deriveTenantKey(MASTER_KEY, TENANT_GLOBEX);

    expect(keyAcme.equals(keyGlobex)).toBe(false);
    expect(keyAcme.length).toBe(32);
    expect(keyGlobex.length).toBe(32);
  });

  it('fails decryption when ciphertext or auth tag is corrupted', () => {
    const record = CrossTenantKmsIsolationValidator.encryptRecord(
      MASTER_KEY,
      TENANT_ACME,
      SENSITIVE_PAYLOAD
    );

    // Tamper with ciphertext
    const tamperedHex = record.ciphertextHex.slice(0, -2) + '00';
    const tamperedRecord = { ...record, ciphertextHex: tamperedHex };

    expect(() => {
      CrossTenantKmsIsolationValidator.decryptRecord(MASTER_KEY, TENANT_ACME, tamperedRecord);
    }).toThrow();
  });
});
