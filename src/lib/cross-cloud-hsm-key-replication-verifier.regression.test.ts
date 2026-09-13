import { describe, it, expect } from 'vitest';
import {
  CrossCloudHsmKeyReplicationVerifier,
  HsmReplicaNode,
} from './cross-cloud-hsm-key-replication-verifier';

describe('QA-181: CrossCloudHsmKeyReplicationVerifier Tests', () => {
  const verifier = new CrossCloudHsmKeyReplicationVerifier(5000, 'EU');
  const validFingerprint = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('validates compliant multi-cloud sovereign HSM replication topology', () => {
    const replicas: HsmReplicaNode[] = [
      {
        cloudProvider: 'AWS',
        region: 'eu-central-1',
        sovereignJurisdiction: 'EU',
        fipsLevel: 3,
        keyFingerprintSha256: validFingerprint,
        hsmAttestationCertificateChainValid: true,
        lastReplicationLagMs: 850,
      },
      {
        cloudProvider: 'GCP',
        region: 'europe-west3',
        sovereignJurisdiction: 'EU',
        fipsLevel: 4,
        keyFingerprintSha256: validFingerprint,
        hsmAttestationCertificateChainValid: true,
        lastReplicationLagMs: 1200,
      },
    ];

    const result = verifier.verifyTopology(validFingerprint, replicas);
    expect(result.isCompliant).toBe(true);
    expect(result.activeReplicaCount).toBe(2);
    expect(result.jurisdictionCompliant).toBe(true);
    expect(result.cryptographicConsistencyVerified).toBe(true);
    expect(result.replicationLatencySlaMet).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects jurisdiction cross-border violation and single provider lock-in', () => {
    const invalidReplicas: HsmReplicaNode[] = [
      {
        cloudProvider: 'AWS',
        region: 'eu-central-1',
        sovereignJurisdiction: 'EU',
        fipsLevel: 3,
        keyFingerprintSha256: validFingerprint,
        hsmAttestationCertificateChainValid: true,
        lastReplicationLagMs: 500,
      },
      {
        cloudProvider: 'AWS',
        region: 'us-east-1',
        sovereignJurisdiction: 'US', // Violation: outside EU
        fipsLevel: 3,
        keyFingerprintSha256: validFingerprint,
        hsmAttestationCertificateChainValid: true,
        lastReplicationLagMs: 6500, // Violation: latency SLA breach
      },
    ];

    const result = verifier.verifyTopology(validFingerprint, invalidReplicas);
    expect(result.isCompliant).toBe(false);
    expect(result.jurisdictionCompliant).toBe(false);
    expect(result.replicationLatencySlaMet).toBe(false);
    expect(result.violations.some(v => v.includes('Single cloud provider lock-in'))).toBe(true);
    expect(result.violations.some(v => v.includes('Jurisdiction violation'))).toBe(true);
    expect(result.violations.some(v => v.includes('Replication lag SLA breach'))).toBe(true);
  });
});
