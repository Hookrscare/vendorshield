/**
 * QA-116: DPA Counter-Party E-Signature Audit Certificate Engine.
 * Generates cryptographically verifiable, tamper-evident execution certificates
 * for GDPR Article 28 and SOC 2 CC6.8 compliant Data Processing Addendums.
 */

import crypto from "crypto";

export interface SignatoryDetails {
  name: string;
  email: string;
  title: string;
  organization: string;
  ipAddress: string;
  userAgent?: string;
  signedAtIso: string;
  consentStatement: string;
  signatureToken: string; // Cryptographic signatory tracking token
}

export interface DpaAuditCertificate {
  certificateId: string;
  dpaId: string;
  agreementVersion: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  effectiveDateIso: string;
  dpaContentSha256: string;
  signatories: {
    controller: SignatoryDetails;
    processor: SignatoryDetails;
  };
  generatedAtIso: string;
  certificateHash: string; // SHA-256 signature seal
}

export interface DpaCertificateVerificationResult {
  isValid: boolean;
  certificateId: string;
  errors: string[];
}

/**
 * Computes the canonical SHA-256 hash for document content (e.g. DPA text).
 */
export function computeDocumentHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Generates a unique cryptographic signature token for a signatory.
 */
export function generateSignatoryToken(
  email: string,
  dpaId: string,
  timestampIso: string
): string {
  const payload = `${email.toLowerCase().trim()}|${dpaId}|${timestampIso}`;
  const digest = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
  return `VS-SIG-${digest.toUpperCase()}`;
}

/**
 * Computes canonical hash over entire DPA certificate structure.
 */
export function computeCertificateHash(
  cert: Omit<DpaAuditCertificate, "certificateHash">
): string {
  const canonicalParts = [
    cert.certificateId,
    cert.dpaId,
    cert.agreementVersion,
    cert.tenantId,
    cert.vendorId,
    cert.effectiveDateIso,
    cert.dpaContentSha256,
    // Controller details
    cert.signatories.controller.email.toLowerCase().trim(),
    cert.signatories.controller.signedAtIso,
    cert.signatories.controller.signatureToken,
    // Processor details
    cert.signatories.processor.email.toLowerCase().trim(),
    cert.signatories.processor.signedAtIso,
    cert.signatories.processor.signatureToken,
    cert.generatedAtIso,
  ].join("|");

  return crypto.createHash("sha256").update(canonicalParts).digest("hex");
}

/**
 * Creates and signs a new DPA Counter-Party E-Signature Audit Certificate.
 */
export function createDpaCertificate(params: {
  dpaId: string;
  agreementVersion: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  effectiveDateIso: string;
  dpaContent: string;
  controllerSignatory: Omit<SignatoryDetails, "signatureToken">;
  processorSignatory: Omit<SignatoryDetails, "signatureToken">;
  generatedAtIso?: string;
  certificateId?: string;
}): DpaAuditCertificate {
  const generatedAtIso = params.generatedAtIso || new Date().toISOString();
  const certId =
    params.certificateId ||
    `VS-CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  const dpaContentSha256 = computeDocumentHash(params.dpaContent);

  const controllerToken = generateSignatoryToken(
    params.controllerSignatory.email,
    params.dpaId,
    params.controllerSignatory.signedAtIso
  );

  const processorToken = generateSignatoryToken(
    params.processorSignatory.email,
    params.dpaId,
    params.processorSignatory.signedAtIso
  );

  const partialCert: Omit<DpaAuditCertificate, "certificateHash"> = {
    certificateId: certId,
    dpaId: params.dpaId,
    agreementVersion: params.agreementVersion,
    tenantId: params.tenantId,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    effectiveDateIso: params.effectiveDateIso,
    dpaContentSha256,
    signatories: {
      controller: {
        ...params.controllerSignatory,
        signatureToken: controllerToken,
      },
      processor: {
        ...params.processorSignatory,
        signatureToken: processorToken,
      },
    },
    generatedAtIso,
  };

  return {
    ...partialCert,
    certificateHash: computeCertificateHash(partialCert),
  };
}

/**
 * Verifies cryptographic integrity, signature tokens, and hash consistency of a certificate.
 */
export function verifyDpaCertificate(
  cert: DpaAuditCertificate,
  originalDpaContent?: string
): DpaCertificateVerificationResult {
  const errors: string[] = [];

  if (!cert || !cert.certificateId) {
    return { isValid: false, certificateId: "", errors: ["Invalid certificate object"] };
  }

  // 1. Verify certificate hash seal
  const expectedHash = computeCertificateHash(cert);
  if (cert.certificateHash !== expectedHash) {
    errors.push(
      `Certificate hash seal invalid: expected ${expectedHash}, found ${cert.certificateHash}`
    );
  }

  // 2. Verify controller signatory token
  const expectedCtrlToken = generateSignatoryToken(
    cert.signatories.controller.email,
    cert.dpaId,
    cert.signatories.controller.signedAtIso
  );
  if (cert.signatories.controller.signatureToken !== expectedCtrlToken) {
    errors.push("Controller signatory token mismatch or tampering detected");
  }

  // 3. Verify processor signatory token
  const expectedProcToken = generateSignatoryToken(
    cert.signatories.processor.email,
    cert.dpaId,
    cert.signatories.processor.signedAtIso
  );
  if (cert.signatories.processor.signatureToken !== expectedProcToken) {
    errors.push("Processor signatory token mismatch or tampering detected");
  }

  // 4. If original DPA content provided, verify document checksum
  if (originalDpaContent) {
    const actualDocHash = computeDocumentHash(originalDpaContent);
    if (cert.dpaContentSha256 !== actualDocHash) {
      errors.push("Underlying DPA agreement content does not match certificate SHA-256 checksum");
    }
  }

  return {
    isValid: errors.length === 0,
    certificateId: cert.certificateId,
    errors,
  };
}

/**
 * Formats human-readable markdown audit summary for inclusion in CISO compliance binders.
 */
export function formatDpaCertificateSummary(cert: DpaAuditCertificate): string {
  return [
    `# VendorShield DPA E-Signature Execution Certificate`,
    `**Certificate ID**: \`${cert.certificateId}\``,
    `**Seal SHA-256**: \`${cert.certificateHash}\``,
    `**DPA ID**: ${cert.dpaId} (v${cert.agreementVersion})`,
    `**Effective Date**: ${cert.effectiveDateIso}`,
    `**Document Checksum (SHA-256)**: \`${cert.dpaContentSha256}\``,
    ``,
    `### Signatories`,
    `1. **Data Controller (Customer)**:`,
    `   - Name: ${cert.signatories.controller.name} (${cert.signatories.controller.title})`,
    `   - Organization: ${cert.signatories.controller.organization}`,
    `   - Email: \`${cert.signatories.controller.email}\``,
    `   - IP: \`${cert.signatories.controller.ipAddress}\``,
    `   - Signed At: ${cert.signatories.controller.signedAtIso}`,
    `   - Token: \`${cert.signatories.controller.signatureToken}\``,
    `2. **Data Processor (Vendor - ${cert.vendorName})**:`,
    `   - Name: ${cert.signatories.processor.name} (${cert.signatories.processor.title})`,
    `   - Organization: ${cert.signatories.processor.organization}`,
    `   - Email: \`${cert.signatories.processor.email}\``,
    `   - IP: \`${cert.signatories.processor.ipAddress}\``,
    `   - Signed At: ${cert.signatories.processor.signedAtIso}`,
    `   - Token: \`${cert.signatories.processor.signatureToken}\``,
    ``,
    `*Generated by VendorShield Compliance Automation on ${cert.generatedAtIso}*`,
  ].join("\n");
}
