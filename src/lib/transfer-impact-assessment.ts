/**
 * QA-119: Automated GDPR Standard Contractual Clauses (SCC) Module 2/3 Transfer Impact Assessment Engine.
 * Evaluates international data transfers under GDPR Chapter V (Articles 44-49) and Schrems II.
 * Assesses destination jurisdiction surveillance risk, supplementary technical/contractual measures,
 * and generates required SCC Annexes (I, II, III).
 */

export type SCCModule =
  | "MODULE_1_C2C" // Controller-to-Controller
  | "MODULE_2_C2P" // Controller-to-Processor
  | "MODULE_3_P2P" // Processor-to-Processor
  | "MODULE_4_P2C"; // Processor-to-Controller

export type DataSensitivityLevel =
  | "PUBLIC_OR_AGGREGATE"
  | "STANDARD_BUSINESS_CONTACT"
  | "CONFIDENTIAL_CUSTOMER_PII"
  | "SPECIAL_CATEGORY_ART_9"; // Biometric, health, genetic, racial/ethnic, sexual orientation

export type DestinationJurisdiction =
  | "EEA_INTERNAL"
  | "ADEQUATE_COUNTRY" // UK, Switzerland, Japan, New Zealand, Israel, Canada (commercial)
  | "US_DPF_CERTIFIED" // EU-US Data Privacy Framework certified
  | "US_NON_DPF" // US entity subject to FISA 702 / EO 12333 without DPF adequacy
  | "THIRD_COUNTRY_MODERATE_RISK" // India, Brazil, Singapore, etc.
  | "THIRD_COUNTRY_HIGH_SURVEILLANCE"; // China, Russia, jurisdictions with unbounded government access

export type TransferEligibility =
  | "PERMITTED_ADEQUACY"
  | "PERMITTED_SCC_WITH_SAFEGUARDS"
  | "REQUIRES_ENHANCED_MEASURES"
  | "PROHIBITED_HIGH_RISK";

export interface TechnicalSafeguards {
  encryptionInTransitTls13: boolean;
  encryptionAtRestAes256: boolean;
  keysHeldExclusivelyInEea: boolean;
  pseudonymizationPriorToTransfer: boolean;
  zeroKnowledgeOrClientSideEncryption: boolean;
}

export interface ContractualSafeguards {
  clause14LawfulAccessNotification: boolean;
  challengeUnlawfulGovtRequests: boolean;
  transparencyReportsPublished: boolean;
  annualThirdPartyAuditRights: boolean;
  subProcessorPriorNoticeDays: number;
}

export interface TIAAssessmentInput {
  assessmentId: string;
  vendorId: string;
  vendorName: string;
  module: SCCModule;
  destinationCountryIso: string;
  isEuUsDpfCertified?: boolean;
  sensitivityLevel: DataSensitivityLevel;
  estimatedDataSubjectCount: number;
  technicalSafeguards: TechnicalSafeguards;
  contractualSafeguards: ContractualSafeguards;
  dataCategoriesTransferred: string[];
}

export interface TIAResult {
  assessmentId: string;
  vendorId: string;
  vendorName: string;
  module: SCCModule;
  jurisdiction: DestinationJurisdiction;
  surveillanceRiskScore: number; // 0 (none/adequate) to 50
  sensitivityRiskScore: number; // 0 to 30
  mitigationCreditScore: number; // 0 to 45 (reduces risk)
  netRiskScore: number; // 0 to 100
  riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  eligibility: TransferEligibility;
  findings: string[];
  mandatoryRemediations: string[];
  requiredAnnexes: ("ANNEX_I_PARTIES" | "ANNEX_II_TOMS" | "ANNEX_III_SUBPROCESSORS")[];
  assessedAtIso: string;
}

export interface SCCAnnexPackage {
  assessmentId: string;
  module: SCCModule;
  annexI: {
    dataExporter: string;
    dataImporter: string;
    descriptionOfTransfer: string;
    categoriesOfSubjects: string;
    categoriesOfData: string[];
    frequencyOfTransfer: string;
  };
  annexII: {
    technicalMeasures: string[];
    contractualMeasures: string[];
  };
  annexIII?: {
    subProcessorsAuthorized: string[];
    advanceNoticeDays: number;
  };
}

export interface TIARosterSummary {
  totalAssessments: number;
  permittedCount: number;
  requiresEnhancedCount: number;
  prohibitedCount: number;
  criticalVendors: string[];
  assessments: TIAResult[];
}

const ADEQUATE_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", // EEA
  "GB", "CH", "JP", "NZ", "IL", "CA", "AR", "UY", "AD", "FO", "GG", "JE", "IM" // Approved adequacy decisions
]);

const HIGH_SURVEILLANCE_COUNTRIES = new Set(["CN", "RU", "BY", "IR", "KP"]);

export function resolveJurisdiction(countryIso: string, isDpfCertified: boolean = false): DestinationJurisdiction {
  const code = countryIso.trim().toUpperCase();
  if (["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"].includes(code)) {
    return "EEA_INTERNAL";
  }
  if (ADEQUATE_COUNTRIES.has(code)) {
    return "ADEQUATE_COUNTRY";
  }
  if (code === "US") {
    return isDpfCertified ? "US_DPF_CERTIFIED" : "US_NON_DPF";
  }
  if (HIGH_SURVEILLANCE_COUNTRIES.has(code)) {
    return "THIRD_COUNTRY_HIGH_SURVEILLANCE";
  }
  return "THIRD_COUNTRY_MODERATE_RISK";
}

export function evaluateTransferImpactAssessment(input: TIAAssessmentInput): TIAResult {
  const jurisdiction = resolveJurisdiction(input.destinationCountryIso, input.isEuUsDpfCertified);
  const findings: string[] = [];
  const mandatoryRemediations: string[] = [];

  // 1. Surveillance Risk (0 - 50)
  let surveillanceRisk = 0;
  switch (jurisdiction) {
    case "EEA_INTERNAL":
      surveillanceRisk = 0;
      findings.push("Transfer remains within EEA territory; no Chapter V transfer restriction applies.");
      break;
    case "ADEQUATE_COUNTRY":
      surveillanceRisk = 5;
      findings.push("Country benefits from European Commission Adequacy Decision (GDPR Art. 45).");
      break;
    case "US_DPF_CERTIFIED":
      surveillanceRisk = 12;
      findings.push("Recipient is verified under EU-US Data Privacy Framework (Adequacy Decision 2023/1795).");
      break;
    case "US_NON_DPF":
      surveillanceRisk = 38;
      findings.push("Recipient in US without DPF certification: FISA Section 702 and Executive Order 12333 apply.");
      break;
    case "THIRD_COUNTRY_MODERATE_RISK":
      surveillanceRisk = 30;
      findings.push(`Third country (${input.destinationCountryIso}) lacks adequacy decision; Schrems II TIA required.`);
      break;
    case "THIRD_COUNTRY_HIGH_SURVEILLANCE":
      surveillanceRisk = 50;
      findings.push(`Destination jurisdiction (${input.destinationCountryIso}) has statutory surveillance without judicial redress.`);
      break;
  }

  // 2. Data Sensitivity Risk (0 - 30)
  let sensitivityRisk = 0;
  switch (input.sensitivityLevel) {
    case "PUBLIC_OR_AGGREGATE":
      sensitivityRisk = 0;
      break;
    case "STANDARD_BUSINESS_CONTACT":
      sensitivityRisk = 8;
      break;
    case "CONFIDENTIAL_CUSTOMER_PII":
      sensitivityRisk = 20;
      break;
    case "SPECIAL_CATEGORY_ART_9":
      sensitivityRisk = 30;
      findings.push("Transfer includes Article 9 Special Category personal data; strict proportionality required.");
      break;
  }

  // Volume multiplier for large scale transfers
  if (input.estimatedDataSubjectCount > 50000) {
    sensitivityRisk = Math.min(30, sensitivityRisk + 5);
    findings.push(`Large-scale processing flag (>50k data subjects: ${input.estimatedDataSubjectCount.toLocaleString()}).`);
  }

  // 3. Technical Safeguards Mitigation (up to 28 pts)
  let technicalCredit = 0;
  const tech = input.technicalSafeguards;
  if (tech.encryptionInTransitTls13) technicalCredit += 5;
  else mandatoryRemediations.push("Mandate TLS 1.3 encryption for all data in transit across public networks.");

  if (tech.encryptionAtRestAes256) technicalCredit += 5;
  else mandatoryRemediations.push("Enforce AES-256 encryption at rest for all destination databases and volumes.");

  if (tech.keysHeldExclusivelyInEea) {
    technicalCredit += 10;
    findings.push("Encryption keys held exclusively within EEA under customer control (EDPB Schrems II Use Case 1).");
  } else if (jurisdiction === "US_NON_DPF" || jurisdiction === "THIRD_COUNTRY_HIGH_SURVEILLANCE") {
    mandatoryRemediations.push("Implement BYOK (Bring Your Own Key) or EEA-managed HSM to prevent unredacted surveillance subpoena access.");
  }

  if (tech.pseudonymizationPriorToTransfer) technicalCredit += 5;
  if (tech.zeroKnowledgeOrClientSideEncryption) technicalCredit += 5;

  // 4. Contractual Safeguards Mitigation (up to 17 pts)
  let contractualCredit = 0;
  const contract = input.contractualSafeguards;
  if (contract.clause14LawfulAccessNotification) contractualCredit += 4;
  else mandatoryRemediations.push("Execute SCC Clause 14 warrant / governmental request notification covenant.");

  if (contract.challengeUnlawfulGovtRequests) contractualCredit += 4;
  if (contract.transparencyReportsPublished) contractualCredit += 3;
  if (contract.annualThirdPartyAuditRights) contractualCredit += 4;
  if (contract.subProcessorPriorNoticeDays >= 14) contractualCredit += 2;
  else if (input.module === "MODULE_2_C2P" || input.module === "MODULE_3_P2P") {
    mandatoryRemediations.push("Specify at least 14 days advance written notice prior to engaging new sub-processors.");
  }

  const totalCredit = technicalCredit + contractualCredit;
  const rawRisk = (surveillanceRisk + sensitivityRisk) - (totalCredit * 0.75);
  const netRiskScore = Math.max(0, Math.min(100, Math.round(rawRisk)));

  let riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (netRiskScore <= 20) riskTier = "LOW";
  else if (netRiskScore <= 45) riskTier = "MEDIUM";
  else if (netRiskScore <= 70) riskTier = "HIGH";
  else riskTier = "CRITICAL";

  let eligibility: TransferEligibility;
  if (jurisdiction === "EEA_INTERNAL" || jurisdiction === "ADEQUATE_COUNTRY" || jurisdiction === "US_DPF_CERTIFIED") {
    eligibility = "PERMITTED_ADEQUACY";
  } else if (jurisdiction === "THIRD_COUNTRY_HIGH_SURVEILLANCE" && !tech.zeroKnowledgeOrClientSideEncryption && !tech.keysHeldExclusivelyInEea) {
    eligibility = "PROHIBITED_HIGH_RISK";
    mandatoryRemediations.push("Transfer prohibited: recipient country surveillance laws cannot be remedied by contractual clauses alone without end-to-end client-side encryption.");
  } else if (netRiskScore > 65) {
    eligibility = "REQUIRES_ENHANCED_MEASURES";
  } else {
    eligibility = "PERMITTED_SCC_WITH_SAFEGUARDS";
  }

  const requiredAnnexes: ("ANNEX_I_PARTIES" | "ANNEX_II_TOMS" | "ANNEX_III_SUBPROCESSORS")[] = [
    "ANNEX_I_PARTIES",
    "ANNEX_II_TOMS"
  ];
  if (input.module === "MODULE_2_C2P" || input.module === "MODULE_3_P2P") {
    requiredAnnexes.push("ANNEX_III_SUBPROCESSORS");
  }

  return {
    assessmentId: input.assessmentId,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    module: input.module,
    jurisdiction,
    surveillanceRiskScore: surveillanceRisk,
    sensitivityRiskScore: sensitivityRisk,
    mitigationCreditScore: Math.round(totalCredit * 0.75),
    netRiskScore,
    riskTier,
    eligibility,
    findings,
    mandatoryRemediations,
    requiredAnnexes,
    assessedAtIso: new Date().toISOString()
  };
}

export function generateSCCAnnexSpecification(
  input: TIAAssessmentInput,
  result: TIAResult,
  exporterEntity: string = "VendorShield Operations Inc. (EEA)"
): SCCAnnexPackage {
  const toms: string[] = [];
  if (input.technicalSafeguards.encryptionInTransitTls13) toms.push("TLS 1.3 in-transit cipher negotiation");
  if (input.technicalSafeguards.encryptionAtRestAes256) toms.push("AES-256 envelope volume encryption");
  if (input.technicalSafeguards.keysHeldExclusivelyInEea) toms.push("EEA-resident HSM KMS key custody");
  if (input.technicalSafeguards.pseudonymizationPriorToTransfer) toms.push("Cryptographic SHA-256 data pseudonymization prior to egress");

  const contractual: string[] = [];
  if (input.contractualSafeguards.clause14LawfulAccessNotification) contractual.push("Clause 14 prompt government access notification");
  if (input.contractualSafeguards.challengeUnlawfulGovtRequests) contractual.push("Obligation to exhaust all legal remedies against unlawful disclosure");
  if (input.contractualSafeguards.annualThirdPartyAuditRights) contractual.push("Annual independent SOC 2 Type II or ISO 27001 auditor verification");

  const pkg: SCCAnnexPackage = {
    assessmentId: input.assessmentId,
    module: input.module,
    annexI: {
      dataExporter: exporterEntity,
      dataImporter: `${input.vendorName} (${input.destinationCountryIso})`,
      descriptionOfTransfer: `Continuous SaaS data processing in support of ${input.dataCategoriesTransferred.join(", ")}`,
      categoriesOfSubjects: `Customers, authorized users, and enterprise employees (~${input.estimatedDataSubjectCount.toLocaleString()})`,
      categoriesOfData: input.dataCategoriesTransferred,
      frequencyOfTransfer: "Continuous automated synchronization over secure API"
    },
    annexII: {
      technicalMeasures: toms,
      contractualMeasures: contractual
    }
  };

  if (result.requiredAnnexes.includes("ANNEX_III_SUBPROCESSORS")) {
    pkg.annexIII = {
      subProcessorsAuthorized: ["AWS Infrastructure (us-east-1)", "Cloudflare Inc."],
      advanceNoticeDays: input.contractualSafeguards.subProcessorPriorNoticeDays || 30
    };
  }

  return pkg;
}

export function batchEvaluateTIARoster(assessments: TIAAssessmentInput[]): TIARosterSummary {
  const results = assessments.map(a => evaluateTransferImpactAssessment(a));
  let permitted = 0;
  let requiresEnhanced = 0;
  let prohibited = 0;
  const critical: string[] = [];

  for (const r of results) {
    if (r.eligibility === "PERMITTED_ADEQUACY" || r.eligibility === "PERMITTED_SCC_WITH_SAFEGUARDS") {
      permitted++;
    } else if (r.eligibility === "REQUIRES_ENHANCED_MEASURES") {
      requiresEnhanced++;
    } else {
      prohibited++;
    }

    if (r.riskTier === "CRITICAL" || r.eligibility === "PROHIBITED_HIGH_RISK") {
      critical.push(r.vendorName);
    }
  }

  return {
    totalAssessments: results.length,
    permittedCount: permitted,
    requiresEnhancedCount: requiresEnhanced,
    prohibitedCount: prohibited,
    criticalVendors: critical,
    assessments: results
  };
}
