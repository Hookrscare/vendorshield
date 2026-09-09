import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { ZkKeyCustodyMonitor, KeyCustodyRecord } from './zk-key-custody-monitor';

describe('QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor', () => {
  let monitor: ZkKeyCustodyMonitor;
  const hsmSecret = 'super-secure-hsm-shared-key-9988';

  beforeEach(() => {
    monitor = new ZkKeyCustodyMonitor();
  });

  it('should verify zero-knowledge challenge-response attestation from HSM', () => {
    const record: KeyCustodyRecord = {
      tenantId: 'tenant-enterprise-acme',
      keyId: 'key-acme-sec-01',
      keyVersion: 1,
      hsmProvider: 'AWS_KMS_CLOUDHSM',
      createdAtIso: '2026-01-01T00:00:00.000Z',
      lastRotatedAtIso: '2026-08-01T00:00:00.000Z',
      cryptoPeriodDays: 90,
      isCompromisedFlag: false,
    };
    monitor.registerKeyCustody(record);

    const nonce = monitor.issueCustodyChallenge('key-acme-sec-01');
    expect(nonce).toHaveLength(64);

    // Compute proof
    const validProof = createHmac('sha256', hsmSecret)
      .update(`key-acme-sec-01:${nonce}:1`)
      .digest('hex');

    const isValid = monitor.verifyCustodyAttestation('key-acme-sec-01', hsmSecret, validProof);
    expect(isValid).toBe(true);

    // Replay attack should fail as nonce is invalidated
    const replayAttack = monitor.verifyCustodyAttestation('key-acme-sec-01', hsmSecret, validProof);
    expect(replayAttack).toBe(false);
  });

  it('should flag expired keys requiring urgent crypto-period rotation', () => {
    const record: KeyCustodyRecord = {
      tenantId: 'tenant-fintech-bank',
      keyId: 'key-fintech-vault-02',
      keyVersion: 3,
      hsmProvider: 'AZURE_DEDICATED_HSM',
      createdAtIso: '2025-01-01T00:00:00.000Z',
      lastRotatedAtIso: '2026-01-01T00:00:00.000Z', // Rotated > 200 days ago
      cryptoPeriodDays: 90,
      lastAttestationVerifiedAtIso: '2026-09-08T00:00:00.000Z',
      isCompromisedFlag: false,
    };
    monitor.registerKeyCustody(record);

    const audit = monitor.auditKeyCustody('key-fintech-vault-02', '2026-09-09T00:00:00.000Z');
    expect(audit.status).toBe('ROTATION_OVERDUE_EXPIRED');
    expect(audit.isRotationUrgent).toBe(true);
    expect(audit.complianceFrameworks.nistSp800_57).toBe(false);
    expect(audit.daysRemainingBeforeExpiry).toBeLessThanOrEqual(0);
    expect(audit.auditRecordHash).toHaveLength(64);
  });

  it('should immediately trigger emergency revocation on compromised key flag', () => {
    const record: KeyCustodyRecord = {
      tenantId: 'tenant-breached-node',
      keyId: 'key-compromised-03',
      keyVersion: 2,
      hsmProvider: 'GCP_CLOUD_HSM',
      createdAtIso: '2026-08-01T00:00:00.000Z',
      lastRotatedAtIso: '2026-08-01T00:00:00.000Z',
      cryptoPeriodDays: 90,
      lastAttestationVerifiedAtIso: '2026-09-01T00:00:00.000Z',
      isCompromisedFlag: true, // Marked compromised
    };
    monitor.registerKeyCustody(record);

    const audit = monitor.auditKeyCustody('key-compromised-03', '2026-09-09T00:00:00.000Z');
    expect(audit.status).toBe('EMERGENCY_REVOCATION_COMPROMISED');
    expect(audit.isRotationUrgent).toBe(true);
    expect(audit.recommendedAction).toContain('Immediate cryptographic key destruction');
  });
});
