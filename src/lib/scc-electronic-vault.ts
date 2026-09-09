/**
 * QA-122: Multi-Jurisdiction Standard Contractual Clauses (SCC) Electronic Vault & Signature Verifier.
 * Manages tamper-evident electronic archival, cross-border jurisdiction addenda (EU GDPR 2021/914,
 * UK ICO IDTA / Addendum, Swiss FDPIC / FADP), cryptographic signatory sealing, and regulatory proof packages.
 */

import crypto from "crypto";

export type SccJurisdiction =
  | "EU_GDPR_2021"
  | "UK_ICO_ADDENDUM"
  | "SWISS_FDPIC_FADP"
  | "MULTI_JURISDICTION_COMBINED";

export type SccModule =
  | "MODULE_1_C2C" // Controller-to-Controller
  | "MODULE_2_C2P" // Controller-to-Processor
  | "MODULE_3_P2P" // Processor-to-Processor
  | "MODULE_4_P2C"; // Processor-to-Controller

export type VaultRecordStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "EXECUTED"
  | "EXPIRED"
  | "REVOKED";

export interface SccSignatory {
  role: "DATA_EXPORTER" | "DATA_IMPORTER";
  name: string;
  email: string;
  title: string;
  organization: string;
  countryIso: string;
  signedAtIso: string;
  ipAddress: string;
  signatureToken: string;
}

export interface SccAnnexMetadata {
  annexIDescriptionOfTransfer: boolean;
  annexIITechnicalSafeguards: boolean;
  annexIIISubProcessorList: boolean;
  dockingClauseIncluded: boolean;
}

export interface SccVaultRecord {
  vaultRecordId: string;
  agreementId: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  jurisdiction: SccJurisdiction;
  module: SccModule;
  governingLaw: string;
  competentSupervisoryAuthority: string;
  documentSha256: string;
  annexes: SccAnnexMetadata;
  signatories: {
    exporter?: SccSignatory;
    importer?: SccSignatory;
  };
  status: VaultRecordStatus;
  effectiveDateIso: string;
  expiryDateIso: string;
  archivedAtIso: string;
  cryptographicSeal: string;
  revocation?: {
    revokedAtIso: string;
    revokedBy: string;
    reason: string;
  };
}

export interface SccVerificationResult {
  isValid: boolean;
  vaultRecordId: string;
  status: VaultRecordStatus;
  signaturesComplete: boolean;
  sealVerified: boolean;
  errors: string[];
  warnings: string[];
}

export interface RegulatoryProofPackage {
  packageId: string;
  generatedAtIso: string;
  vaultRecordId: string;
  agreementId: string;
  jurisdiction: SccJurisdiction;
  module: SccModule;
  vendorName: string;
  governingLaw: string;
  documentSha256: string;
  cryptographicSeal: string;
  exporterSummary: string;
  importerSummary: string;
  complianceStatement: string;
}

/**
 * Computes SHA-256 hash for document or annex content.
 */
export function hashSccDocument(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Generates an immutable signature token for an SCC signatory.
 */
export function generateSccSignatoryToken(
  email: string,
  vaultRecordId: string,
  signedAtIso: string
): string {
  const seed = `${email.toLowerCase().trim()}|${vaultRecordId}|${signedAtIso}|SCC_VAULT_V1`;
  return "SIG-" + crypto.createHash("sha256").update(seed).digest("hex").slice(0, 20).toUpperCase();
}

/**
 * Computes the cryptographic tamper-evident seal for an entire vault record.
 */
export function computeVaultRecordSeal(
  vaultRecordId: string,
  agreementId: string,
  tenantId: string,
  vendorId: string,
  jurisdiction: SccJurisdiction,
  module: SccModule,
  documentSha256: string,
  effectiveDateIso: string,
  exporterToken?: string,
  importerToken?: string
): string {
  const payload = [
    vaultRecordId,
    agreementId,
    tenantId,
    vendorId,
    jurisdiction,
    module,
    documentSha256,
    effectiveDateIso,
    exporterToken || "NO_EXPORTER_SIG",
    importerToken || "NO_IMPORTER_SIG"
  ].join("::");

  return "VAULT-SEAL-" + crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Creates a new SCC Vault Record with multi-jurisdiction validation.
 */
export function createSccVaultRecord(params: {
  agreementId: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  jurisdiction: SccJurisdiction;
  module: SccModule;
  governingLaw: string;
  competentSupervisoryAuthority: string;
  rawDocumentContent: string;
  annexes?: Partial<SccAnnexMetadata>;
  effectiveDateIso: string;
  durationMonths?: number;
}): SccVaultRecord {
  const vaultRecordId = `SCC-VLT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const documentSha256 = hashSccDocument(params.rawDocumentContent);
  const now = new Date().toISOString();

  const effectiveDate = new Date(params.effectiveDateIso);
  const expiryDate = new Date(effectiveDate);
  expiryDate.setMonth(expiryDate.getMonth() + (params.durationMonths || 12));

  const completeAnnexes: SccAnnexMetadata = {
    annexIDescriptionOfTransfer: params.annexes?.annexIDescriptionOfTransfer ?? true,
    annexIITechnicalSafeguards: params.annexes?.annexIITechnicalSafeguards ?? true,
    annexIIISubProcessorList: params.annexes?.annexIIISubProcessorList ?? true,
    dockingClauseIncluded: params.annexes?.dockingClauseIncluded ?? true,
  };

  const initialSeal = computeVaultRecordSeal(
    vaultRecordId,
    params.agreementId,
    params.tenantId,
    params.vendorId,
    params.jurisdiction,
    params.module,
    documentSha256,
    params.effectiveDateIso
  );

  return {
    vaultRecordId,
    agreementId: params.agreementId,
    tenantId: params.tenantId,
    vendorId: params.vendorId,
    vendorName: params.vendorName,
    jurisdiction: params.jurisdiction,
    module: params.module,
    governingLaw: params.governingLaw,
    competentSupervisoryAuthority: params.competentSupervisoryAuthority,
    documentSha256,
    annexes: completeAnnexes,
    signatories: {},
    status: "DRAFT",
    effectiveDateIso: params.effectiveDateIso,
    expiryDateIso: expiryDate.toISOString(),
    archivedAtIso: now,
    cryptographicSeal: initialSeal
  };
}

/**
 * Registers an electronic signature into the SCC Vault Record and recalculates seal.
 */
export function signSccVaultRecord(
  record: SccVaultRecord,
  signatoryInput: {
    role: "DATA_EXPORTER" | "DATA_IMPORTER";
    name: string;
    email: string;
    title: string;
    organization: string;
    countryIso: string;
    ipAddress: string;
    signedAtIso?: string;
  }
): SccVaultRecord {
  if (record.status === "REVOKED") {
    throw new Error(`Cannot sign revoked SCC vault record ${record.vaultRecordId}`);
  }
  if (record.status === "EXPIRED") {
    throw new Error(`Cannot sign expired SCC vault record ${record.vaultRecordId}`);
  }

  const signedAtIso = signatoryInput.signedAtIso || new Date().toISOString();
  const signatureToken = generateSccSignatoryToken(
    signatoryInput.email,
    record.vaultRecordId,
    signedAtIso
  );

  const signatory: SccSignatory = {
    ...signatoryInput,
    signedAtIso,
    signatureToken
  };

  const updatedSignatories = { ...record.signatories };
  if (signatoryInput.role === "DATA_EXPORTER") {
    updatedSignatories.exporter = signatory;
  } else {
    updatedSignatories.importer = signatory;
  }

  const isFullySigned = Boolean(updatedSignatories.exporter && updatedSignatories.importer);
  const nextStatus: VaultRecordStatus = isFullySigned ? "EXECUTED" : "PENDING_SIGNATURE";

  const updatedSeal = computeVaultRecordSeal(
    record.vaultRecordId,
    record.agreementId,
    record.tenantId,
    record.vendorId,
    record.jurisdiction,
    record.module,
    record.documentSha256,
    record.effectiveDateIso,
    updatedSignatories.exporter?.signatureToken,
    updatedSignatories.importer?.signatureToken
  );

  return {
    ...record,
    signatories: updatedSignatories,
    status: nextStatus,
    cryptographicSeal: updatedSeal
  };
}

/**
 * Verifies cryptographic integrity, signature completeness, and lifecycle status of an SCC Vault Record.
 */
export function verifySccVaultRecord(record: SccVaultRecord, options?: { rawDocument?: string }): SccVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check document hash if raw text is provided
  if (options?.rawDocument) {
    const computedHash = hashSccDocument(options.rawDocument);
    if (computedHash !== record.documentSha256) {
      errors.push(`Document hash mismatch. Expected ${record.documentSha256}, calculated ${computedHash}`);
    }
  }

  // Check cryptographic seal
  const expectedSeal = computeVaultRecordSeal(
    record.vaultRecordId,
    record.agreementId,
    record.tenantId,
    record.vendorId,
    record.jurisdiction,
    record.module,
    record.documentSha256,
    record.effectiveDateIso,
    record.signatories.exporter?.signatureToken,
    record.signatories.importer?.signatureToken
  );

  const sealVerified = expectedSeal === record.cryptographicSeal;
  if (!sealVerified) {
    errors.push("Cryptographic vault seal verification failed: Record has been tampered with or corrupted");
  }

  // Check signatories
  const hasExporter = Boolean(record.signatories.exporter);
  const hasImporter = Boolean(record.signatories.importer);
  const signaturesComplete = hasExporter && hasImporter;

  if (!hasExporter) {
    warnings.push("Missing Data Exporter signature");
  }
  if (!hasImporter) {
    warnings.push("Missing Data Importer signature");
  }

  // Check signatory tokens
  if (record.signatories.exporter) {
    const exp = record.signatories.exporter;
    const expectedToken = generateSccSignatoryToken(exp.email, record.vaultRecordId, exp.signedAtIso);
    if (exp.signatureToken !== expectedToken) {
      errors.push("Data Exporter signature token is invalid or does not match email/vault binding");
    }
  }

  if (record.signatories.importer) {
    const imp = record.signatories.importer;
    const expectedToken = generateSccSignatoryToken(imp.email, record.vaultRecordId, imp.signedAtIso);
    if (imp.signatureToken !== expectedToken) {
      errors.push("Data Importer signature token is invalid or does not match email/vault binding");
    }
  }

  // Check Annex completeness
  if (!record.annexes.annexIDescriptionOfTransfer) {
    warnings.push("Annex I (Description of Transfer) is marked absent");
  }
  if (!record.annexes.annexIITechnicalSafeguards) {
    warnings.push("Annex II (Technical and Organisational Measures) is marked absent");
  }

  // Check expiration
  const now = new Date();
  const expiryDate = new Date(record.expiryDateIso);
  if (now > expiryDate && record.status !== "REVOKED") {
    warnings.push(`SCC agreement expired on ${record.expiryDateIso}`);
  }

  const isValid = errors.length === 0 && (record.status === "EXECUTED" || record.status === "PENDING_SIGNATURE" || record.status === "DRAFT");

  return {
    isValid,
    vaultRecordId: record.vaultRecordId,
    status: record.status,
    signaturesComplete,
    sealVerified,
    errors,
    warnings
  };
}

/**
 * Generates an official Regulatory Proof Package for Data Protection Authorities (DPAs / ICO / FDPIC).
 */
export function generateRegulatoryProofPackage(record: SccVaultRecord): RegulatoryProofPackage {
  const verification = verifySccVaultRecord(record);
  if (!verification.isValid || !verification.sealVerified) {
    throw new Error(`Cannot generate regulatory proof package for invalid or tampered record ${record.vaultRecordId}`);
  }

  const packageId = `REG-PROOF-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  const exporter = record.signatories.exporter;
  const importer = record.signatories.importer;

  const exporterSummary = exporter
    ? `${exporter.name} (${exporter.title}), ${exporter.organization} [${exporter.countryIso}] - Signed: ${exporter.signedAtIso} (Token: ${exporter.signatureToken})`
    : "NOT_SIGNED";

  const importerSummary = importer
    ? `${importer.name} (${importer.title}), ${importer.organization} [${importer.countryIso}] - Signed: ${importer.signedAtIso} (Token: ${exporter?.signatureToken ? importer.signatureToken : "PENDING"})`
    : "NOT_SIGNED";

  const complianceStatement =
    `This package serves as verifiable cryptographic proof of valid execution of Standard Contractual Clauses under ` +
    `${record.jurisdiction} (${record.module}), governed by the laws of ${record.governingLaw}, supervised by ${record.competentSupervisoryAuthority}. ` +
    `Document SHA-256 seal: ${record.cryptographicSeal}.`;

  return {
    packageId,
    generatedAtIso: now,
    vaultRecordId: record.vaultRecordId,
    agreementId: record.agreementId,
    jurisdiction: record.jurisdiction,
    module: record.module,
    vendorName: record.vendorName,
    governingLaw: record.governingLaw,
    documentSha256: record.documentSha256,
    cryptographicSeal: record.cryptographicSeal,
    exporterSummary,
    importerSummary,
    complianceStatement
  };
}
