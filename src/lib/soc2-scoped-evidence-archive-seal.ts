/**
 * QA-167: Multi-Tenant SOC 2 Type II Scoped Evidence Archive Export & Integrity Seal.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 *
 * Facilitates scoped multi-tenant audit archive generation, AICPA TSC evidence packaging,
 * dual-hash SHA-256/SHA-512 artifact integrity sealing, and tamper-proof verification.
 */

import { createHash, createHmac } from "crypto";

export type TrustServiceCategory =
  | "SECURITY_CC"
  | "AVAILABILITY_A"
  | "CONFIDENTIALITY_C"
  | "PROCESSING_INTEGRITY_PI"
  | "PRIVACY_P";

export interface ScopedEvidenceItem {
  itemId: string;
  tenantId: string;
  category: TrustServiceCategory;
  controlRef: string; // e.g., CC6.1, CC7.2, A1.1
  title: string;
  content: string;
  collectedAt: string; // ISO 8601
  metadata?: Record<string, any>;
}

export interface SealedArtifactEntry {
  itemId: string;
  controlRef: string;
  category: TrustServiceCategory;
  sha256Hash: string;
  sha512Hash: string;
  byteLength: number;
  collectedAt: string;
}

export interface ScopedArchiveManifest {
  archiveId: string;
  tenantId: string;
  auditPeriod: {
    startDate: string;
    endDate: string;
  };
  scopedCategories: TrustServiceCategory[];
  totalArtifacts: number;
  merkleRootHash: string;
  integritySealSignature: string;
  sealedAt: string;
  auditorCertificate: {
    issuer: string;
    algorithm: string;
    certificateSerial: string;
  };
  artifacts: SealedArtifactEntry[];
}

export interface ArchivePackage {
  manifest: ScopedArchiveManifest;
  payloads: Record<string, string>; // itemId -> content
}

export interface SealVerificationReport {
  isValid: boolean;
  tenantId: string;
  archiveId: string;
  checkedArtifacts: number;
  merkleRootMatches: boolean;
  signatureMatches: boolean;
  tamperedArtifactIds: string[];
  reasons: string[];
}

export class SOC2ScopedEvidenceArchiveSealer {
  private readonly sealSecret: string;

  constructor(sealSecret: string = "vendorshield-soc2-archive-seal-key") {
    this.sealSecret = sealSecret;
  }

  private computeSha256(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }

  private computeSha512(data: string): string {
    return createHash("sha512").update(data).digest("hex");
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return this.computeSha256("EMPTY_VAULT");
    let currentLevel = [...hashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.computeSha256(currentLevel[i] + currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  /**
   * Builds and cryptographically seals an export archive for an external SOC 2 Type II audit.
   */
  public generateScopedArchive(
    tenantId: string,
    items: ScopedEvidenceItem[],
    auditPeriod: { startDate: string; endDate: string },
    allowedCategories: TrustServiceCategory[]
  ): ArchivePackage {
    const startMs = new Date(auditPeriod.startDate).getTime();
    const endMs = new Date(auditPeriod.endDate).getTime();

    // Strict multi-tenant and temporal scoping filter
    const scopedItems = items.filter((item) => {
      if (item.tenantId !== tenantId) return false;
      if (!allowedCategories.includes(item.category)) return false;
      const itemMs = new Date(item.collectedAt).getTime();
      return itemMs >= startMs && itemMs <= endMs;
    });

    // Deterministic sort by itemId for reproducible Merkle tree
    scopedItems.sort((a, b) => a.itemId.localeCompare(b.itemId));

    const sealedArtifacts: SealedArtifactEntry[] = [];
    const payloads: Record<string, string> = {};
    const leafHashes: string[] = [];

    for (const item of scopedItems) {
      const sha256 = this.computeSha256(item.content);
      const sha512 = this.computeSha512(item.content);
      sealedArtifacts.push({
        itemId: item.itemId,
        controlRef: item.controlRef,
        category: item.category,
        sha256Hash: sha256,
        sha512Hash: sha512,
        byteLength: Buffer.byteLength(item.content, "utf8"),
        collectedAt: item.collectedAt,
      });
      payloads[item.itemId] = item.content;
      leafHashes.push(sha256);
    }

    const merkleRoot = this.computeMerkleRoot(leafHashes);
    const archiveId = `SOC2-ARCH-${tenantId}-${Date.now()}`;
    const sealedAt = new Date().toISOString();

    const sealPayload = `${archiveId}:${tenantId}:${auditPeriod.startDate}:${auditPeriod.endDate}:${merkleRoot}:${sealedArtifacts.length}:${sealedAt}`;
    const integritySealSignature = createHmac("sha256", this.sealSecret)
      .update(sealPayload)
      .digest("hex");

    const manifest: ScopedArchiveManifest = {
      archiveId,
      tenantId,
      auditPeriod,
      scopedCategories: allowedCategories,
      totalArtifacts: sealedArtifacts.length,
      merkleRootHash: merkleRoot,
      integritySealSignature,
      sealedAt,
      auditorCertificate: {
        issuer: "VendorShield AICPA Integrity Seal Authority",
        algorithm: "HMAC-SHA256/Merkle-SHA256",
        certificateSerial: this.computeSha256(`CERT-${archiveId}`).substring(0, 16).toUpperCase(),
      },
      artifacts: sealedArtifacts,
    };

    return {
      manifest,
      payloads,
    };
  }

  /**
   * Verifies the authenticity, completeness, and non-tampering of an archive package.
   */
  public verifyArchiveSeal(pkg: ArchivePackage): SealVerificationReport {
    const { manifest, payloads } = pkg;
    const reasons: string[] = [];
    const tamperedArtifactIds: string[] = [];

    // Verify seal signature
    const expectedSealPayload = `${manifest.archiveId}:${manifest.tenantId}:${manifest.auditPeriod.startDate}:${manifest.auditPeriod.endDate}:${manifest.merkleRootHash}:${manifest.totalArtifacts}:${manifest.sealedAt}`;
    const expectedSig = createHmac("sha256", this.sealSecret)
      .update(expectedSealPayload)
      .digest("hex");

    const signatureMatches = expectedSig === manifest.integritySealSignature;
    if (!signatureMatches) {
      reasons.push("Integrity seal signature invalid or modified.");
    }

    // Verify each artifact payload and collect leaf hashes
    const leafHashes: string[] = [];
    for (const artifact of manifest.artifacts) {
      const content = payloads[artifact.itemId];
      if (content === undefined) {
        tamperedArtifactIds.push(artifact.itemId);
        reasons.push(`Payload missing for artifact ${artifact.itemId}`);
        continue;
      }

      const calcSha256 = this.computeSha256(content);
      const calcSha512 = this.computeSha512(content);

      if (calcSha256 !== artifact.sha256Hash || calcSha512 !== artifact.sha512Hash) {
        tamperedArtifactIds.push(artifact.itemId);
        reasons.push(`Hash mismatch for artifact ${artifact.itemId}`);
      }

      leafHashes.push(calcSha256);
    }

    const computedMerkle = this.computeMerkleRoot(leafHashes);
    const merkleRootMatches = computedMerkle === manifest.merkleRootHash;
    if (!merkleRootMatches) {
      reasons.push("Computed Merkle root does not match manifest Merkle root hash.");
    }

    const isValid = signatureMatches && merkleRootMatches && tamperedArtifactIds.length === 0;

    return {
      isValid,
      tenantId: manifest.tenantId,
      archiveId: manifest.archiveId,
      checkedArtifacts: manifest.artifacts.length,
      merkleRootMatches,
      signatureMatches,
      tamperedArtifactIds,
      reasons,
    };
  }
}
