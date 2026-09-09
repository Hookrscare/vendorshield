/**
 * QA-136: Multi-Tenant SOC 2 Type II Automated Evidence Repository Cryptographic Vault.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 *
 * Provides tamper-evident cryptographic storage and Merkle tree verification
 * for SOC 2 Type II audit evidence artifacts across multi-cloud tenants.
 */

import { createHash, createHmac } from "crypto";

export interface EvidenceArtifact {
  artifactId: string;
  tenantId: string;
  trustCriteria: "SECURITY_CC6" | "AVAILABILITY_A1" | "CONFIDENTIALITY_C1" | "PRIVACY_P1";
  controlId: string; // e.g. "CC6.1", "CC6.8", "A1.2"
  title: string;
  rawPayload: string;
  collectedAt: string;
  artifactHash?: string;
}

export interface VaultVerificationResult {
  tenantId: string;
  totalArtifacts: number;
  merkleRootHash: string;
  tamperEvidentChainValid: boolean;
  criteriaCoverage: Record<string, number>;
  hmacSignature: string;
  auditTimestamp: string;
}

export class SOC2EvidenceCryptographicVault {
  private artifacts: Map<string, EvidenceArtifact> = new Map();
  private readonly hmacSecret: string;

  constructor(hmacSecret: string = "vendorshield-soc2-vault-secret") {
    self_secret: this.hmacSecret = hmacSecret;
  }

  /**
   * Registers and cryptographically seals a new audit evidence artifact.
   */
  public sealArtifact(artifact: EvidenceArtifact): EvidenceArtifact {
    const payload = `${artifact.tenantId}:${artifact.trustCriteria}:${artifact.controlId}:${artifact.rawPayload}:${artifact.collectedAt}`;
    const artifactHash = createHash("sha256").update(payload).digest("hex");

    const sealed: EvidenceArtifact = {
      ...artifact,
      artifactHash
    };

    this.artifacts.set(sealed.artifactId, sealed);
    return sealed;
  }

  /**
   * Computes a binary Merkle Root Hash across all sealed artifacts for a given tenant.
   */
  public computeTenantMerkleRoot(tenantId: string): string {
    const tenantArtifacts = Array.from(this.artifacts.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => a.artifactId.localeCompare(b.artifactId));

    if (tenantArtifacts.length === 0) {
      return createHash("sha256").update("EMPTY_VAULT").digest("hex");
    }

    let currentLevel: string[] = tenantArtifacts.map(a => a.artifactHash!);

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = currentLevel[i] + currentLevel[i + 1];
          nextLevel.push(createHash("sha256").update(combined).digest("hex"));
        } else {
          // Odd node promoted with duplicate self-hash
          const combined = currentLevel[i] + currentLevel[i];
          nextLevel.push(createHash("sha256").update(combined).digest("hex"));
        }
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Performs an end-to-end cryptographic verification of the tenant's evidence repository.
   */
  public verifyTenantVault(tenantId: string): VaultVerificationResult {
    const tenantArtifacts = Array.from(this.artifacts.values()).filter(a => a.tenantId === tenantId);
    let allValid = true;
    const criteriaCoverage: Record<string, number> = {};

    for (const art of tenantArtifacts) {
      const expectedPayload = `${art.tenantId}:${art.trustCriteria}:${art.controlId}:${art.rawPayload}:${art.collectedAt}`;
      const recomputedHash = createHash("sha256").update(expectedPayload).digest("hex");

      if (recomputedHash !== art.artifactHash) {
        allValid = false;
      }

      criteriaCoverage[art.trustCriteria] = (criteriaCoverage[art.trustCriteria] || 0) + 1;
    }

    const merkleRootHash = this.computeTenantMerkleRoot(tenantId);
    const auditTimestamp = new Date().toISOString();

    const signaturePayload = `${tenantId}:${merkleRootHash}:${allValid}:${auditTimestamp}`;
    const hmacSignature = createHmac("sha256", this.hmacSecret)
      .update(signaturePayload)
      .digest("hex");

    return {
      tenantId,
      totalArtifacts: tenantArtifacts.length,
      merkleRootHash,
      tamperEvidentChainValid: allValid,
      criteriaCoverage,
      hmacSignature,
      auditTimestamp
    };
  }
}
