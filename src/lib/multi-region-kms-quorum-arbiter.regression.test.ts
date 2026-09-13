/**
 * Regression Test Suite for QA-162: Distributed Multi-Region KMS Key Quorum Arbiter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  MultiRegionKmsQuorumArbiter,
  QuorumRequest,
  RegionalKmsNode,
  RegionalVote
} from "./multi-region-kms-quorum-arbiter";

describe("QA-162: Distributed Multi-Region KMS Key Quorum Arbiter", () => {
  const arbiter = new MultiRegionKmsQuorumArbiter({
    allowedMaxClockSkewMs: 30000,
    minDistinctRegionsRequired: 2
  });

  function createSignedVote(
    requestId: string,
    keyId: string,
    epoch: number,
    nodeId: string,
    region: any,
    approved: boolean
  ): RegionalVote {
    const nonce = `nonce-${nodeId}-${Math.random().toString(36).substring(7)}`;
    const evidenceHash = createHash("sha256").update(`telemetry-${nodeId}`).digest("hex");
    const payload = `${requestId}:${keyId}:${epoch}:${nonce}:${evidenceHash}`;
    const signatureHex = createHash("sha256").update(payload).digest("hex");

    return {
      nodeId,
      region,
      approved,
      epochNonce: nonce,
      timestampIso: new Date().toISOString(),
      signatureHex,
      telemetryEvidenceHash: evidenceHash
    };
  }

  const nodes: RegionalKmsNode[] = [
    { nodeId: "node-us-east-1a", region: "us-east-1", hsmModuleId: "hsm-1", publicKeyThumbprint: "pk-1", isHealthy: true, latencyMs: 15 },
    { nodeId: "node-eu-central-1a", region: "eu-central-1", hsmModuleId: "hsm-2", publicKeyThumbprint: "pk-2", isHealthy: true, latencyMs: 85 },
    { nodeId: "node-ap-southeast-1a", region: "ap-southeast-1", hsmModuleId: "hsm-3", publicKeyThumbprint: "pk-3", isHealthy: true, latencyMs: 160 },
    { nodeId: "node-us-west-2a", region: "us-west-2", hsmModuleId: "hsm-4", publicKeyThumbprint: "pk-4", isHealthy: false, latencyMs: 999 } // offline
  ];

  it("successfully approves quorum when threshold of distinct regions and votes is met", () => {
    const requestId = "REQ-ROT-001";
    const keyId = "key-enterprise-kms-882";
    const epoch = 104;

    const votes = [
      createSignedVote(requestId, keyId, epoch, "node-us-east-1a", "us-east-1", true),
      createSignedVote(requestId, keyId, epoch, "node-eu-central-1a", "eu-central-1", true),
      createSignedVote(requestId, keyId, epoch, "node-ap-southeast-1a", "ap-southeast-1", true)
    ];

    const req: QuorumRequest = {
      requestId,
      keyId,
      action: "KEY_ROTATION",
      epoch,
      initiatedAtIso: new Date(Date.now() - 5000).toISOString(),
      expiresAtIso: new Date(Date.now() + 60000).toISOString(),
      requiredRegionsThreshold: 2,
      requiredVotesThreshold: 2,
      nodes,
      votes
    };

    const cert = arbiter.arbitrate(req);
    expect(cert.status).toBe("APPROVED");
    expect(cert.affirmativeVotesCount).toBe(3);
    expect(cert.participatingRegions).toContain("us-east-1");
    expect(cert.participatingRegions).toContain("eu-central-1");
    expect(cert.splitBrainDetected).toBe(false);
    expect(cert.auditDigestSha256).toHaveLength(64);
    expect(cert.verdictSignature).toHaveLength(64);
  });

  it("rejects request with split-brain risk if votes do not span required minimum distinct regions", () => {
    const requestId = "REQ-ROT-002";
    const keyId = "key-enterprise-kms-882";
    const epoch = 104;

    // Single region voting
    const votes = [
      createSignedVote(requestId, keyId, epoch, "node-us-east-1a", "us-east-1", true)
    ];

    const req: QuorumRequest = {
      requestId,
      keyId,
      action: "KEY_ROTATION",
      epoch,
      initiatedAtIso: new Date(Date.now() - 5000).toISOString(),
      expiresAtIso: new Date(Date.now() + 60000).toISOString(),
      requiredRegionsThreshold: 2,
      requiredVotesThreshold: 1,
      nodes,
      votes
    };

    const cert = arbiter.arbitrate(req);
    expect(cert.status).toBe("REJECTED_SPLIT_BRAIN_RISK");
    expect(cert.splitBrainDetected).toBe(true);
  });

  it("rejects request if vote signature is invalid or tampered", () => {
    const requestId = "REQ-ROT-003";
    const keyId = "key-enterprise-kms-882";
    const epoch = 104;

    const vote = createSignedVote(requestId, keyId, epoch, "node-us-east-1a", "us-east-1", true);
    vote.signatureHex = "0000000000000000000000000000000000000000000000000000000000000000"; // forged

    const req: QuorumRequest = {
      requestId,
      keyId,
      action: "MASTER_KEY_DELEGATION",
      epoch,
      initiatedAtIso: new Date(Date.now() - 5000).toISOString(),
      expiresAtIso: new Date(Date.now() + 60000).toISOString(),
      requiredRegionsThreshold: 1,
      requiredVotesThreshold: 1,
      nodes,
      votes: [vote]
    };

    const cert = arbiter.arbitrate(req);
    expect(cert.status).toBe("REJECTED_INVALID_SIGNATURE");
  });

  it("rejects request if epoch has expired", () => {
    const requestId = "REQ-ROT-004";
    const keyId = "key-enterprise-kms-882";
    const epoch = 104;

    const req: QuorumRequest = {
      requestId,
      keyId,
      action: "COLD_BACKUP_EXTRACTION",
      epoch,
      initiatedAtIso: new Date(Date.now() - 100000).toISOString(),
      expiresAtIso: new Date(Date.now() - 1000).toISOString(), // expired
      requiredRegionsThreshold: 2,
      requiredVotesThreshold: 2,
      nodes,
      votes: []
    };

    const cert = arbiter.arbitrate(req);
    expect(cert.status).toBe("REJECTED_EXPIRED_EPOCH");
  });
});
