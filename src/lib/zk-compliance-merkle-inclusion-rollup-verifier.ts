/**
 * zk-compliance-merkle-inclusion-rollup-verifier.ts
 * QA-199: Zero-Knowledge Continuous Compliance Rollup & Merkle Inclusion Proof Verifier.
 * Part of VendorShield Autonomous Vendor Risk Management & Evidence Platform.
 *
 * Grounded in Zero-Knowledge compliance architecture:
 * 1. Aggregates multi-vendor security control telemetry (SOC2, ISO27001, HIPAA, FedRAMP).
 * 2. Compiles deterministic double-SHA256 Merkle tree leaves and cryptographic tree root.
 * 3. Generates zero-knowledge inclusion proofs allowing third-party auditors to verify
 *    compliance of a specific control without disclosing adjacent vendor proprietary data.
 * 4. Verifies inclusion proof validity against published rollup root anchor.
 * 5. Emits cryptographic compliance rollup attestation receipts.
 */

import { createHash } from "crypto";

export interface ComplianceControlEvidence {
  vendorId: string;
  controlId: string;           // e.g. "SOC2-CC6.1", "ISO27001-A.12.1.2"
  framework: "SOC2" | "ISO27001" | "HIPAA" | "GDPR" | "FEDRAMP";
  status: "COMPLIANT" | "NON_COMPLIANT" | "PENDING_REMEDIATION";
  timestamp: string;
  telemetryEvidenceHash: string;
}

export interface MerkleProofStep {
  direction: "LEFT" | "RIGHT";
  hash: string;
}

export interface MerkleInclusionProof {
  leafHash: string;
  merkleRoot: string;
  proofPath: MerkleProofStep[];
  controlId: string;
  vendorId: string;
}

export interface ComplianceRollupBatch {
  rollupId: string;
  merkleRoot: string;
  leafCount: number;
  generatedAt: string;
  attestationSignature: string;
}

export class ZkComplianceMerkleInclusionRollupVerifier {
  /**
   * Computes double-SHA256 of input buffer or string.
   */
  public static hash256(data: string | Buffer): string {
    const first = createHash("sha256").update(data).digest();
    return createHash("sha256").update(first).digest("hex");
  }

  /**
   * Generates deterministic leaf hash for a compliance control item.
   */
  public static computeLeafHash(evidence: ComplianceControlEvidence): string {
    const canonical = [
      evidence.vendorId,
      evidence.controlId,
      evidence.framework,
      evidence.status,
      evidence.timestamp,
      evidence.telemetryEvidenceHash
    ].join("|");
    return this.hash256(canonical);
  }

  /**
   * Builds the complete Merkle tree layer-by-layer and returns tree levels.
   */
  public static buildMerkleTree(leaves: string[]): string[][] {
    if (leaves.length === 0) {
      throw new Error("Cannot build Merkle tree from empty leaves.");
    }

    const tree: string[][] = [[...leaves]];

    while (tree[tree.length - 1].length > 1) {
      const currentLevel = tree[tree.length - 1];
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = currentLevel[i] + currentLevel[i + 1];
          nextLevel.push(this.hash256(combined));
        } else {
          // Odd leaf is duplicated to complete pair
          const combined = currentLevel[i] + currentLevel[i];
          nextLevel.push(this.hash256(combined));
        }
      }
      tree.push(nextLevel);
    }

    return tree;
  }

  /**
   * Generates a Zero-Knowledge Merkle inclusion proof for a specific leaf index.
   */
  public static generateInclusionProof(
    tree: string[][],
    leafIndex: number,
    evidence: ComplianceControlEvidence
  ): MerkleInclusionProof {
    if (leafIndex < 0 || leafIndex >= tree[0].length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds.`);
    }

    const leafHash = tree[0][leafIndex];
    const proofPath: MerkleProofStep[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLevel.length) {
        proofPath.push({
          direction: isRight ? "LEFT" : "RIGHT",
          hash: currentLevel[siblingIndex]
        });
      } else {
        // Odd node paired with itself
        proofPath.push({
          direction: "RIGHT",
          hash: currentLevel[currentIndex]
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    const merkleRoot = tree[tree.length - 1][0];

    return {
      leafHash,
      merkleRoot,
      proofPath,
      controlId: evidence.controlId,
      vendorId: evidence.vendorId
    };
  }

  /**
   * Verifies a Merkle inclusion proof against the known root.
   */
  public static verifyInclusionProof(proof: MerkleInclusionProof): boolean {
    let computedHash = proof.leafHash;

    for (const step of proof.proofPath) {
      if (step.direction === "LEFT") {
        computedHash = this.hash256(step.hash + computedHash);
      } else {
        computedHash = this.hash256(computedHash + step.hash);
      }
    }

    return computedHash === proof.merkleRoot;
  }

  /**
   * Compiles batch compliance rollup with root attestation receipt.
   */
  public static compileRollupBatch(
    rollupId: string,
    evidenceItems: ComplianceControlEvidence[]
  ): { batch: ComplianceRollupBatch; tree: string[][]; leafHashes: string[] } {
    if (!rollupId || rollupId.trim() === "") {
      throw new Error("rollupId cannot be empty.");
    }
    if (evidenceItems.length === 0) {
      throw new Error("evidenceItems cannot be empty.");
    }

    const leafHashes = evidenceItems.map(item => this.computeLeafHash(item));
    const tree = this.buildMerkleTree(leafHashes);
    const merkleRoot = tree[tree.length - 1][0];
    const generatedAt = new Date().toISOString();

    const signaturePayload = `${rollupId}:${merkleRoot}:${evidenceItems.length}:${generatedAt}`;
    const attestationSignature = this.hash256(signaturePayload);

    return {
      batch: {
        rollupId,
        merkleRoot,
        leafCount: evidenceItems.length,
        generatedAt,
        attestationSignature
      },
      tree,
      leafHashes
    };
  }
}
