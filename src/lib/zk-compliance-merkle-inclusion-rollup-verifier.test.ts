import { describe, it, expect } from "vitest";
import {
  ZkComplianceMerkleInclusionRollupVerifier,
  ComplianceControlEvidence
} from "./zk-compliance-merkle-inclusion-rollup-verifier";

describe("QA-199: ZkComplianceMerkleInclusionRollupVerifier", () => {
  const mockEvidenceList: ComplianceControlEvidence[] = [
    {
      vendorId: "VEND-001",
      controlId: "SOC2-CC6.1",
      framework: "SOC2",
      status: "COMPLIANT",
      timestamp: "2026-09-14T01:00:00Z",
      telemetryEvidenceHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"
    },
    {
      vendorId: "VEND-001",
      controlId: "ISO27001-A.9.2.1",
      framework: "ISO27001",
      status: "COMPLIANT",
      timestamp: "2026-09-14T01:05:00Z",
      telemetryEvidenceHash: "b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1"
    },
    {
      vendorId: "VEND-002",
      controlId: "HIPAA-164.312-A-1",
      framework: "HIPAA",
      status: "COMPLIANT",
      timestamp: "2026-09-14T01:10:00Z",
      telemetryEvidenceHash: "c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef2"
    },
    {
      vendorId: "VEND-003",
      controlId: "FEDRAMP-AC-2",
      framework: "FEDRAMP",
      status: "PENDING_REMEDIATION",
      timestamp: "2026-09-14T01:15:00Z",
      telemetryEvidenceHash: "d4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef3"
    }
  ];

  it("builds deterministic Merkle tree and generates valid rollup root", () => {
    const { batch, tree, leafHashes } = ZkComplianceMerkleInclusionRollupVerifier.compileRollupBatch(
      "ROLLUP-BATCH-2026-09-14",
      mockEvidenceList
    );

    expect(batch.rollupId).toBe("ROLLUP-BATCH-2026-09-14");
    expect(batch.leafCount).toBe(4);
    expect(batch.merkleRoot).toHaveLength(64);
    expect(batch.attestationSignature).toHaveLength(64);
    expect(tree.length).toBe(3); // 4 leaves -> 2 nodes -> 1 root
    expect(leafHashes.length).toBe(4);
  });

  it("generates and verifies Zero-Knowledge Merkle inclusion proof for any valid control", () => {
    const { tree } = ZkComplianceMerkleInclusionRollupVerifier.compileRollupBatch(
      "ROLLUP-BATCH-TEST",
      mockEvidenceList
    );

    // Pick 2nd item (index 1)
    const targetItem = mockEvidenceList[1];
    const proof = ZkComplianceMerkleInclusionRollupVerifier.generateInclusionProof(tree, 1, targetItem);

    expect(proof.vendorId).toBe("VEND-001");
    expect(proof.controlId).toBe("ISO27001-A.9.2.1");
    expect(proof.proofPath.length).toBe(2);

    const isValid = ZkComplianceMerkleInclusionRollupVerifier.verifyInclusionProof(proof);
    expect(isValid).toBe(true);
  });

  it("detects tampered leaf data and invalidates inclusion proof", () => {
    const { tree } = ZkComplianceMerkleInclusionRollupVerifier.compileRollupBatch(
      "ROLLUP-BATCH-TEST",
      mockEvidenceList
    );

    const targetItem = mockEvidenceList[0];
    const proof = ZkComplianceMerkleInclusionRollupVerifier.generateInclusionProof(tree, 0, targetItem);

    // Tamper with the leaf hash
    const tamperedProof = {
      ...proof,
      leafHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };

    const isValid = ZkComplianceMerkleInclusionRollupVerifier.verifyInclusionProof(tamperedProof);
    expect(isValid).toBe(false);
  });

  it("handles odd number of leaves gracefully by pairing last leaf with itself", () => {
    const oddEvidenceList = mockEvidenceList.slice(0, 3);
    const { batch, tree } = ZkComplianceMerkleInclusionRollupVerifier.compileRollupBatch(
      "ODD-BATCH",
      oddEvidenceList
    );

    expect(batch.leafCount).toBe(3);
    // Leaf 2 (last) proof verification
    const proof = ZkComplianceMerkleInclusionRollupVerifier.generateInclusionProof(tree, 2, oddEvidenceList[2]);
    expect(ZkComplianceMerkleInclusionRollupVerifier.verifyInclusionProof(proof)).toBe(true);
  });
});
