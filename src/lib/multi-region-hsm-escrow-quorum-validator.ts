/**
 * QA-187: Multi-Region HSM Cryptographic Key Escrow Quorum & Cold-Storage Revocation Validator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Verifies M-of-N hardware security module (HSM) key shard custody across independent cloud regions,
 * ensures cold-storage air-gap compliance, and executes instant emergency revocation workflows.
 */

import { createHash } from "crypto";

export interface HsmShardNode {
  nodeId: string;
  region: string;
  cloudProvider: "aws" | "gcp" | "azure" | "on-prem-hsm";
  fipsLevel: 3 | 4;
  shardWeight: number;
  lastHeartbeatUtc: string;
  isAirGappedColdStorage: boolean;
  status: "ACTIVE" | "REVOKED" | "STANDBY" | "QUARANTINED";
}

export interface EscrowQuorumConfig {
  minimumThresholdWeight: number; // e.g. 3 out of 5
  requiredIndependentRegions: number; // e.g. at least 2 distinct cloud regions
  requireAirGappedShard: boolean;
}

export interface QuorumValidationResult {
  isQuorumSatisfied: boolean;
  totalActiveWeight: number;
  representedRegions: string[];
  airGappedShardPresent: boolean;
  complianceTier: "FIPS_140_3_COMPLIANT_ESCROW" | "INSUFFICIENT_QUORUM_VIOLATION" | "REGIONAL_ISOLATION_DEFICIT";
  escrowAuditDigest: string;
  revokedNodesCount: number;
}

export class MultiRegionHsmEscrowQuorumValidator {
  public static validateEscrowQuorum(
    escrowId: string,
    nodes: HsmShardNode[],
    config: EscrowQuorumConfig
  ): QuorumValidationResult {
    if (!escrowId) {
      throw new Error("escrowId is required.");
    }
    if (nodes.length === 0) {
      throw new Error("At least one HSM shard node must be provided.");
    }

    const activeNodes = nodes.filter((n) => n.status === "ACTIVE");
    const revokedCount = nodes.filter((n) => n.status === "REVOKED" || n.status === "QUARANTINED").length;

    const totalActiveWeight = activeNodes.reduce((acc, n) => acc + n.shardWeight, 0);
    const distinctRegions = Array.from(new Set(activeNodes.map((n) => n.region)));
    const hasAirGapped = activeNodes.some((n) => n.isAirGappedColdStorage);

    const meetsWeight = totalActiveWeight >= config.minimumThresholdWeight;
    const meetsRegions = distinctRegions.length >= config.requiredIndependentRegions;
    const meetsAirGap = !config.requireAirGappedShard || hasAirGapped;

    const isQuorumSatisfied = meetsWeight && meetsRegions && meetsAirGap;

    let complianceTier: QuorumValidationResult["complianceTier"] = "FIPS_140_3_COMPLIANT_ESCROW";
    if (!meetsWeight) {
      complianceTier = "INSUFFICIENT_QUORUM_VIOLATION";
    } else if (!meetsRegions || !meetsAirGap) {
      complianceTier = "REGIONAL_ISOLATION_DEFICIT";
    }

    const raw = `${escrowId}:${totalActiveWeight}:${distinctRegions.sort().join(",")}:${isQuorumSatisfied}`;
    const escrowAuditDigest = createHash("sha256").update(raw).digest("hex");

    return {
      isQuorumSatisfied,
      totalActiveWeight,
      representedRegions: distinctRegions,
      airGappedShardPresent: hasAirGapped,
      complianceTier,
      escrowAuditDigest,
      revokedNodesCount: revokedCount,
    };
  }

  public static emergencyRevokeNode(
    nodes: HsmShardNode[],
    targetNodeId: string,
    revocationReason: string
  ): { updatedNodes: HsmShardNode[]; revocationReceipt: string } {
    const updatedNodes = nodes.map((node) => {
      if (node.nodeId === targetNodeId) {
        return { ...node, status: "REVOKED" as const };
      }
      return node;
    });

    const receipt = createHash("sha256")
      .update(`${targetNodeId}:${revocationReason}:${new Date().toISOString()}`)
      .digest("hex");

    return { updatedNodes, revocationReceipt: receipt };
  }
}
