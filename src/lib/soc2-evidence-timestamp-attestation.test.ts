import { describe, it, expect } from 'vitest';
import {
  Soc2EvidenceTimestampAttestation,
  EvidenceAsset
} from './soc2-evidence-timestamp-attestation';

describe('QA-170: SOC 2 Type II Evidence Cryptographic Timestamping Attestation Daemon', () => {
  const sampleAssets: EvidenceAsset[] = [
    {
      assetId: 'ev-cc6-01',
      category: 'SECURITY_CC6',
      filename: 'aws-iam-mfa-enforcement.tf',
      contentBuffer: 'resource "aws_iam_policy" "enforce_mfa" { ... }',
      collectedAtIso: '2026-09-13T06:00:00Z',
      collectorAgentId: 'agent-compliance-guard'
    },
    {
      assetId: 'ev-a1-02',
      category: 'AVAILABILITY_A1',
      filename: 'multi-az-database-failover-drill.log',
      contentBuffer: '[INFO] RDS primary failover initiated. Standby promoted in 14.2s.',
      collectedAtIso: '2026-09-13T06:05:00Z',
      collectorAgentId: 'agent-sre-sentinel'
    },
    {
      assetId: 'ev-c1-03',
      category: 'CONFIDENTIALITY_C1',
      filename: 'kms-cmek-rotation-audit.json',
      contentBuffer: '{"kms_key_id": "arn:aws:kms:us-east-1:12345:key/soc2", "auto_rotate": true}',
      collectedAtIso: '2026-09-13T06:10:00Z',
      collectorAgentId: 'agent-secops'
    }
  ];

  it('computes deterministic Merkle Root and produces valid inclusion proofs for all batch assets', () => {
    const { merkleRoot, receipts } = Soc2EvidenceTimestampAttestation.attestEvidenceBatch(
      sampleAssets,
      1789365600
    );

    expect(merkleRoot).toHaveLength(64);
    expect(receipts.size).toBe(3);

    // Verify inclusion for each asset
    sampleAssets.forEach((asset, idx) => {
      const receipt = receipts.get(asset.assetId)!;
      expect(receipt).toBeDefined();
      expect(receipt.merkleRoot).toBe(merkleRoot);
      expect(receipt.signedAttestationToken).toContain('SOC2_SEAL:');

      const leafHash = Soc2EvidenceTimestampAttestation.computeLeafHash(asset);
      const isValid = Soc2EvidenceTimestampAttestation.verifyInclusion(
        leafHash,
        receipt.inclusionProof,
        receipt.leafIndex,
        merkleRoot
      );

      expect(isValid).toBe(true);
    });
  });

  it('fails verification if evidence content is tampered post-attestation', () => {
    const { merkleRoot, receipts } = Soc2EvidenceTimestampAttestation.attestEvidenceBatch(
      sampleAssets,
      1789365600
    );

    const asset = sampleAssets[0];
    const receipt = receipts.get(asset.assetId)!;

    // Tampered asset
    const tamperedAsset: EvidenceAsset = {
      ...asset,
      contentBuffer: 'resource "aws_iam_policy" "enforce_mfa" { # DISABLED MFA }'
    };

    const tamperedLeafHash = Soc2EvidenceTimestampAttestation.computeLeafHash(tamperedAsset);
    const isValid = Soc2EvidenceTimestampAttestation.verifyInclusion(
      tamperedLeafHash,
      receipt.inclusionProof,
      receipt.leafIndex,
      merkleRoot
    );

    expect(isValid).toBe(false);
  });
});
