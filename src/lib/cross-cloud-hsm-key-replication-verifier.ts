/**
 * QA-181: Cross-Cloud Multi-Region Sovereign Key Backup HSM Replication Verifier
 * 
 * Verifies sovereign root-of-trust hardware security module (HSM) replication topology,
 * latency SLAs, and cryptographic key attestation across multi-cloud regions (AWS/GCP/Azure)
 * without exposing unencrypted key material.
 */

export interface HsmReplicaNode {
  cloudProvider: 'AWS' | 'GCP' | 'AZURE' | 'ON_PREM_HSM';
  region: string;
  sovereignJurisdiction: 'EU' | 'US' | 'APAC' | 'CH';
  fipsLevel: 3 | 4;
  keyFingerprintSha256: string;
  hsmAttestationCertificateChainValid: boolean;
  lastReplicationLagMs: number;
}

export interface SovereignHsmReplicationVerificationResult {
  isCompliant: boolean;
  activeReplicaCount: number;
  jurisdictionCompliant: boolean;
  cryptographicConsistencyVerified: boolean;
  replicationLatencySlaMet: boolean;
  violations: string[];
}

export class CrossCloudHsmKeyReplicationVerifier {
  private readonly maxPermissibleLagMs: number;
  private readonly requiredJurisdiction: string;

  constructor(maxPermissibleLagMs: number = 5000, requiredJurisdiction: string = 'EU') {
    this.maxPermissibleLagMs = maxPermissibleLagMs;
    this.requiredJurisdiction = requiredJurisdiction;
  }

  public verifyTopology(
    primaryKeyFingerprint: string,
    replicas: HsmReplicaNode[]
  ): SovereignHsmReplicationVerificationResult {
    const violations: string[] = [];

    if (replicas.length < 2) {
      violations.push('Insufficient redundancy: At least 2 active HSM replica nodes required across distinct providers.');
    }

    // Check provider diversity (must span at least 2 distinct cloud providers)
    const providers = new Set(replicas.map(r => r.cloudProvider));
    if (providers.size < 2) {
      violations.push('Single cloud provider lock-in: Replicas must span at least 2 distinct cloud/HSM providers.');
    }

    let allJurisdictionValid = true;
    let allFingerprintsMatch = true;
    let allLatencySlaMet = true;

    for (const replica of replicas) {
      // Jurisdiction check
      if (replica.sovereignJurisdiction !== this.requiredJurisdiction) {
        allJurisdictionValid = false;
        violations.push(`Jurisdiction violation: Node in ${replica.region} (${replica.cloudProvider}) belongs to ${replica.sovereignJurisdiction}, expected ${this.requiredJurisdiction}.`);
      }

      // Attestation check
      if (!replica.hsmAttestationCertificateChainValid) {
        violations.push(`Attestation failure: Invalid hardware attestation cert chain on ${replica.cloudProvider}:${replica.region}.`);
      }

      // FIPS level check
      if (replica.fipsLevel < 3) {
        violations.push(`Security violation: ${replica.cloudProvider}:${replica.region} FIPS level ${replica.fipsLevel} does not meet FIPS 140-3 Level 3+ minimum.`);
      }

      // Cryptographic consistency
      if (replica.keyFingerprintSha256 !== primaryKeyFingerprint) {
        allFingerprintsMatch = false;
        violations.push(`Cryptographic drift: Fingerprint mismatch on ${replica.cloudProvider}:${replica.region}.`);
      }

      // Replication lag
      if (replica.lastReplicationLagMs > this.maxPermissibleLagMs) {
        allLatencySlaMet = false;
        violations.push(`Replication lag SLA breach: ${replica.lastReplicationLagMs}ms on ${replica.cloudProvider}:${replica.region} exceeds ${this.maxPermissibleLagMs}ms.`);
      }
    }

    const isCompliant = violations.length === 0;

    return {
      isCompliant,
      activeReplicaCount: replicas.length,
      jurisdictionCompliant: allJurisdictionValid,
      cryptographicConsistencyVerified: allFingerprintsMatch,
      replicationLatencySlaMet: allLatencySlaMet,
      violations,
    };
  }
}
