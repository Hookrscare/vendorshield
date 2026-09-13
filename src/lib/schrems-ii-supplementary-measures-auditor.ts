/**
 * QA-163: Automated B2B Sub-Processor Cross-Border Schrems II Supplementary Measures Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Verifies European Data Protection Board (EDPB) 01/2020 Recommendations on Supplementary Measures
 * for cross-border data transfers to third countries (e.g. US Cloud Providers under FISA 702 / CLOUD Act).
 * Assesses:
 * 1. Technical measures (End-to-end encryption with keys retained exclusively in EU/EEA)
 * 2. Contractual measures (Mandatory government access notification & legal challenge commitment)
 * 3. Organizational measures (Strict internal access policies, transparency reporting, minimization)
 */

import { createHash } from "crypto";

export interface TechnicalSafeguards {
  isEncryptionAtRestEnabled: boolean;
  isEncryptionInTransitEnabled: boolean;
  areEncryptionKeysHeldInEu: boolean;
  isZeroKnowledgeArchitecture: boolean;
}

export interface ContractualSafeguards {
  hasStandardContractualClausesModule2or3: boolean;
  hasGovernmentSubpoenaChallengeClause: boolean;
  hasPromptCustomerNotificationWarranty: boolean;
  hasAuditRightsGranted: boolean;
}

export interface OrganizationalSafeguards {
  hasRegularTransparencyReports: boolean;
  hasDocumentedInternalDataMinimizationPolicy: boolean;
  hasDesignatedEuDataProtectionOfficer: boolean;
}

export interface SubProcessorSchremsAuditRequest {
  subProcessorId: string;
  vendorName: string;
  countryOfIncorporation: string;
  destinationDataCenterCountry: string;
  transfersPersonalData: boolean;
  technical: TechnicalSafeguards;
  contractual: ContractualSafeguards;
  organizational: OrganizationalSafeguards;
}

export interface SchremsAuditVerdict {
  subProcessorId: string;
  vendorName: string;
  isCompliant: boolean;
  verdictStatus: "SCHREMS_II_COMPLIANT" | "SUPPLEMENTARY_MEASURES_DEFICIENT" | "HIGH_RISK_THIRD_COUNTRY_EXPOSURE";
  technicalComplianceScore: number;
  contractualComplianceScore: number;
  organizationalComplianceScore: number;
  compositeScore: number;
  identifiedGaps: string[];
  sha256CertificateHash: string;
  auditedAt: string;
}

export class SchremsIiSupplementaryMeasuresAuditor {
  private static readonly EU_EEA_COUNTRIES = new Set([
    "DE", "FR", "IE", "NL", "BE", "LU", "ES", "IT", "PT", "SE", "FI", "DK", "AT", "PL"
  ]);

  public static auditSubProcessor(request: SubProcessorSchremsAuditRequest): SchremsAuditVerdict {
    const gaps: string[] = [];

    // Technical Score (40% weight)
    let techPoints = 0;
    if (request.technical.isEncryptionAtRestEnabled) techPoints += 10;
    else gaps.push("Missing encryption at rest");

    if (request.technical.isEncryptionInTransitEnabled) techPoints += 10;
    else gaps.push("Missing TLS 1.3 encryption in transit");

    if (request.technical.areEncryptionKeysHeldInEu) techPoints += 15;
    else gaps.push("KMS encryption keys are not exclusively sovereign to the EU/EEA");

    if (request.technical.isZeroKnowledgeArchitecture) techPoints += 5;

    // Contractual Score (35% weight)
    let contractPoints = 0;
    if (request.contractual.hasStandardContractualClausesModule2or3) contractPoints += 15;
    else gaps.push("Missing executed standard contractual clauses (SCC 2021/914)");

    if (request.contractual.hasGovernmentSubpoenaChallengeClause) contractPoints += 10;
    else gaps.push("Missing explicit legal obligation to challenge extraterritorial surveillance orders");

    if (request.contractual.hasPromptCustomerNotificationWarranty) contractPoints += 5;
    if (request.contractual.hasAuditRightsGranted) contractPoints += 5;

    // Organizational Score (25% weight)
    let orgPoints = 0;
    if (request.organizational.hasRegularTransparencyReports) orgPoints += 10;
    if (request.organizational.hasDocumentedInternalDataMinimizationPolicy) orgPoints += 10;
    if (request.organizational.hasDesignatedEuDataProtectionOfficer) orgPoints += 5;

    const compositeScore = Math.round(techPoints + contractPoints + orgPoints);
    const isDestinationEu = this.EU_EEA_COUNTRIES.has(request.destinationDataCenterCountry);

    let verdictStatus: SchremsAuditVerdict["verdictStatus"];
    if (isDestinationEu || (compositeScore >= 80 && request.technical.areEncryptionKeysHeldInEu)) {
      verdictStatus = "SCHREMS_II_COMPLIANT";
    } else if (compositeScore < 50 || !request.contractual.hasStandardContractualClausesModule2or3) {
      verdictStatus = "HIGH_RISK_THIRD_COUNTRY_EXPOSURE";
    } else {
      verdictStatus = "SUPPLEMENTARY_MEASURES_DEFICIENT";
    }

    const auditedAt = new Date().toISOString();
    const rawCertificate = `${request.subProcessorId}:${request.vendorName}:${verdictStatus}:${compositeScore}:${auditedAt}`;
    const sha256CertificateHash = createHash("sha256").update(rawCertificate).digest("hex");

    return {
      subProcessorId: request.subProcessorId,
      vendorName: request.vendorName,
      isCompliant: verdictStatus === "SCHREMS_II_COMPLIANT",
      verdictStatus,
      technicalComplianceScore: techPoints,
      contractualComplianceScore: contractPoints,
      organizationalComplianceScore: orgPoints,
      compositeScore,
      identifiedGaps: gaps,
      sha256CertificateHash,
      auditedAt
    };
  }
}
