import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export type KeyState = 'ACTIVE' | 'RETIRED' | 'REVOKED_DESTROYED';

export interface TenantKeyVersion {
  version: number;
  keyId: string;
  state: KeyState;
  createdAtIso: string;
  retiredAtIso?: string;
  revokedAtIso?: string;
  encryptedKeyBytesHex: string; // Wrapped with Tenant Master Key
}

export interface EncryptedPayload {
  tenantId: string;
  keyVersion: number;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
}

export interface RotationAuditLog {
  tenantId: string;
  oldVersion: number;
  newVersion: number;
  rotatedAtIso: string;
  reencryptedRecordCount: number;
  auditDigestSha256: string;
}

export class ZeroKnowledgeKeyRotationPipeline {
  private tenantMasterKeys: Map<string, Buffer> = new Map(); // Tenant root KEK
  private tenantKeyRings: Map<string, TenantKeyVersion[]> = new Map(); // Versioned DEKs
  private auditTrail: RotationAuditLog[] = [];

  /**
   * Initializes a tenant root KEK and first active DEK (v1).
   */
  public enrollTenant(tenantId: string, customMasterKeyHex?: string): TenantKeyVersion {
    const kek = customMasterKeyHex ? Buffer.from(customMasterKeyHex, 'hex') : randomBytes(32);
    this.tenantMasterKeys.set(tenantId, kek);

    const initialDek = this.generateNewDek(tenantId, 1, kek);
    this.tenantKeyRings.set(tenantId, [initialDek]);
    return initialDek;
  }

  /**
   * Generates a new versioned Data Encryption Key (DEK) wrapped under the Tenant KEK.
   */
  private generateNewDek(tenantId: string, version: number, kek: Buffer): TenantKeyVersion {
    const rawDek = randomBytes(32);
    const keyId = `dek-${tenantId}-v${version}-${Date.now()}`;

    // Wrap DEK with KEK using AES-256-GCM
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', kek, iv);
    const encrypted = Buffer.concat([cipher.update(rawDek), cipher.final()]);
    const tag = cipher.getAuthTag();

    const wrappedPayload = Buffer.concat([iv, tag, encrypted]).toString('hex');

    return {
      version,
      keyId,
      state: 'ACTIVE',
      createdAtIso: new Date().toISOString(),
      encryptedKeyBytesHex: wrappedPayload,
    };
  }

  /**
   * Unwraps the DEK using Tenant KEK.
   */
  private unwrapDek(tenantId: string, versionItem: TenantKeyVersion): Buffer {
    if (versionItem.state === 'REVOKED_DESTROYED') {
      throw new Error(`Cannot unwrap key version ${versionItem.version}: Key is REVOKED_DESTROYED`);
    }

    const kek = this.tenantMasterKeys.get(tenantId);
    if (!kek) {
      throw new Error(`Master key not found for tenant ${tenantId}`);
    }

    const rawWrapped = Buffer.from(versionItem.encryptedKeyBytesHex, 'hex');
    const iv = rawWrapped.subarray(0, 12);
    const tag = rawWrapped.subarray(12, 28);
    const ciphertext = rawWrapped.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', kek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Encrypts plaintext data using the tenant's current ACTIVE DEK.
   */
  public encryptData(tenantId: string, plaintext: string): EncryptedPayload {
    const ring = this.tenantKeyRings.get(tenantId);
    if (!ring) {
      throw new Error(`Tenant ${tenantId} is not enrolled`);
    }

    const activeKey = ring.find((k) => k.state === 'ACTIVE');
    if (!activeKey) {
      throw new Error(`No active key found for tenant ${tenantId}`);
    }

    const dek = this.unwrapDek(tenantId, activeKey);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dek, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      tenantId,
      keyVersion: activeKey.version,
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      ciphertextHex: ciphertext.toString('hex'),
    };
  }

  /**
   * Decrypts ciphertext using the specific key version recorded in the payload.
   */
  public decryptData(payload: EncryptedPayload): string {
    const ring = this.tenantKeyRings.get(payload.tenantId);
    if (!ring) {
      throw new Error(`Tenant ${payload.tenantId} not found`);
    }

    const targetKey = ring.find((k) => k.version === payload.keyVersion);
    if (!targetKey) {
      throw new Error(`Key version ${payload.keyVersion} not found for tenant ${payload.tenantId}`);
    }

    const dek = this.unwrapDek(payload.tenantId, targetKey);
    const iv = Buffer.from(payload.ivHex, 'hex');
    const authTag = Buffer.from(payload.authTagHex, 'hex');
    const ciphertext = Buffer.from(payload.ciphertextHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Rotates the tenant's DEK: retires the old active key and generates a new active key version.
   */
  public rotateTenantKey(tenantId: string): TenantKeyVersion {
    const ring = this.tenantKeyRings.get(tenantId);
    const kek = this.tenantMasterKeys.get(tenantId);
    if (!ring || !kek) {
      throw new Error(`Tenant ${tenantId} not enrolled`);
    }

    const currentActive = ring.find((k) => k.state === 'ACTIVE');
    if (currentActive) {
      currentActive.state = 'RETIRED';
      currentActive.retiredAtIso = new Date().toISOString();
    }

    const nextVersion = ring.length + 1;
    const newActive = this.generateNewDek(tenantId, nextVersion, kek);
    ring.push(newActive);

    return newActive;
  }

  /**
   * Background re-encryption worker: transforms an existing payload encrypted under an older DEK
   * to the newly activated DEK without exposing raw plaintext externally.
   */
  public reencryptPayload(payload: EncryptedPayload): EncryptedPayload {
    const plaintext = this.decryptData(payload);
    return this.encryptData(payload.tenantId, plaintext);
  }

  /**
   * Batch re-encrypts a collection of payloads and generates an immutable audit record.
   */
  public reencryptBatch(
    tenantId: string,
    payloads: EncryptedPayload[]
  ): { updatedPayloads: EncryptedPayload[]; auditLog: RotationAuditLog } {
    const updated: EncryptedPayload[] = [];
    const ring = this.tenantKeyRings.get(tenantId);
    const activeKey = ring?.find((k) => k.state === 'ACTIVE');
    const newVersion = activeKey ? activeKey.version : 1;
    const oldVersion = Math.min(...payloads.map((p) => p.keyVersion));

    for (const p of payloads) {
      if (p.keyVersion !== newVersion) {
        updated.push(this.reencryptPayload(p));
      } else {
        updated.push(p);
      }
    }

    const rotatedAt = new Date().toISOString();
    const digestPayload = `${tenantId}:${oldVersion}->${newVersion}:${payloads.length}:${rotatedAt}`;
    const auditDigest = createHash('sha256').update(digestPayload).digest('hex');

    const log: RotationAuditLog = {
      tenantId,
      oldVersion,
      newVersion,
      rotatedAtIso: rotatedAt,
      reencryptedRecordCount: updated.length,
      auditDigestSha256: auditDigest,
    };

    this.auditTrail.push(log);
    return { updatedPayloads: updated, auditLog: log };
  }

  /**
   * Cryptographic Erasure: Destroys the Tenant Master Key and marks all DEKs REVOKED_DESTROYED.
   * Renders all historical and current ciphertexts permanently unrecoverable.
   */
  public cryptographicallyEraseTenant(tenantId: string): void {
    this.tenantMasterKeys.delete(tenantId);
    const ring = this.tenantKeyRings.get(tenantId);
    if (ring) {
      for (const k of ring) {
        k.state = 'REVOKED_DESTROYED';
        k.revokedAtIso = new Date().toISOString();
        k.encryptedKeyBytesHex = '00'.repeat(k.encryptedKeyBytesHex.length / 2); // zero-fill memory
      }
    }
  }

  /**
   * Returns the key version inventory for a tenant.
   */
  public getKeyInventory(tenantId: string): TenantKeyVersion[] {
    return this.tenantKeyRings.get(tenantId) || [];
  }
}
