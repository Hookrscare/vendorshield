import { describe, it, expect, beforeEach } from 'vitest';
import { ZeroKnowledgeKeyRotationPipeline } from './zk-key-rotation-pipeline';

describe('QA-136: Multi-Tenant Zero-Knowledge Data Encryption Key Rotation Pipeline', () => {
  let pipeline: ZeroKnowledgeKeyRotationPipeline;
  const tenantA = 'tenant-acme-corp';
  const tenantB = 'tenant-globex';

  beforeEach(() => {
    pipeline = new ZeroKnowledgeKeyRotationPipeline();
    pipeline.enrollTenant(tenantA);
    pipeline.enrollTenant(tenantB);
  });

  it('should encrypt and decrypt data with tenant isolation and active DEK', () => {
    const sensitiveData = JSON.stringify({ ssn: '000-12-3456', plan: 'Enterprise' });
    const payload = pipeline.encryptData(tenantA, sensitiveData);

    expect(payload.tenantId).toBe(tenantA);
    expect(payload.keyVersion).toBe(1);
    expect(payload.ciphertextHex).not.toBe(sensitiveData);

    const decrypted = pipeline.decryptData(payload);
    expect(decrypted).toBe(sensitiveData);

    // Cross-tenant decryption attempt must fail
    const forgedPayload = { ...payload, tenantId: tenantB };
    expect(() => pipeline.decryptData(forgedPayload)).toThrow();
  });

  it('should rotate keys, maintain backward compatibility for historical reads, and re-encrypt', () => {
    const item1 = pipeline.encryptData(tenantA, 'Historical Record 1 (Encrypted v1)');
    expect(item1.keyVersion).toBe(1);

    // Perform key rotation
    const newVersion = pipeline.rotateTenantKey(tenantA);
    expect(newVersion.version).toBe(2);
    expect(newVersion.state).toBe('ACTIVE');

    const inventory = pipeline.getKeyInventory(tenantA);
    expect(inventory.length).toBe(2);
    expect(inventory[0].state).toBe('RETIRED');
    expect(inventory[1].state).toBe('ACTIVE');

    // Historical record encrypted with v1 can still be read
    const readV1 = pipeline.decryptData(item1);
    expect(readV1).toBe('Historical Record 1 (Encrypted v1)');

    // New writes use v2
    const item2 = pipeline.encryptData(tenantA, 'New Record 2 (Encrypted v2)');
    expect(item2.keyVersion).toBe(2);
    expect(pipeline.decryptData(item2)).toBe('New Record 2 (Encrypted v2)');

    // Batch re-encrypt historical payloads to v2
    const { updatedPayloads, auditLog } = pipeline.reencryptBatch(tenantA, [item1, item2]);
    expect(updatedPayloads[0].keyVersion).toBe(2);
    expect(updatedPayloads[1].keyVersion).toBe(2);
    expect(auditLog.auditDigestSha256).toBeDefined();
    expect(auditLog.reencryptedRecordCount).toBe(2);

    // Verify all records decrypt cleanly under new key
    expect(pipeline.decryptData(updatedPayloads[0])).toBe('Historical Record 1 (Encrypted v1)');
  });

  it('should execute cryptographic erasure upon tenant offboarding', () => {
    const payload = pipeline.encryptData(tenantA, 'Critical GDPR Classified Document');
    expect(pipeline.decryptData(payload)).toBe('Critical GDPR Classified Document');

    // Cryptographic Erasure
    pipeline.cryptographicallyEraseTenant(tenantA);

    // Decryption must permanently fail
    expect(() => pipeline.decryptData(payload)).toThrow(/Master key not found|REVOKED_DESTROYED/);

    const inventory = pipeline.getKeyInventory(tenantA);
    expect(inventory.every((k) => k.state === 'REVOKED_DESTROYED')).toBe(true);
  });
});
