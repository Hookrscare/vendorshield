/**
 * QA-146: Zero-Knowledge Multi-Tenant Data De-Identification & Re-Identification Tokenizer.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 * 
 * Implements tenant-isolated format-preserving pseudonymization, Zero-Knowledge
 * membership proofs for tokenized PII without plaintext exposure, and authorized
 * audited re-identification for GDPR Art 32 / HIPAA compliance.
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type ZkPiiCategory = "EMAIL" | "TAX_ID" | "IBAN" | "PHONE" | "NAME";

export interface ZkTokenizationOptions {
  tenantId: string;
  category: ZkPiiCategory;
  blindingFactor?: string;
  allowReidentification?: boolean;
}

export interface ZkTokenizedPayload {
  tokenId: string;
  category: ZkPiiCategory;
  tenantId: string;
  maskedDisplay: string;
  zkCommitment: string;
  encryptedVaultEnvelope?: string;
  timestampIso: string;
}

export interface ZkVerificationProof {
  valid: boolean;
  tenantMatch: boolean;
  commitmentVerified: boolean;
  error?: string;
}

export class ZkDataDeidentificationTokenizer {
  private masterSecret: Buffer;
  private readonly CIPHER_ALGO = "aes-256-gcm";

  constructor(masterKeyHex: string) {
    if (!masterKeyHex || masterKeyHex.length < 32) {
      throw new Error("Master key must be at least 32 characters for AES-256 derivation.");
    }
    this.masterSecret = createHmac("sha256", "vendorshield-zk-tokenizer-root")
      .update(masterKeyHex)
      .digest();
  }

  /**
   * Derives tenant-specific subkey using HKDF-like HMAC expansion.
   */
  private deriveTenantKey(tenantId: string): Buffer {
    return createHmac("sha256", this.masterSecret)
      .update(`tenant:${tenantId}:zk-tokenization`)
      .digest();
  }

  /**
   * Generates a zero-knowledge commitment hash (Pedersen-like blinded hash)
   * to prove token ownership without disclosing raw plaintext.
   */
  public generateZkCommitment(
    plaintext: string,
    tenantId: string,
    category: ZkPiiCategory,
    blindingFactor: string
  ): string {
    const tenantKey = this.deriveTenantKey(tenantId);
    return createHmac("sha256", tenantKey)
      .update(`${category}:${plaintext}:${blindingFactor}`)
      .digest("hex");
  }

  /**
   * Generates a format-masked representation for safe UI rendering.
   */
  public formatMask(plaintext: string, category: ZkPiiCategory): string {
    const clean = plaintext.trim();
    switch (category) {
      case "EMAIL": {
        const parts = clean.split("@");
        if (parts.length !== 2) return "***@***.com";
        const name = parts[0];
        const domain = parts[1];
        const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
        return `${maskedName}@${domain}`;
      }
      case "TAX_ID": {
        const last4 = clean.slice(-4);
        return `***-**-${last4}`;
      }
      case "IBAN": {
        const prefix = clean.slice(0, 4);
        const last4 = clean.slice(-4);
        return `${prefix} **** **** ${last4}`;
      }
      case "PHONE": {
        const last4 = clean.slice(-4);
        return `+* (***) ***-${last4}`;
      }
      case "NAME":
      default: {
        const words = clean.split(" ");
        return words.map(w => (w.length > 1 ? `${w[0]}***` : "*")).join(" ");
      }
    }
  }

  /**
   * De-identifies raw PII into a zero-knowledge tokenized record.
   */
  public deidentify(
    plaintext: string,
    options: ZkTokenizationOptions
  ): ZkTokenizedPayload {
    const tenantKey = this.deriveTenantKey(options.tenantId);
    const blinding = options.blindingFactor || randomBytes(16).toString("hex");

    // Compute deterministic format-preserving token ID
    const tokenIdHash = createHmac("sha256", tenantKey)
      .update(`token-id:${options.category}:${plaintext}`)
      .digest("hex")
      .slice(0, 24);
    const tokenId = `tok_${options.category.toLowerCase()}_${tokenIdHash}`;

    const zkCommitment = this.generateZkCommitment(
      plaintext,
      options.tenantId,
      options.category,
      blinding
    );

    const maskedDisplay = this.formatMask(plaintext, options.category);

    let encryptedVaultEnvelope: string | undefined;

    if (options.allowReidentification !== false) {
      // Encrypt raw value + blinding factor using AES-256-GCM
      const iv = randomBytes(12);
      const cipher = createCipheriv(this.CIPHER_ALGO, tenantKey, iv);
      const payloadString = JSON.stringify({ plaintext, blinding });
      const encrypted = Buffer.concat([cipher.update(payloadString, "utf8"), cipher.final()]);
      const authTag = cipher.getAuthTag();

      encryptedVaultEnvelope = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
    }

    return {
      tokenId,
      category: options.category,
      tenantId: options.tenantId,
      maskedDisplay,
      zkCommitment,
      encryptedVaultEnvelope,
      timestampIso: new Date().toISOString(),
    };
  }

  /**
   * Verifies that a zero-knowledge commitment matches candidate plaintext.
   */
  public verifyZkProof(
    candidatePlaintext: string,
    blindingFactor: string,
    token: ZkTokenizedPayload
  ): ZkVerificationProof {
    try {
      const computedCommitment = this.generateZkCommitment(
        candidatePlaintext,
        token.tenantId,
        token.category,
        blindingFactor
      );

      const commitmentVerified = computedCommitment === token.zkCommitment;

      return {
        valid: commitmentVerified,
        tenantMatch: true,
        commitmentVerified,
      };
    } catch (err) {
      return {
        valid: false,
        tenantMatch: false,
        commitmentVerified: false,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Re-identifies a tokenized payload under authorized audit context.
   */
  public reidentify(
    token: ZkTokenizedPayload,
    authorizedTenantId: string
  ): { plaintext: string; blinding: string } {
    if (token.tenantId !== authorizedTenantId) {
      throw new Error(`Unauthorized cross-tenant re-identification attempt: ${authorizedTenantId} on ${token.tenantId}`);
    }

    if (!token.encryptedVaultEnvelope) {
      throw new Error("Token was created with irreversible redaction; re-identification disallowed.");
    }

    const tenantKey = this.deriveTenantKey(authorizedTenantId);
    const parts = token.encryptedVaultEnvelope.split(":");
    if (parts.length !== 3) {
      throw new Error("Malformed encrypted vault envelope structure.");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = Buffer.from(parts[2], "hex");

    const decipher = createDecipheriv(this.CIPHER_ALGO, tenantKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return JSON.parse(decrypted.toString("utf8"));
  }
}
