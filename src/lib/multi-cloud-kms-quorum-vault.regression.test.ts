/**
 * Regression Test Suite for QA-165: Multi-Cloud KMS HSM Key Quorum Consensus & Cross-Region Rotation Pipeline.
 * Part of VendorShield B2B SOC 2, ISO/IEC 27001, and GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "crypto";
import {
  MultiCloudKmsQuorumVault,
  MultiCloudKeyReplica,
  SecurityOfficerShare,
  RotationRequest
} from "./multi-cloud-kms-quorum-vault";

describe("QA-165: Multi-Cloud KMS HSM Key Quorum Consensus & Cross-Region Rotation Pipeline", () => {
  const MASTER_SECRET = "super-secure-hsm-vault-key-2026";
  let vault: MultiCloudKmsQuorumVault;

  const mockReplicas: MultiCloudKeyReplica[] = [
    {
      replicaId: "aws-us-east-1-hsm",
      provider: "AWS_KMS",
      region: "us-east-1",
      keyArnOrUri: "arn:aws:kms:us-east-1:123456789:key/mrk-abc",
      version: 1,
      hsmLevel: "FIPS_140_3_LEVEL_3",
      isHealthy: true
    },
    {
      replicaId: "gcp-europe-west3-hsm",
      provider: "GCP_CLOUD_KMS",
      region: "europe-west3",
      keyArnOrUri: "projects/corp-prod/locations/europe-west3/keyRings/ring/cryptoKeys/key1",
      version: 1,
      hsmLevel: "FIPS_140_3_LEVEL_3",
      isHealthy: true
    },
    {
      replicaId: "azure-eastus2-kv",
      provider: "AZURE_KEY_VAULT",
      region: "eastus2",
      keyArnOrUri: "https://corp-prod.vault.azure.net/keys/master-key",
      version: 1,
      hsmLevel: "FIPS_140_2_LEVEL_3",
      isHealthy: true
    }
  ];

  beforeEach(() => {
    vault = new MultiCloudKmsQuorumVault(MASTER_SECRET);
    vault.registerReplicas("alias/production-master-dek", mockReplicas);
  });

  function createValidShare(officerId: string, shareId: string, requestId: string): SecurityOfficerShare {
    const sig = createHmac("sha256", MASTER_SECRET)
      .update(`${officerId}:${shareId}:${requestId}`)
      .digest("hex");
    return {
      officerId,
      keyShareId: shareId,
      signatureHmac: sig,
      timestampIso: new Date().toISOString()
    };
  }

  it("successfully rotates multi-cloud keys when M-of-N quorum is reached", () => {
    const reqId = "rot-req-001";
    const shares = [
      createValidShare("officer-alice", "share-1", reqId),
      createValidShare("officer-bob", "share-2", reqId)
    ];

    const request: RotationRequest = {
      requestId: reqId,
      keyAlias: "alias/production-master-dek",
      targetVersion: 2,
      thresholdRequired: 2,
      officerShares: shares,
      requestedAtIso: new Date().toISOString()
    };

    const res = vault.executeRotation(request);
    expect(res.quorumReached).toBe(true);
    expect(res.state).toBe("ACTIVE_SYNCHRONIZED");
    expect(res.synchronizedReplicas).toBe(3);
    expect(res.participatingProviders.length).toBeGreaterThanOrEqual(2);
    expect(vault.getAuditTrail().length).toBe(1);
  });

  it("rejects rotation and halts when officer signature quorum is deficient", () => {
    const reqId = "rot-req-002";
    // Only 1 share provided when 2 are required
    const shares = [createValidShare("officer-alice", "share-1", reqId)];

    const request: RotationRequest = {
      requestId: reqId,
      keyAlias: "alias/production-master-dek",
      targetVersion: 2,
      thresholdRequired: 2,
      officerShares: shares,
      requestedAtIso: new Date().toISOString()
    };

    const res = vault.executeRotation(request);
    expect(res.quorumReached).toBe(false);
    expect(res.state).toBe("STAGED");
    expect(res.synchronizedReplicas).toBe(0);
  });

  it("rolls back rotation if multi-cloud diversity requirement fails", () => {
    const reqId = "rot-req-003";
    // Mark GCP and Azure as unhealthy, leaving only AWS
    mockReplicas[1].isHealthy = false;
    mockReplicas[2].isHealthy = false;

    const shares = [
      createValidShare("officer-alice", "share-1", reqId),
      createValidShare("officer-bob", "share-2", reqId)
    ];

    const request: RotationRequest = {
      requestId: reqId,
      keyAlias: "alias/production-master-dek",
      targetVersion: 2,
      thresholdRequired: 2,
      officerShares: shares,
      requestedAtIso: new Date().toISOString()
    };

    const res = vault.executeRotation(request);
    expect(res.quorumReached).toBe(true);
    expect(res.state).toBe("ROLLED_BACK");
    expect(res.failedReplicas).toBe(2);

    // Reset health for clean state
    mockReplicas[1].isHealthy = true;
    mockReplicas[2].isHealthy = true;
  });
});
