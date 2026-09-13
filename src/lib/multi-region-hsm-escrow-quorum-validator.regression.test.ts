import { describe, it, expect } from "vitest";
import {
  MultiRegionHsmEscrowQuorumValidator,
  HsmShardNode,
  EscrowQuorumConfig,
} from "./multi-region-hsm-escrow-quorum-validator";

describe("QA-187: MultiRegionHsmEscrowQuorumValidator", () => {
  const sampleNodes: HsmShardNode[] = [
    {
      nodeId: "hsm-us-east-1",
      region: "us-east-1",
      cloudProvider: "aws",
      fipsLevel: 3,
      shardWeight: 1,
      lastHeartbeatUtc: "2026-09-13T12:00:00Z",
      isAirGappedColdStorage: false,
      status: "ACTIVE",
    },
    {
      nodeId: "hsm-eu-west-1",
      region: "eu-west-1",
      cloudProvider: "gcp",
      fipsLevel: 4,
      shardWeight: 1,
      lastHeartbeatUtc: "2026-09-13T12:00:00Z",
      isAirGappedColdStorage: false,
      status: "ACTIVE",
    },
    {
      nodeId: "hsm-airgap-ch-bunker",
      region: "ch-datacenter-1",
      cloudProvider: "on-prem-hsm",
      fipsLevel: 4,
      shardWeight: 2,
      lastHeartbeatUtc: "2026-09-13T10:00:00Z",
      isAirGappedColdStorage: true,
      status: "ACTIVE",
    },
    {
      nodeId: "hsm-ap-northeast-1",
      region: "ap-northeast-1",
      cloudProvider: "azure",
      fipsLevel: 3,
      shardWeight: 1,
      lastHeartbeatUtc: "2026-09-13T12:00:00Z",
      isAirGappedColdStorage: false,
      status: "ACTIVE",
    },
  ];

  const config: EscrowQuorumConfig = {
    minimumThresholdWeight: 3,
    requiredIndependentRegions: 2,
    requireAirGappedShard: true,
  };

  it("validates successful FIPS 140-3 escrow quorum with cross-region air-gapped coverage", () => {
    const result = MultiRegionHsmEscrowQuorumValidator.validateEscrowQuorum(
      "escrow-sec-vault-001",
      sampleNodes,
      config
    );

    expect(result.isQuorumSatisfied).toBe(true);
    expect(result.totalActiveWeight).toBe(5);
    expect(result.representedRegions.length).toBe(4);
    expect(result.airGappedShardPresent).toBe(true);
    expect(result.complianceTier).toBe("FIPS_140_3_COMPLIANT_ESCROW");
    expect(result.escrowAuditDigest).toHaveLength(64);
  });

  it("detects insufficient quorum when weight falls below threshold due to emergency revocation", () => {
    const { updatedNodes, revocationReceipt } = MultiRegionHsmEscrowQuorumValidator.emergencyRevokeNode(
      sampleNodes,
      "hsm-airgap-ch-bunker",
      "Compromised physical custody seal"
    );

    expect(revocationReceipt).toHaveLength(64);

    const result = MultiRegionHsmEscrowQuorumValidator.validateEscrowQuorum(
      "escrow-sec-vault-001",
      updatedNodes,
      config
    );

    expect(result.isQuorumSatisfied).toBe(false);
    expect(result.totalActiveWeight).toBe(3);
    expect(result.airGappedShardPresent).toBe(false); // Air-gapped shard is revoked
    expect(result.complianceTier).toBe("REGIONAL_ISOLATION_DEFICIT");
    expect(result.revokedNodesCount).toBe(1);
  });

  it("throws on invalid input parameters", () => {
    expect(() =>
      MultiRegionHsmEscrowQuorumValidator.validateEscrowQuorum("", sampleNodes, config)
    ).toThrow("escrowId is required.");

    expect(() =>
      MultiRegionHsmEscrowQuorumValidator.validateEscrowQuorum("vault-1", [], config)
    ).toThrow("At least one HSM shard node must be provided.");
  });
});
