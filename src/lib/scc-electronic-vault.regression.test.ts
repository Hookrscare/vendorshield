import { describe, it, expect } from "vitest";
import {
  createSccVaultRecord,
  signSccVaultRecord,
  verifySccVaultRecord,
  generateRegulatoryProofPackage,
  hashSccDocument,
  computeVaultRecordSeal,
  SccVaultRecord
} from "./scc-electronic-vault";

describe("QA-122: Multi-Jurisdiction Standard Contractual Clauses (SCC) Electronic Vault & Signature Verifier", () => {
  const sampleDocument = "Standard Contractual Clauses Module 2: Transfer Controller to Processor (EU 2021/914)";

  it("creates a valid unexecuted SCC Vault Record with correct cryptographic hash and initial seal", () => {
    const record = createSccVaultRecord({
      agreementId: "AGR-2026-001",
      tenantId: "TENANT-ACME",
      vendorId: "VND-DATADOG",
      vendorName: "Datadog, Inc.",
      jurisdiction: "EU_GDPR_2021",
      module: "MODULE_2_C2P",
      governingLaw: "Ireland",
      competentSupervisoryAuthority: "Irish Data Protection Commission (DPC)",
      rawDocumentContent: sampleDocument,
      effectiveDateIso: "2026-09-01T00:00:00.000Z"
    });

    expect(record.vaultRecordId).toMatch(/^SCC-VLT-[A-F0-9]{12}$/);
    expect(record.status).toBe("DRAFT");
    expect(record.documentSha256).toBe(hashSccDocument(sampleDocument));
    expect(record.signatories.exporter).toBeUndefined();
    expect(record.signatories.importer).toBeUndefined();

    const verification = verifySccVaultRecord(record, { rawDocument: sampleDocument });
    expect(verification.isValid).toBe(true);
    expect(verification.sealVerified).toBe(true);
    expect(verification.signaturesComplete).toBe(false);
    expect(verification.warnings).toContain("Missing Data Exporter signature");
    expect(verification.warnings).toContain("Missing Data Importer signature");
  });

  it("updates status to PENDING_SIGNATURE when first party signs and updates cryptographic seal", () => {
    const initialRecord = createSccVaultRecord({
      agreementId: "AGR-2026-002",
      tenantId: "TENANT-ACME",
      vendorId: "VND-AWS",
      vendorName: "Amazon Web Services EMEA SARL",
      jurisdiction: "MULTI_JURISDICTION_COMBINED",
      module: "MODULE_2_C2P",
      governingLaw: "Luxembourg",
      competentSupervisoryAuthority: "CNPD Luxembourg",
      rawDocumentContent: sampleDocument,
      effectiveDateIso: "2026-09-01T00:00:00.000Z"
    });

    const exporterSigned = signSccVaultRecord(initialRecord, {
      role: "DATA_EXPORTER",
      name: "Alice Exporter",
      email: "alice@acme-corp.com",
      title: "Chief Privacy Officer",
      organization: "Acme Corp Ltd",
      countryIso: "IE",
      ipAddress: "192.0.2.45",
      signedAtIso: "2026-09-02T10:00:00.000Z"
    });

    expect(exporterSigned.status).toBe("PENDING_SIGNATURE");
    expect(exporterSigned.signatories.exporter).toBeDefined();
    expect(exporterSigned.signatories.exporter?.signatureToken).toMatch(/^SIG-[A-F0-9]{20}$/);
    expect(exporterSigned.cryptographicSeal).not.toBe(initialRecord.cryptographicSeal);

    const verification = verifySccVaultRecord(exporterSigned);
    expect(verification.sealVerified).toBe(true);
    expect(verification.signaturesComplete).toBe(false);
  });

  it("transitions to EXECUTED when both parties sign, verifying seal and generating regulatory package", () => {
    const initialRecord = createSccVaultRecord({
      agreementId: "AGR-2026-003",
      tenantId: "TENANT-ACME",
      vendorId: "VND-SNOWFLAKE",
      vendorName: "Snowflake Inc.",
      jurisdiction: "UK_ICO_ADDENDUM",
      module: "MODULE_2_C2P",
      governingLaw: "England & Wales",
      competentSupervisoryAuthority: "UK Information Commissioner's Office (ICO)",
      rawDocumentContent: sampleDocument,
      effectiveDateIso: "2026-09-01T00:00:00.000Z"
    });

    const expSigned = signSccVaultRecord(initialRecord, {
      role: "DATA_EXPORTER",
      name: "Alice Exporter",
      email: "alice@acme-corp.com",
      title: "CPO",
      organization: "Acme Corp UK",
      countryIso: "GB",
      ipAddress: "198.51.100.12",
      signedAtIso: "2026-09-02T10:00:00.000Z"
    });

    const fullyExecuted = signSccVaultRecord(expSigned, {
      role: "DATA_IMPORTER",
      name: "Bob Importer",
      email: "bob@snowflake.com",
      title: "VP Legal Compliance",
      organization: "Snowflake Inc",
      countryIso: "US",
      ipAddress: "203.0.113.88",
      signedAtIso: "2026-09-02T14:30:00.000Z"
    });

    expect(fullyExecuted.status).toBe("EXECUTED");
    expect(fullyExecuted.signatories.exporter).toBeDefined();
    expect(fullyExecuted.signatories.importer).toBeDefined();

    const verification = verifySccVaultRecord(fullyExecuted, { rawDocument: sampleDocument });
    expect(verification.isValid).toBe(true);
    expect(verification.sealVerified).toBe(true);
    expect(verification.signaturesComplete).toBe(true);
    expect(verification.errors.length).toBe(0);

    const proofPackage = generateRegulatoryProofPackage(fullyExecuted);
    expect(proofPackage.packageId).toMatch(/^REG-PROOF-[A-F0-9]{12}$/);
    expect(proofPackage.complianceStatement).toContain("UK_ICO_ADDENDUM");
    expect(proofPackage.exporterSummary).toContain("Alice Exporter");
    expect(proofPackage.importerSummary).toContain("Bob Importer");
  });

  it("detects document tampering or unauthorized modifications to seal", () => {
    const record = createSccVaultRecord({
      agreementId: "AGR-2026-004",
      tenantId: "TENANT-ACME",
      vendorId: "VND-STRIPE",
      vendorName: "Stripe Payments Europe",
      jurisdiction: "SWISS_FDPIC_FADP",
      module: "MODULE_2_C2P",
      governingLaw: "Switzerland",
      competentSupervisoryAuthority: "FDPIC",
      rawDocumentContent: sampleDocument,
      effectiveDateIso: "2026-09-01T00:00:00.000Z"
    });

    // Tampered document content
    const verificationTamperedDoc = verifySccVaultRecord(record, {
      rawDocument: "TAMPERED CONTENT INSERTED BY ATTACKER"
    });
    expect(verificationTamperedDoc.errors.some(e => e.includes("Document hash mismatch"))).toBe(true);

    // Tampered seal
    const tamperedRecord: SccVaultRecord = {
      ...record,
      cryptographicSeal: "VAULT-SEAL-FORGED-HASH-VALUE"
    };
    const verificationTamperedSeal = verifySccVaultRecord(tamperedRecord);
    expect(verificationTamperedSeal.sealVerified).toBe(false);
    expect(verificationTamperedSeal.errors.some(e => e.includes("Cryptographic vault seal verification failed"))).toBe(true);
  });
});
