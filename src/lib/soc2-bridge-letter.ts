/**
 * QA-124: Automated Vendor SOC 2 Bridge Letter & Gap Assessment Generator.
 * Evaluates audit period coverage gaps according to AICPA guidelines,
 * assesses material control environment changes, and synthesizes formal
 * executive Bridge Letters (Letters of Attestation) with cryptographic seals.
 */

import crypto from "crypto";

export type AuditStandard = "SOC_2_TYPE_II" | "SOC_1_TYPE_II" | "ISO_27001_ANNEX_A";

export type GapRiskLevel = "LOW_NORMAL" | "MODERATE_REVIEW" | "HIGH_EXTENDED_GAP" | "CRITICAL_EXPIRED";

export interface MaterialChangeAttestation {
  hasInfrastructureChanges: boolean;
  infrastructureChangeDetails?: string;
  hasKeyPersonnelTurnover: boolean;
  hasSecurityIncidentsInGapPeriod: boolean;
  incidentDetails?: string;
  hasSubProcessorChanges: boolean;
  managementStatement: string;
}

export interface BridgeLetterInput {
  vendorId: string;
  vendorName: string;
  auditStandard: AuditStandard;
  auditorFirmName: string;
  priorReportEndDateIso: string;
  newAuditTargetDateIso: string;
  letterIssuedDateIso: string;
  signatory: {
    name: string;
    title: string;
    email: string;
    organization: string;
  };
  materialChanges: MaterialChangeAttestation;
}

export interface GapAssessmentResult {
  gapDays: number;
  riskLevel: GapRiskLevel;
  acceptableUnderAicpa: boolean;
  requiresCompensatingControls: boolean;
  findings: string[];
  recommendations: string[];
}

export interface GeneratedBridgeLetter {
  letterId: string;
  vendorId: string;
  vendorName: string;
  auditStandard: AuditStandard;
  priorReportEndDateIso: string;
  newAuditTargetDateIso: string;
  gapDays: number;
  riskLevel: GapRiskLevel;
  letterMarkdown: string;
  cryptographicSeal: string;
  generatedAtIso: string;
}

/**
 * Calculates the number of calendar days between prior audit end date and current letter issue date.
 */
export function calculateGapDays(priorEndDateIso: string, issuedDateIso: string): number {
  const start = new Date(priorEndDateIso);
  const end = new Date(issuedDateIso);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Assesses gap duration and material change disclosures under AICPA standards.
 */
export function assessAuditGap(
  priorEndDateIso: string,
  issuedDateIso: string,
  materialChanges: MaterialChangeAttestation
): GapAssessmentResult {
  const gapDays = calculateGapDays(priorEndDateIso, issuedDateIso);
  const findings: string[] = [];
  const recommendations: string[] = [];

  let riskLevel: GapRiskLevel = "LOW_NORMAL";
  let acceptableUnderAicpa = true;
  let requiresCompensatingControls = false;

  // AICPA typically considers bridge letters acceptable up to 90 days (occasionally up to 120 days).
  if (gapDays <= 30) {
    riskLevel = "LOW_NORMAL";
    findings.push(`Gap of ${gapDays} days is within standard post-audit reporting close window (<= 30 days).`);
  } else if (gapDays <= 90) {
    riskLevel = "MODERATE_REVIEW";
    findings.push(`Gap of ${gapDays} days is acceptable under AICPA 90-day guideline, but requires scrutiny.`);
    recommendations.push("Verify target issuance date for new Type II report.");
  } else if (gapDays <= 120) {
    riskLevel = "HIGH_EXTENDED_GAP";
    requiresCompensatingControls = true;
    findings.push(`Gap of ${gapDays} days exceeds standard 90-day window. Extended gap risk.`);
    recommendations.push("Require updated interim security questionnaire and recent penetration test report.");
  } else {
    riskLevel = "CRITICAL_EXPIRED";
    acceptableUnderAicpa = false;
    requiresCompensatingControls = true;
    findings.push(`Gap of ${gapDays} days is unacceptable under AICPA rules (> 120 days). Report is considered stale.`);
    recommendations.push("Escalate to CISO. Halt new tenant onboarding until current Type II report is issued.");
  }

  // Material change impact
  if (materialChanges.hasSecurityIncidentsInGapPeriod) {
    riskLevel = "CRITICAL_EXPIRED";
    findings.push("Unresolved security incident occurred during the gap period.");
    recommendations.push("Request comprehensive incident RCA and remediation attestation.");
  }

  if (materialChanges.hasInfrastructureChanges) {
    requiresCompensatingControls = true;
    findings.push("Material infrastructure changes were deployed during the audit gap period.");
  }

  return {
    gapDays,
    riskLevel,
    acceptableUnderAicpa,
    requiresCompensatingControls,
    findings,
    recommendations
  };
}

/**
 * Computes a SHA-256 cryptographic seal for the bridge letter.
 */
export function computeBridgeLetterSeal(
  vendorId: string,
  gapDays: number,
  priorEndDateIso: string,
  signatoryEmail: string,
  managementStatement: string
): string {
  const payload = [
    vendorId,
    gapDays,
    priorEndDateIso,
    signatoryEmail.toLowerCase().trim(),
    managementStatement
  ].join("::");
  return "BRIDGE-SEAL-" + crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Generates an AICPA-compliant formal SOC 2 Bridge Letter package.
 */
export function generateBridgeLetter(input: BridgeLetterInput): GeneratedBridgeLetter {
  const gapAssessment = assessAuditGap(
    input.priorReportEndDateIso,
    input.letterIssuedDateIso,
    input.materialChanges
  );

  const letterId = `BRG-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  const seal = computeBridgeLetterSeal(
    input.vendorId,
    gapAssessment.gapDays,
    input.priorReportEndDateIso,
    input.signatory.email,
    input.materialChanges.managementStatement
  );

  const lines = [
    `# 📜 Letter of Attestation (Bridge Letter) - ${input.auditStandard}`,
    "",
    `**Letter Reference ID:** \`${letterId}\`  `,
    `**Date of Issuance:** \`${input.letterIssuedDateIso}\`  `,
    `**Vendor:** **${input.vendorName}** (\`${input.vendorId}\`)  `,
    `**Independent Auditor:** ${input.auditorFirmName}  `,
    `**Prior Audit Coverage Period End:** \`${input.priorReportEndDateIso}\`  `,
    `**Target New Report Date:** \`${input.newAuditTargetDateIso}\`  `,
    `**Gap Duration:** **${gapAssessment.gapDays} calendar days** (Risk Assessment: \`${gapAssessment.riskLevel}\`)  `,
    "",
    "---",
    "",
    "## 1. Scope & Purpose",
    `This letter provides attestation to customers, user entities, and their independent auditors regarding the internal control environment of **${input.vendorName}** during the interim period from **${input.priorReportEndDateIso}** through **${input.letterIssuedDateIso}** (the "Gap Period").`,
    "",
    "## 2. Management Representation on Internal Controls",
    `As of the date of this letter, management of **${input.vendorName}** confirms and represents that:`,
    "1. **Control Environment Continuity:** The internal control policies, procedures, and systems evaluated in the prior report have remained in continuous operation without material degradation.",
    `2. **Material Changes:** ${input.materialChanges.hasInfrastructureChanges ? `Material infrastructure updates were deployed as noted: ${input.materialChanges.infrastructureChangeDetails}` : "No material changes have occurred in the technical architecture or internal control structure that would adversely affect the suitability of design or operating effectiveness of controls."}`,
    `3. **Security Incidents:** ${input.materialChanges.hasSecurityIncidentsInGapPeriod ? `Incident reported: ${input.materialChanges.incidentDetails}` : "No security, availability, or confidentiality incidents occurred during the gap period that would compromise customer data or systems."}`,
    "",
    "## 3. Executive Signatory Representation",
    `**Signed by:**  `,
    `**${input.signatory.name}**  `,
    `${input.signatory.title}, ${input.signatory.organization}  `,
    `Email: \`${input.signatory.email}\`  `,
    "",
    "---",
    `**Cryptographic Verification Seal:** \`${seal}\`  `,
    `*Generated via VendorShield Trust Hub. Tamper-evident verification.*`
  ];

  return {
    letterId,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    auditStandard: input.auditStandard,
    priorReportEndDateIso: input.priorReportEndDateIso,
    newAuditTargetDateIso: input.newAuditTargetDateIso,
    gapDays: gapAssessment.gapDays,
    riskLevel: gapAssessment.riskLevel,
    letterMarkdown: lines.join("\n"),
    cryptographicSeal: seal,
    generatedAtIso: now
  };
}
