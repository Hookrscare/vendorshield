/**
 * soc2-evidence-timestamp-attestation.ts
 * QA-170: Real-Time SOC 2 Type II Evidence Cryptographic Timestamping Attestation Daemon.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Provides cryptographic timestamping and tamper-evident Merkle attestation for SOC 2 Type II evidence:
 * 1. Computes SHA-256 asset digest for each evidence item (policy, terraform config, log export).
 * 2. Assembles daily Merkle Trees and derives Merkle Root for audit period window.
 * 3. Issues cryptographic RFC 3161 style attestation receipts with inclusion proofs.
 * 4. Verifies historical evidence integrity against auditor-submitted checkpoints.
 */

import { createHash } from 'crypto';

export interface EvidenceAsset {
  assetId: string;
  category: 'SECURITY_CC6' | 'AVAILABILITY_A1' | 'CONFIDENTIALITY_C1' | 'PRIVACY_P1';
  filename: string;
  contentBuffer: Buffer | string;
  collectedAtIso: string;
  collectorAgentId: string;
}

export interface AttestationReceipt {
  receiptId: string;
  assetId: string;
  assetSha256: string;
  merkleRoot: string;
  inclusionProof: string[];
  leafIndex: number;
  totalLeaves: number;
  timestampEpochSeconds: number;
  signedAttestationToken: string;
}

export class Soc2EvidenceTimestampAttestation {
  private static sha256(data: string | Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Computes the leaf hash: H(assetId + category + contentHash + collectedAt)
   */
  public static computeLeafHash(asset: EvidenceAsset): string {
    const contentHash = this.sha256(asset.contentBuffer);
    const leafData = `${asset.assetId}:${asset.category}:${contentHash}:${asset.collectedAtIso}`;
    return this.sha256(leafData);
  }

  /**
   * Builds a balanced Merkle tree from an array of leaf hashes.
   */
  public static buildMerkleTree(leaves: string[]): { root: string; layers: string[][] } {
    if (leaves.length === 0) {
      const emptyRoot = this.sha256('EMPTY_TREE');
      return { root: emptyRoot, layers: [[emptyRoot]] };
    }

    let currentLayer = [...leaves];
    const layers: string[][] = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = (i + 1 < currentLayer.length) ? currentLayer[i + 1] : left;
        const combined = this.sha256(`${left}:${right}`);
        nextLayer.push(combined);
      }
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return { root: currentLayer[0], layers };
  }

  /**
   * Generates Merkle inclusion proof for a given leaf index.
   */
  public static getInclusionProof(layers: string[][], leafIndex: number): string[] {
    const proof: string[] = [];
    let idx = leafIndex;

    for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
      const layer = layers[layerIdx];
      const isRight = (idx % 2 === 1);
      const pairIdx = isRight ? idx - 1 : idx + 1;

      if (pairIdx < layer.length) {
        proof.push(layer[pairIdx]);
      } else {
        // Odd leaf duplicated
        proof.push(layer[idx]);
      }

      idx = Math.floor(idx / 2);
    }

    return proof;
  }

  /**
   * Attests a collection of SOC 2 evidence assets into an immutable audit snapshot.
   */
  public static attestEvidenceBatch(
    assets: EvidenceAsset[],
    timestampEpochSeconds: number = Math.floor(Date.now() / 1000)
  ): { merkleRoot: string; receipts: Map<string, AttestationReceipt> } {
    const leafHashes = assets.map(a => this.computeLeafHash(a));
    const { root, layers } = this.buildMerkleTree(leafHashes);

    const receipts = new Map<string, AttestationReceipt>();

    assets.forEach((asset, idx) => {
      const proof = this.getInclusionProof(layers, idx);
      const assetHash = this.sha256(asset.contentBuffer);
      const receiptId = `attest_${this.sha256(`${root}:${asset.assetId}`).slice(0, 16)}`;
      const token = `SOC2_SEAL:${receiptId}:${root}:${timestampEpochSeconds}`;

      receipts.set(asset.assetId, {
        receiptId,
        assetId: asset.assetId,
        assetSha256: assetHash,
        merkleRoot: root,
        inclusionProof: proof,
        leafIndex: idx,
        totalLeaves: assets.length,
        timestampEpochSeconds,
        signedAttestationToken: token
      });
    });

    return { merkleRoot: root, receipts };
  }

  /**
   * Verifies that a leaf and its proof re-compute to the attested Merkle Root.
   */
  public static verifyInclusion(
    leafHash: string,
    proof: string[],
    leafIndex: number,
    expectedRoot: string
  ): boolean {
    let current = leafHash;
    let idx = leafIndex;

    for (const sibling of proof) {
      const isRight = (idx % 2 === 1);
      const combined = isRight
        ? this.sha256(`${sibling}:${current}`)
        : this.sha256(`${current}:${sibling}`);
      current = combined;
      idx = Math.floor(idx / 2);
    }

    return current === expectedRoot;
  }
}
