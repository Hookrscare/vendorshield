/**
 * src/lib/kms-multi-primary-key-replication-drift-attestation-engine.ts
 * Part of VendorShield Third-Party SaaS Security & Compliance Ecosystem.
 *
 * QA-196: Automated Cross-Region KMS Multi-Primary Key Replication Drift Attestation Engine.
 * Verifies multi-region customer managed encryption keys (CMEK) synchronization,
 * cryptographic key material digest consistency across AWS KMS / GCP Cloud KMS / Azure Key Vault,
 * detects key policy drift, and enforces SOC 2 CC6.1 / CC6.7 key lifecycle compliance.
 */

import { createHash } from 'crypto';

export type CloudProvider = 'AWS' | 'GCP' | 'AZURE';

export interface RegionalKeyReplicaState {
  region: string;
  keyArnOrId: string;
  keyState: 'ENABLED' | 'DISABLED' | 'PENDING_ROTATION' | 'PENDING_DELETION';
  keyMaterialFingerprintSha256: string;
  keyPolicyHashSha256: string;
  rotationPeriodDays: number;
  lastRotatedEpoch: number;
}

export interface MultiRegionKmsClusterInput {
  tenantId: string;
  provider: CloudProvider;
  primaryRegion: string;
  primaryKeyId: string;
  replicas: RegionalKeyReplicaState[];
}

export interface KmsReplicationDriftAttestation {
  tenantId: string;
  provider: CloudProvider;
  totalRegionsEvaluated: number;
  isFullySynchronized: boolean;
  hasKeyMaterialMismatch: boolean;
  hasPolicyDrift: boolean;
  driftFlags: string[];
  complianceStatus: 'SOC2_COMPLIANT_SYNCHRONIZED' | 'DRIFT_DETECTED_WARNING' | 'CRITICAL_KEY_MISMATCH';
  attestationDigestSha256: string;
}

export class KmsMultiPrimaryKeyReplicationDriftAttestationEngine {
  public evaluateCluster(cluster: MultiRegionKmsClusterInput): KmsReplicationDriftAttestation {
    if (!cluster.replicas || cluster.replicas.length === 0) {
      throw new Error('At least one regional key replica must be provided.');
    }

    const primary = cluster.replicas.find(r => r.region === cluster.primaryRegion);
    if (!primary) {
      throw new Error(`Primary region '${cluster.primaryRegion}' not found in provided replicas.`);
    }

    const driftFlags: string[] = [];
    let hasKeyMaterialMismatch = false;
    let hasPolicyDrift = false;

    for (const replica of cluster.replicas) {
      if (replica.keyState !== 'ENABLED') {
        driftFlags.push(`REGION_${replica.region}_STATE_${replica.keyState}`);
      }

      if (replica.keyMaterialFingerprintSha256 !== primary.keyMaterialFingerprintSha256) {
        hasKeyMaterialMismatch = true;
        driftFlags.push(`KEY_MATERIAL_MISMATCH_${replica.region}_VS_PRIMARY`);
      }

      if (replica.keyPolicyHashSha256 !== primary.keyPolicyHashSha256) {
        hasPolicyDrift = true;
        driftFlags.push(`POLICY_DRIFT_${replica.region}`);
      }

      if (replica.rotationPeriodDays > 365) {
        driftFlags.push(`EXCESSIVE_ROTATION_WINDOW_${replica.region}_${replica.rotationPeriodDays}D`);
      }
    }

    let status: KmsReplicationDriftAttestation['complianceStatus'] = 'SOC2_COMPLIANT_SYNCHRONIZED';
    if (hasKeyMaterialMismatch) {
      status = 'CRITICAL_KEY_MISMATCH';
    } else if (hasPolicyDrift || driftFlags.length > 0) {
      status = 'DRIFT_DETECTED_WARNING';
    }

    const isFullySync = !hasKeyMaterialMismatch && !hasPolicyDrift && driftFlags.length === 0;

    const raw = `${cluster.tenantId}:${cluster.provider}:${cluster.primaryRegion}:${isFullySync}:${status}:${driftFlags.join(',')}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      tenantId: cluster.tenantId,
      provider: cluster.provider,
      totalRegionsEvaluated: cluster.replicas.length,
      isFullySynchronized: isFullySync,
      hasKeyMaterialMismatch,
      hasPolicyDrift,
      driftFlags,
      complianceStatus: status,
      attestationDigestSha256: digest
    };
  }
}
