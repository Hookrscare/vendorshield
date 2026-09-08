/**
 * QA-129: Multi-Cloud Sub-Processor Data Residency & Regional Transfer Guardrail Validator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Evaluates multi-cloud vendor data centers across jurisdictions, validates cross-border
 * transfer compliance (GDPR Chapter V, EU-US DPF, Schrems II, UK GDPR), and generates
 * tamper-evident cryptographic compliance digests.
 */

import { createHash } from "crypto";

export type CloudProvider = "AWS" | "GCP" | "AZURE" | "CLOUDFLARE" | "ORACLE" | "ON_PREM";

export type ResidencyJurisdiction = "EU_EEA" | "US" | "UK" | "APAC" | "CANADA" | "OTHER";

export type TransferComplianceStatus =
  | "COMPLIANT_DOMESTIC"
  | "COMPLIANT_ADEQUACY_DECISION"
  | "COMPLIANT_SCC_REQUIRED"
  | "UNAUTHORIZED_TRANSFER_RESTRICTION"
  | "CRITICAL_NON_COMPLIANT";

export interface DataResidencyPolicy {
  policyId: string;
  allowedJurisdictions: ResidencyJurisdiction[];
  allowTransfersOutsideEU: boolean;
  requireSccIfTransferred: boolean;
  blockHighRiskThirdCountries: boolean;
}

export interface SubProcessorLocation {
  vendorId: string;
  vendorName: string;
  cloudProvider: CloudProvider;
  regionCode: string;
  jurisdiction: ResidencyJurisdiction;
  hasStandardContractualClauses: boolean;
  hasDataTransferImpactAssessment: boolean;
  certifiedEuUsDataPrivacyFramework: boolean;
}

export interface ResidencyValidationResult {
  vendorId: string;
  vendorName: string;
  regionCode: string;
  cloudProvider: CloudProvider;
  jurisdiction: ResidencyJurisdiction;
  status: TransferComplianceStatus;
  isCompliant: boolean;
  violationReasons: string[];
  remediationGuidance?: string;
}

export interface DataResidencyAuditReport {
  evaluatedAtIso: string;
  policyId: string;
  totalSubProcessors: number;
  compliantCount: number;
  violationsCount: number;
  results: ResidencyValidationResult[];
  complianceDigestSha256: string;
}

export class DataResidencyValidator {
  /**
   * Validates a sub-processor deployment against an organization's Data Residency Policy.
   */
  public static validateLocation(
    loc: SubProcessorLocation,
    policy: DataResidencyPolicy
  ): ResidencyValidationResult {
    const reasons: string[] = [];
    let status: TransferComplianceStatus = "COMPLIANT_DOMESTIC";

    // 1. Direct Jurisdiction Allowance Check
    if (!policy.allowedJurisdictions.includes(loc.jurisdiction)) {
      reasons.push(`Jurisdiction '${loc.jurisdiction}' is not included in policy allowed jurisdictions.`);
      status = "UNAUTHORIZED_TRANSFER_RESTRICTION";
    } else if (loc.jurisdiction !== "EU_EEA" && !policy.allowTransfersOutsideEU) {
      reasons.push(`Policy strictly forbids transferring data outside the EU/EEA.`);
      status = "CRITICAL_NON_COMPLIANT";
    } else if (loc.jurisdiction === "EU_EEA") {
      status = "COMPLIANT_DOMESTIC";
    } else if (loc.jurisdiction === "US") {
      if (loc.certifiedEuUsDataPrivacyFramework) {
        status = "COMPLIANT_ADEQUACY_DECISION";
      } else if (loc.hasStandardContractualClauses && loc.hasDataTransferImpactAssessment) {
        status = "COMPLIANT_SCC_REQUIRED";
      } else {
        reasons.push("Transfer to US lacks both EU-US DPF certification and active SCC + TIA coverage.");
        status = "CRITICAL_NON_COMPLIANT";
      }
    } else if (policy.requireSccIfTransferred && !loc.hasStandardContractualClauses) {
      reasons.push("Cross-border transfer missing required Standard Contractual Clauses (SCC).");
      status = "CRITICAL_NON_COMPLIANT";
    } else {
      status = loc.hasStandardContractualClauses ? "COMPLIANT_SCC_REQUIRED" : "COMPLIANT_DOMESTIC";
    }

    const isCompliant = reasons.length === 0 && status !== "CRITICAL_NON_COMPLIANT" && status !== "UNAUTHORIZED_TRANSFER_RESTRICTION";

    let remediation: string | undefined;
    if (!isCompliant) {
      if (reasons.some(r => r.includes("SCC") || r.includes("DPF"))) {
        remediation = "Execute Standard Contractual Clauses (Module 2/3) and conduct a Transfer Impact Assessment.";
      } else if (reasons.some(r => r.includes("forbids transferring"))) {
        remediation = "Migrate sub-processor data storage to an EU sovereign cloud region (e.g. eu-central-1 / europe-west3).";
      } else {
        remediation = "Review vendor regional routing and reconfigure VPC data boundary guardrails.";
      }
    }

    return {
      vendorId: loc.vendorId,
      vendorName: loc.vendorName,
      regionCode: loc.regionCode,
      cloudProvider: loc.cloudProvider,
      jurisdiction: loc.jurisdiction,
      status,
      isCompliant,
      violationReasons: reasons,
      remediationGuidance: remediation
    };
  }

  /**
   * Evaluates all sub-processors and compiles a cryptographic compliance audit report.
   */
  public static generateAuditReport(
    processors: SubProcessorLocation[],
    policy: DataResidencyPolicy
  ): DataResidencyAuditReport {
    const results = processors.map(p => this.validateLocation(p, policy));
    const violationsCount = results.filter(r => !r.isCompliant).length;
    const compliantCount = results.length - violationsCount;
    const evaluatedAtIso = new Date().toISOString();

    const digestPayload = JSON.stringify({
      evaluatedAtIso,
      policyId: policy.policyId,
      results: results.map(r => ({ id: r.vendorId, status: r.status, ok: r.isCompliant }))
    });

    const complianceDigestSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      evaluatedAtIso,
      policyId: policy.policyId,
      totalSubProcessors: processors.length,
      compliantCount,
      violationsCount,
      results,
      complianceDigestSha256
    };
  }
}
