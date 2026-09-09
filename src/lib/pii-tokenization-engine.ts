/**
 * QA-140: Multi-Tenant Data De-Identification & PII Tokenization Engine.
 * Implements deterministic vaultless format-preserving tokenization, GDPR/CCPA
 * field-level redaction, tenant isolation, and cryptographic audit proofs.
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type PiiFieldType = "EMAIL" | "PHONE" | "SSN" | "IP_ADDRESS" | "IBAN" | "FULL_NAME";

export interface TokenizationRule {
  fieldType: PiiFieldType;
  mode: "FORMAT_PRESERVING_TOKEN" | "REDACTION_MASK" | "ONE_WAY_HASH";
  reversible: boolean;
}

export interface DeIdentificationResult {
  tenantId: string;
  originalCount: number;
  transformedCount: number;
  processedAtIso: string;
  fieldTransforms: Record<string, string>;
  auditProofHash: string;
}

export class PiiTokenizationEngine {
  private masterSecret: string;
  private readonly AES_ALGORITHM = "aes-256-gcm";

  constructor(masterSecret: string) {
    if (!masterSecret || masterSecret.length < 16) {
      throw new Error("Master secret must be at least 16 characters long.");
    }
    this.masterSecret = masterSecret;
  }

  /**
   * Derives a tenant-specific 32-byte cryptographic key.
   */
  private deriveTenantKey(tenantId: string): Buffer {
    return createHmac("sha256", this.masterSecret).update(`tenant:${tenantId}`).digest();
  }

  /**
   * Masks a PII string for privacy-safe display.
   */
  public maskPii(value: string, type: PiiFieldType): string {
    const trimmed = value.trim();
    switch (type) {
      case "EMAIL": {
        const parts = trimmed.split("@");
        if (parts.length !== 2) return "***@***.com";
        const name = parts[0];
        const domain = parts[1];
        const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
        const domainParts = domain.split(".");
        const maskedDomain = domainParts.length > 1
          ? `${domainParts[0][0]}***.${domainParts.slice(1).join(".")}`
          : `${domain[0]}***`;
        return `${maskedName}@${maskedDomain}`;
      }
      case "SSN": {
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length === 9) {
          return `***-**-${digits.slice(5)}`;
        }
        return "***-**-****";
      }
      case "PHONE": {
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length >= 10) {
          return `(***) ***-${digits.slice(-4)}`;
        }
        return "***-***-****";
      }
      case "IP_ADDRESS": {
        const octets = trimmed.split(".");
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.***.***`;
        }
        return "***.***.***.***";
      }
      default:
        return trimmed.length > 2 ? `${trimmed[0]}***${trimmed[trimmed.length - 1]}` : "***";
    }
  }

  /**
   * Deterministically tokenizes a PII string using tenant-scoped HMAC.
   */
  public tokenize(tenantId: string, value: string, fieldType: PiiFieldType): string {
    const tenantKey = this.deriveTenantKey(tenantId);
    const rawHash = createHmac("sha256", tenantKey)
      .update(`${fieldType}:${value.trim().toLowerCase()}`)
      .digest("hex");

    switch (fieldType) {
      case "EMAIL": {
        const prefix = rawHash.slice(0, 8);
        return `tok-${prefix}@token.vendorshield.internal`;
      }
      case "SSN": {
        const digits = rawHash.replace(/\D/g, "").slice(0, 9).padEnd(9, "0");
        return `999-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
      }
      case "PHONE": {
        const digits = rawHash.replace(/\D/g, "").slice(0, 10).padEnd(10, "5");
        return `+1-555-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
      default:
        return `TKN-${fieldType.slice(0, 3)}-${rawHash.slice(0, 16)}`;
    }
  }

  /**
   * Encrypts PII for reversible de-tokenization using tenant-scoped AES-256-GCM.
   */
  public encryptReversible(tenantId: string, plainText: string): string {
    const key = this.deriveTenantKey(tenantId);
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.AES_ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  /**
   * Decrypts reversible tokenized payload.
   */
  public decryptReversible(tenantId: string, cipherPayload: string): string {
    const key = this.deriveTenantKey(tenantId);
    const parts = cipherPayload.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid cipher payload format. Expected iv:tag:ciphertext.");
    }
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encryptedHex = parts[2];

    const decipher = createDecipheriv(this.AES_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Batch de-identifies a record payload according to defined rules.
   */
  public deIdentifyRecord(
    tenantId: string,
    fields: Record<string, { value: string; type: PiiFieldType }>,
    rules: Record<string, TokenizationRule>
  ): DeIdentificationResult {
    const fieldTransforms: Record<string, string> = {};
    let transformedCount = 0;

    for (const [key, item] of Object.entries(fields)) {
      const rule = rules[key] || {
        fieldType: item.type,
        mode: "FORMAT_PRESERVING_TOKEN",
        reversible: false
      };

      if (rule.mode === "REDACTION_MASK") {
        fieldTransforms[key] = this.maskPii(item.value, item.type);
      } else if (rule.mode === "ONE_WAY_HASH") {
        fieldTransforms[key] = createHmac("sha256", this.deriveTenantKey(tenantId))
          .update(item.value)
          .digest("hex");
      } else {
        fieldTransforms[key] = this.tokenize(tenantId, item.value, item.type);
      }
      transformedCount++;
    }

    const processedAtIso = new Date().toISOString();
    const auditPayload = `${tenantId}:${processedAtIso}:${JSON.stringify(fieldTransforms)}`;
    const auditProofHash = createHmac("sha256", this.masterSecret).update(auditPayload).digest("hex");

    return {
      tenantId,
      originalCount: Object.keys(fields).length,
      transformedCount,
      processedAtIso,
      fieldTransforms,
      auditProofHash
    };
  }
}
