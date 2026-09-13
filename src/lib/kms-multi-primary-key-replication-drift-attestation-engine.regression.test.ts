/**
 * src/lib/kms-multi-primary-key-replication-drift-attestation-engine.regression.test.ts
 * Regression tests for QA-196 Automated Cross-Region KMS Multi-Primary Key Replication Drift Attestation Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  KmsMultiPrimaryKeyReplicationDriftAttestationEngine,
  MultiRegionKmsClusterInput
} from './kms-multi-primary-key-replication-drift-attestation-engine';

describe('KmsMultiPrimaryKeyReplicationDriftAttestationEngine (QA-196)', () => {
  const engine = new KmsMultiPrimaryKeyReplicationDriftAttestationEngine();

  it('validates perfectly synchronized cross-region multi-primary KMS keys', () => {
    const cluster: MultiRegionKmsClusterInput = {
      tenantId: 'TENANT-FINTECH-01',
      provider: 'AWS',
      primaryRegion: 'us-east-1',
      primaryKeyId: 'arn:aws:kms:us-east-1:111122223333:key/mrk-primary-01',
      replicas: [
        {
          region: 'us-east-1',
          keyArnOrId: 'arn:aws:kms:us-east-1:111122223333:key/mrk-primary-01',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'a1b2c3d4e5f60000111122223333444455556666777788889999aaaabbbbcccc',
          keyPolicyHashSha256: '9999888877776666555544443333222211110000ffffaaabbbcccdddeeefff00',
          rotationPeriodDays: 365,
          lastRotatedEpoch: 1700000000
        },
        {
          region: 'eu-west-1',
          keyArnOrId: 'arn:aws:kms:eu-west-1:111122223333:key/mrk-replica-01',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'a1b2c3d4e5f60000111122223333444455556666777788889999aaaabbbbcccc',
          keyPolicyHashSha256: '9999888877776666555544443333222211110000ffffaaabbbcccdddeeefff00',
          rotationPeriodDays: 365,
          lastRotatedEpoch: 1700000000
        }
      ]
    };

    const res = engine.evaluateCluster(cluster);
    expect(res.isFullySynchronized).toBe(true);
    expect(res.hasKeyMaterialMismatch).toBe(false);
    expect(res.hasPolicyDrift).toBe(false);
    expect(res.complianceStatus).toBe('SOC2_COMPLIANT_SYNCHRONIZED');
    expect(res.driftFlags).toHaveLength(0);
    expect(res.attestationDigestSha256).toHaveLength(64);
  });

  it('detects critical key material mismatch across replicas', () => {
    const cluster: MultiRegionKmsClusterInput = {
      tenantId: 'TENANT-HEALTH-02',
      provider: 'GCP',
      primaryRegion: 'us-central1',
      primaryKeyId: 'projects/p/locations/us-central1/keyRings/r/cryptoKeys/k',
      replicas: [
        {
          region: 'us-central1',
          keyArnOrId: 'k-primary',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'deadbeef111122223333444455556666777788889999aaaabbbbccccdddd0000',
          keyPolicyHashSha256: 'policy1111',
          rotationPeriodDays: 90,
          lastRotatedEpoch: 1710000000
        },
        {
          region: 'europe-west3',
          keyArnOrId: 'k-replica-de',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'corrupteddifferentmaterial0000111122223333444455556666777788889999',
          keyPolicyHashSha256: 'policy1111',
          rotationPeriodDays: 90,
          lastRotatedEpoch: 1710000000
        }
      ]
    };

    const res = engine.evaluateCluster(cluster);
    expect(res.isFullySynchronized).toBe(false);
    expect(res.hasKeyMaterialMismatch).toBe(true);
    expect(res.complianceStatus).toBe('CRITICAL_KEY_MISMATCH');
    expect(res.driftFlags.some(f => f.includes('KEY_MATERIAL_MISMATCH'))).toBe(true);
  });

  it('flags IAM policy drift on secondary region', () => {
    const cluster: MultiRegionKmsClusterInput = {
      tenantId: 'TENANT-SEC-03',
      provider: 'AWS',
      primaryRegion: 'us-east-1',
      primaryKeyId: 'primary-key',
      replicas: [
        {
          region: 'us-east-1',
          keyArnOrId: 'pk',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'hash123',
          keyPolicyHashSha256: 'policyA',
          rotationPeriodDays: 180,
          lastRotatedEpoch: 1700000000
        },
        {
          region: 'ap-southeast-1',
          keyArnOrId: 'rk',
          keyState: 'ENABLED',
          keyMaterialFingerprintSha256: 'hash123',
          keyPolicyHashSha256: 'policyDriftedB',
          rotationPeriodDays: 180,
          lastRotatedEpoch: 1700000000
        }
      ]
    };

    const res = engine.evaluateCluster(cluster);
    expect(res.isFullySynchronized).toBe(false);
    expect(res.hasPolicyDrift).toBe(true);
    expect(res.complianceStatus).toBe('DRIFT_DETECTED_WARNING');
    expect(res.driftFlags.some(f => f.includes('POLICY_DRIFT'))).toBe(true);
  });
});
