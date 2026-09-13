/**
 * Regression Test Suite for QA-165: Multi-Cloud KMS HSM Key Quorum Consensus & Cross-Region Rotation Pipeline.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  MultiCloudKmsQuorumRotationPipeline,
  type KeyRotationProposal
} from "./multi-cloud-kms-quorum-rotation-pipeline";

describe("QA-165: Multi-Cloud KMS Quorum Rotation Pipeline", () => {
  it("successfully commits rotation when M-of-N quorum is satisfied", () => {
    const proposal: KeyRotationProposal = {
      proposalId: "rot_prop_2026_q3_01",
      targetKeyAlias: "alias/vendorshield-master-vault",
      targetVersion: 4,
      quorumThreshold: 3,
      nodes: [
        { provider: "AWS_KMS", region: "us-east-1", keyArnOrUri: "arn:aws:kms:1", isHsmBacked: true, status: "ONLINE" },
        { provider: "GCP_KMS", region: "europe-west3", keyArnOrUri: "projects/1/kms/2", isHsmBacked: true, status: "ONLINE" },
        { provider: "AZURE_KEY_VAULT", region: "eastus", keyArnOrUri: "https://vault.azure.net/3", isHsmBacked: true, status: "ONLINE" },
        { provider: "AWS_KMS", region: "eu-west-1", keyArnOrUri: "arn:aws:kms:4", isHsmBacked: true, status: "ONLINE" }
      ]
    };

    const res = MultiCloudKmsQuorumRotationPipeline.executeRotation(proposal);

    expect(res.rotatedSuccessfully).toBe(true);
    expect(res.quorumReached).toBe(true);
    expect(res.participatingVotes).toBe(4);
    expect(res.newActiveVersion).toBe(4);
    expect(res.rotationAttestationDigest).toHaveLength(64);
  });

  it("blocks rotation and rolls back when quorum is not met due to node degradation", () => {
    const proposal: KeyRotationProposal = {
      proposalId: "rot_prop_2026_q3_02",
      targetKeyAlias: "alias/vendorshield-customer-pii",
      targetVersion: 5,
      quorumThreshold: 3,
      nodes: [
        { provider: "AWS_KMS", region: "us-east-1", keyArnOrUri: "arn:aws:kms:1", isHsmBacked: true, status: "ONLINE" },
        { provider: "GCP_KMS", region: "europe-west3", keyArnOrUri: "projects/1/kms/2", isHsmBacked: true, status: "REPLICATION_LAG" },
        { provider: "AZURE_KEY_VAULT", region: "eastus", keyArnOrUri: "https://vault.azure.net/3", isHsmBacked: false, status: "ONLINE" } // Non-HSM
      ]
    };

    const res = MultiCloudKmsQuorumRotationPipeline.executeRotation(proposal);

    expect(res.rotatedSuccessfully).toBe(false);
    expect(res.quorumReached).toBe(false);
    expect(res.participatingVotes).toBe(1); // only 1 node is online + HSM
    expect(res.newActiveVersion).toBe(4); // remains on version 4
  });

  it("rejects invalid quorum thresholds", () => {
    expect(() => {
      MultiCloudKmsQuorumRotationPipeline.executeRotation({
        proposalId: "fail",
        targetKeyAlias: "fail",
        targetVersion: 2,
        quorumThreshold: 5,
        nodes: [{ provider: "AWS_KMS", region: "us-east-1", keyArnOrUri: "arn:1", isHsmBacked: true, status: "ONLINE" }]
      });
    }).toThrow("Invalid quorum threshold");
  });
});
