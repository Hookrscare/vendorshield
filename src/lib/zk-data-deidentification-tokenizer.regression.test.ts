/**
 * QA-146: Zero-Knowledge Multi-Tenant Data De-Identification & Re-Identification Tokenizer Regression Suite.
 */

import { describe, it, expect } from "vitest";
import { ZkDataDeidentificationTokenizer } from "./zk-data-deidentification-tokenizer";

describe("QA-146: ZkDataDeidentificationTokenizer", () => {
  const masterKey = "super-secure-enterprise-master-key-32-chars-long";
  const tokenizer = new ZkDataDeidentificationTokenizer(masterKey);

  it("successfully de-identifies PII into deterministic token and masked display", () => {
    const rawEmail = "security-auditor@enterprise.corp";
    const token = tokenizer.deidentify(rawEmail, {
      tenantId: "tenant-acme-corp",
      category: "EMAIL",
    });

    expect(token.tokenId).toMatch(/^tok_email_[a-f0-9]{24}$/);
    expect(token.tenantId).toBe("tenant-acme-corp");
    expect(token.maskedDisplay).toBe("s***r@enterprise.corp");
    expect(token.zkCommitment).toBeDefined();
    expect(token.encryptedVaultEnvelope).toBeDefined();
  });

  it("verifies zero-knowledge commitment proof without revealing plaintext", () => {
    const rawTaxId = "123-45-6789";
    const blinding = "test-blinding-seed-9999";
    const token = tokenizer.deidentify(rawTaxId, {
      tenantId: "tenant-finance-llc",
      category: "TAX_ID",
      blindingFactor: blinding,
    });

    const proofValid = tokenizer.verifyZkProof(rawTaxId, blinding, token);
    expect(proofValid.valid).toBe(true);
    expect(proofValid.commitmentVerified).toBe(true);

    const proofInvalid = tokenizer.verifyZkProof("999-99-9999", blinding, token);
    expect(proofInvalid.valid).toBe(false);
    expect(proofInvalid.commitmentVerified).toBe(false);
  });

  it("re-identifies encrypted token payload under authorized tenant custody", () => {
    const rawIban = "DE89370400440532013000";
    const token = tokenizer.deidentify(rawIban, {
      tenantId: "tenant-bank-trust",
      category: "IBAN",
    });

    const recovered = tokenizer.reidentify(token, "tenant-bank-trust");
    expect(recovered.plaintext).toBe(rawIban);
  });

  it("blocks unauthorized cross-tenant re-identification attempts", () => {
    const rawPhone = "+1 (555) 234-5678";
    const token = tokenizer.deidentify(rawPhone, {
      tenantId: "tenant-legit",
      category: "PHONE",
    });

    expect(() => {
      tokenizer.reidentify(token, "tenant-attacker");
    }).toThrow("Unauthorized cross-tenant re-identification attempt");
  });
});
