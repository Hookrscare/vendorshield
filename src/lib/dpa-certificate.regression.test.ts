import { describe, it, expect } from "vitest";
import {
  createDpaCertificate,
  verifyDpaCertificate,
  computeDocumentHash,
  generateSignatoryToken,
  formatDpaCertificateSummary,
} from "./dpa-certificate";

describe("QA-116: DPA Counter-Party E-Signature Audit Certificate Engine", () => {
  const sampleDpaText = `DATA PROCESSING ADDENDUM v2.4
Between Tenant Corp ("Controller") and CloudData Systems Inc ("Processor").
Effective Date: 2026-09-01.
Standard Contractual Clauses (Module 2 Controller-to-Processor) are hereby incorporated.`;

  const controllerSignatory = {
    name: "Jane Doe",
    email: "jane.doe@tenantcorp.com",
    title: "Chief Information Security Officer",
    organization: "Tenant Corp",
    ipAddress: "192.0.2.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    signedAtIso: "2026-09-01T14:30:00.000Z",
    consentStatement: "I hereby confirm acceptance of DPA terms v2.4 on behalf of Tenant Corp.",
  };

  const processorSignatory = {
    name: "Alex Smith",
    email: "alex.smith@clouddata.com",
    title: "Data Protection Officer",
    organization: "CloudData Systems Inc",
    ipAddress: "198.51.100.12",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    signedAtIso: "2026-09-01T15:15:00.000Z",
    consentStatement: "I hereby execute this DPA v2.4 as authorized representative of Processor.",
  };

  it("should create a valid cryptographically sealed DPA certificate", () => {
    const cert = createDpaCertificate({
      dpaId: "DPA-2026-0091",
      agreementVersion: "2.4",
      tenantId: "tenant-tenantcorp",
      vendorId: "vendor-clouddata",
      vendorName: "CloudData Systems Inc",
      effectiveDateIso: "2026-09-01T00:00:00.000Z",
      dpaContent: sampleDpaText,
      controllerSignatory,
      processorSignatory,
      generatedAtIso: "2026-09-01T15:20:00.000Z",
    });

    expect(cert.certificateId).toMatch(/^VS-CERT-[A-F0-9]{12}$/);
    expect(cert.certificateHash).toHaveLength(64);
    expect(cert.dpaContentSha256).toBe(computeDocumentHash(sampleDpaText));
    expect(cert.signatories.controller.signatureToken).toMatch(/^VS-SIG-[A-F0-9]{16}$/);
    expect(cert.signatories.processor.signatureToken).toMatch(/^VS-SIG-[A-F0-9]{16}$/);

    // Verification check
    const verification = verifyDpaCertificate(cert, sampleDpaText);
    expect(verification.isValid).toBe(true);
    expect(verification.errors).toHaveLength(0);
  });

  it("should detect document content tampering", () => {
    const cert = createDpaCertificate({
      dpaId: "DPA-2026-0091",
      agreementVersion: "2.4",
      tenantId: "tenant-tenantcorp",
      vendorId: "vendor-clouddata",
      vendorName: "CloudData Systems Inc",
      effectiveDateIso: "2026-09-01T00:00:00.000Z",
      dpaContent: sampleDpaText,
      controllerSignatory,
      processorSignatory,
    });

    const tamperedContent = sampleDpaText + "\n[TAMPERED CLAUSE: Unlimited Liability Exemption]";
    const verification = verifyDpaCertificate(cert, tamperedContent);

    expect(verification.isValid).toBe(false);
    expect(verification.errors).toContain(
      "Underlying DPA agreement content does not match certificate SHA-256 checksum"
    );
  });

  it("should detect signatory tampering or token forgery", () => {
    const cert = createDpaCertificate({
      dpaId: "DPA-2026-0091",
      agreementVersion: "2.4",
      tenantId: "tenant-tenantcorp",
      vendorId: "vendor-clouddata",
      vendorName: "CloudData Systems Inc",
      effectiveDateIso: "2026-09-01T00:00:00.000Z",
      dpaContent: sampleDpaText,
      controllerSignatory,
      processorSignatory,
    });

    // Tamper with controller email
    const tamperedCert = {
      ...cert,
      signatories: {
        ...cert.signatories,
        controller: {
          ...cert.signatories.controller,
          email: "attacker@malicious.com",
        },
      },
    };

    const verification = verifyDpaCertificate(tamperedCert);
    expect(verification.isValid).toBe(false);
    expect(verification.errors.length).toBeGreaterThan(0);
    expect(verification.errors).toContain(
      "Controller signatory token mismatch or tampering detected"
    );
  });

  it("should detect certificate hash seal corruption", () => {
    const cert = createDpaCertificate({
      dpaId: "DPA-2026-0091",
      agreementVersion: "2.4",
      tenantId: "tenant-tenantcorp",
      vendorId: "vendor-clouddata",
      vendorName: "CloudData Systems Inc",
      effectiveDateIso: "2026-09-01T00:00:00.000Z",
      dpaContent: sampleDpaText,
      controllerSignatory,
      processorSignatory,
    });

    const corruptedCert = {
      ...cert,
      certificateHash: "bad" + cert.certificateHash.slice(3),
    };

    const verification = verifyDpaCertificate(corruptedCert);
    expect(verification.isValid).toBe(false);
    expect(verification.errors.some(e => e.includes("Certificate hash seal invalid"))).toBe(true);
  });

  it("should format comprehensive markdown audit summary", () => {
    const cert = createDpaCertificate({
      dpaId: "DPA-2026-0091",
      agreementVersion: "2.4",
      tenantId: "tenant-tenantcorp",
      vendorId: "vendor-clouddata",
      vendorName: "CloudData Systems Inc",
      effectiveDateIso: "2026-09-01T00:00:00.000Z",
      dpaContent: sampleDpaText,
      controllerSignatory,
      processorSignatory,
    });

    const summary = formatDpaCertificateSummary(cert);
    expect(summary).toContain("# VendorShield DPA E-Signature Execution Certificate");
    expect(summary).toContain(cert.certificateId);
    expect(summary).toContain(cert.certificateHash);
    expect(summary).toContain("jane.doe@tenantcorp.com");
    expect(summary).toContain("alex.smith@clouddata.com");
    expect(summary).toContain(cert.signatories.controller.signatureToken);
  });
});
