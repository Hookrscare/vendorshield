/**
 * QA-140: Multi-Tenant Data De-Identification & PII Tokenization Engine Regression Tests.
 */

import { describe, it, expect } from "vitest";
import {
  PiiTokenizationEngine,
  TokenizationRule
} from "./pii-tokenization-engine";

describe("QA-140: PII Tokenization & De-Identification Engine", () => {
  const engine = new PiiTokenizationEngine("master-super-secret-key-at-least-16-bytes");

  it("applies privacy masks correctly across standard PII formats", () => {
    expect(engine.maskPii("john.doe@enterprise.com", "EMAIL")).toBe("j***e@e***.com");
    expect(engine.maskPii("123-45-6789", "SSN")).toBe("***-**-6789");
    expect(engine.maskPii("+14155552671", "PHONE")).toBe("(***) ***-2671");
    expect(engine.maskPii("192.168.1.45", "IP_ADDRESS")).toBe("192.168.***.***");
  });

  it("enforces tenant-level isolation for tokenized data", () => {
    const rawEmail = "compliance-lead@acme.com";
    const tokenTenantA = engine.tokenize("tenant-alpha", rawEmail, "EMAIL");
    const tokenTenantB = engine.tokenize("tenant-beta", rawEmail, "EMAIL");

    expect(tokenTenantA).toContain("@token.vendorshield.internal");
    expect(tokenTenantB).toContain("@token.vendorshield.internal");
    expect(tokenTenantA).not.toBe(tokenTenantB);

    // Consistency check within same tenant
    const repeatTokenA = engine.tokenize("tenant-alpha", rawEmail, "EMAIL");
    expect(repeatTokenA).toBe(tokenTenantA);
  });

  it("supports roundtrip reversible encryption and cross-tenant decryption protection", () => {
    const sensitiveSSN = "987-65-4321";
    const cipher = engine.encryptReversible("tenant-100", sensitiveSSN);

    expect(cipher).toContain(":");
    const decrypted = engine.decryptReversible("tenant-100", cipher);
    expect(decrypted).toBe(sensitiveSSN);

    // Attempting to decrypt with wrong tenant key fails due to auth tag verification
    expect(() => {
      engine.decryptReversible("tenant-999", cipher);
    }).toThrow();
  });

  it("de-identifies a complex record and issues a tamper-evident audit proof", () => {
    const record = {
      userEmail: { value: "ciso@target-vendor.com", type: "EMAIL" as const },
      userPhone: { value: "+14155559988", type: "PHONE" as const },
      loginIp: { value: "10.0.4.12", type: "IP_ADDRESS" as const }
    };

    const rules: Record<string, TokenizationRule> = {
      userEmail: { fieldType: "EMAIL", mode: "FORMAT_PRESERVING_TOKEN", reversible: true },
      userPhone: { fieldType: "PHONE", mode: "REDACTION_MASK", reversible: false },
      loginIp: { fieldType: "IP_ADDRESS", mode: "ONE_WAY_HASH", reversible: false }
    };

    const result = engine.deIdentifyRecord("tenant-ciso", record, rules);

    expect(result.tenantId).toBe("tenant-ciso");
    expect(result.transformedCount).toBe(3);
    expect(result.fieldTransforms.userEmail).toContain("@token.vendorshield.internal");
    expect(result.fieldTransforms.userPhone).toBe("(***) ***-9988");
    expect(result.fieldTransforms.loginIp).toHaveLength(64); // SHA-256 hex
    expect(result.auditProofHash).toHaveLength(64);
  });
});
