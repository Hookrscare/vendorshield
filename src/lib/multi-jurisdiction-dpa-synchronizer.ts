/**
 * QA-185: Multi-Jurisdiction Cross-Border Data Sovereign Transfer Risk Assessor & DPA Synchronizer.
 * Part of VendorShield Enterprise B2B SOC 2, GDPR & Cross-Border Sovereign Compliance Suite.
 *
 * Evaluates third-party vendor Data Processing Agreements (DPAs) across multiple sovereign data protection
 * regimes (EU GDPR, UK GDPR, Swiss FADP, CPRA, PIPEDA, APPI, Singapore PDPA). Verifies presence of
 * required transfer safeguards (SCC Modules 1-4, UK IDTA/Addendum, Swiss Rider), Schrems II TOMs,
 * and Article 28 mandatory clauses. Computes sovereign risk index and generates automated legal amendment riders.
 */

import { createHash } from "crypto";

export type SovereignJurisdiction =
  | "EU_GDPR"
  | "UK_GDPR"
  | "SWISS_FADP"
  | "US_CALIFORNIA_CPRA"
  | "CANADA_PIPEDA"
  | "JAPAN_APPI"
  | "SINGAPORE_PDPA";

export type SccModule =
  | "MODULE_1_CONTROLLER_TO_CONTROLLER"
  | "MODULE_2_CONTROLLER_TO_PROCESSOR"
  | "MODULE_3_PROCESSOR_TO_PROCESSOR"
  | "MODULE_4_PROCESSOR_TO_CONTROLLER";

export interface TechnicalOrganizationalMeasures {
  endToEndEncryptionInTransit: boolean;
  encryptionAtRestWithCustomerKey: boolean; // HYOK/BYOK
  foreignGovernmentSubpoenaNotificationCommitment: boolean;
  pseudonymizationEnabled: boolean;
  independentAnnualSoc2OrIso27001Audit: boolean;
}

export interface DpaContractClauses {
  contractId: string;
  vendorId: string;
  vendorName: string;
  effectiveDate: string;
  expirationDate?: string;
  governingLawJurisdiction: string;
  hasSubprocessorPriorWrittenNoticeClause: boolean;
  subprocessorNoticePeriodDays: number; // typically >= 30 days
  hasDataBreachNotificationUnder72h: boolean;
  dataBreachNotificationWindowHours: number; // e.g. 24, 48, 72
  hasAuditRightsClause: boolean;
  hasPostTerminationDataReturnOrDeletion: boolean;
  executedSccModules: SccModule[];
  hasUkInternationalDataTransferAddendum: boolean;
  hasSwissDataTransferRider: boolean;
  hasUsStateSpecificPrivacyRiders: boolean;
  technicalMeasures: TechnicalOrganizationalMeasures;
}

export interface JurisdictionAssessment {
  jurisdiction: SovereignJurisdiction;
  isCompliant: boolean;
  riskRating: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deficiencies: string[];
  requiredRemediationRiders: string[];
}

export interface MultiJurisdictionDpaSyncResult {
  contractId: string;
  vendorId: string;
  compositeSovereignRiskScore: number; // 0 - 100 (100 = full compliance, lowest risk)
  isApprovedForGlobalCrossBorderTransfer: boolean;
  jurisdictionAssessments: Record<SovereignJurisdiction, JurisdictionAssessment>;
  totalDeficienciesCount: number;
  mandatoryAmendmentRiders: string[];
  auditAttestationDigest: string;
}

export class MultiJurisdictionDpaSynchronizer {
  /**
   * Evaluates a vendor DPA across all target international jurisdictions and produces compliance ratings.
   */
  public assessDpaCompliance(contract: DpaContractClauses): MultiJurisdictionDpaSyncResult {
    if (!contract.contractId || !contract.vendorId) {
      throw new Error("Contract ID and Vendor ID are required for sovereign assessment.");
    }

    const assessments: Record<SovereignJurisdiction, JurisdictionAssessment> = {
      EU_GDPR: this.evaluateEuGdpr(contract),
      UK_GDPR: this.evaluateUkGdpr(contract),
      SWISS_FADP: this.evaluateSwissFadp(contract),
      US_CALIFORNIA_CPRA: this.evaluateCaliforniaCpra(contract),
      CANADA_PIPEDA: this.evaluatePipeda(contract),
      JAPAN_APPI: this.evaluateAppi(contract),
      SINGAPORE_PDPA: this.evaluatePdpa(contract),
    };

    let score = 100;
    const allRiders = new Set<string>();
    let totalDeficiencies = 0;

    for (const j of Object.keys(assessments) as SovereignJurisdiction[]) {
      const a = assessments[j];
      totalDeficiencies += a.deficiencies.length;
      for (const r of a.requiredRemediationRiders) {
        allRiders.add(r);
      }

      if (a.riskRating === "CRITICAL") score -= 25;
      else if (a.riskRating === "HIGH") score -= 15;
      else if (a.riskRating === "MEDIUM") score -= 8;
    }

    const compositeScore = Math.max(0, Math.min(100, score));
    const isApproved = compositeScore >= 75 && totalDeficiencies <= 2 &&
      assessments.EU_GDPR.riskRating !== "CRITICAL" &&
      assessments.UK_GDPR.riskRating !== "CRITICAL";

    const fingerprint = `${contract.contractId}:${contract.vendorId}:${compositeScore}:${totalDeficiencies}:${isApproved}`;
    const digest = createHash("sha256").update(fingerprint).digest("hex");

    return {
      contractId: contract.contractId,
      vendorId: contract.vendorId,
      compositeSovereignRiskScore: compositeScore,
      isApprovedForGlobalCrossBorderTransfer: isApproved,
      jurisdictionAssessments: assessments,
      totalDeficienciesCount: totalDeficiencies,
      mandatoryAmendmentRiders: Array.from(allRiders),
      auditAttestationDigest: digest,
    };
  }

  private evaluateEuGdpr(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.hasSubprocessorPriorWrittenNoticeClause || c.subprocessorNoticePeriodDays < 14) {
      deficiencies.push("Art 28(2) non-compliant: Missing minimum 14-day prior written notice for sub-processor additions.");
      riders.push("EU-GDPR-ART28-SUBPROCESSOR-AMENDMENT");
    }
    if (!c.hasDataBreachNotificationUnder72h || c.dataBreachNotificationWindowHours > 72) {
      deficiencies.push("Art 33/34 breach reporting window exceeds statutory 72 hours.");
      riders.push("EU-GDPR-BREACH-NOTIFICATION-RIDER");
    }
    if (!c.hasAuditRightsClause) {
      deficiencies.push("Art 28(3)(h) deficiency: Controller audit rights are missing or improperly restricted.");
      riders.push("EU-GDPR-CONTROLLER-AUDIT-RIDER");
    }
    if (c.executedSccModules.length === 0) {
      deficiencies.push("Chapter V violation: No EU Standard Contractual Clauses (SCCs) executed.");
      riders.push("EU-COMMISSION-STANDARD-CONTRACTUAL-CLAUSES-2021-914");
    }
    if (!c.technicalMeasures.foreignGovernmentSubpoenaNotificationCommitment) {
      deficiencies.push("Schrems II supplementary measure missing: No commitment to challenge/notify on foreign FISA 702 / CLOUD Act warrants.");
      riders.push("SCHREMS-II-SUPPLEMENTARY-MEASURES-AGREEMENT");
    }

    const riskRating = deficiencies.length >= 3 ? "CRITICAL" : deficiencies.length > 0 ? "HIGH" : "LOW";
    return {
      jurisdiction: "EU_GDPR",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluateUkGdpr(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.hasUkInternationalDataTransferAddendum && c.executedSccModules.length === 0) {
      deficiencies.push("Missing UK International Data Transfer Addendum (B.1.0) to the EU SCCs.");
      riders.push("ICO-UK-INTERNATIONAL-DATA-TRANSFER-ADDENDUM");
    }

    const riskRating = deficiencies.length > 0 ? "HIGH" : "LOW";
    return {
      jurisdiction: "UK_GDPR",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluateSwissFadp(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.hasSwissDataTransferRider) {
      deficiencies.push("FADP Article 16 deficiency: Missing Swiss Federal Data Protection and Information Commissioner (FDPIC) recognition clause.");
      riders.push("SWISS-FADP-RECOGNITION-AMENDMENT");
    }

    const riskRating = deficiencies.length > 0 ? "MEDIUM" : "LOW";
    return {
      jurisdiction: "SWISS_FADP",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluateCaliforniaCpra(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.hasUsStateSpecificPrivacyRiders) {
      deficiencies.push("Cal. Civ. Code § 1798.140(ag) deficiency: Missing explicit prohibition against selling, sharing, or retaining personal information outside business purpose.");
      riders.push("US-CPRA-SERVICE-PROVIDER-CERTIFICATION-RIDER");
    }

    const riskRating = deficiencies.length > 0 ? "MEDIUM" : "LOW";
    return {
      jurisdiction: "US_CALIFORNIA_CPRA",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluatePipeda(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.technicalMeasures.endToEndEncryptionInTransit || !c.hasPostTerminationDataReturnOrDeletion) {
      deficiencies.push("PIPEDA Principle 7 / 4.5 deficiency: Insufficient safeguard controls or missing data destruction commitment.");
      riders.push("CANADA-PIPEDA-SAFEGUARD-ADDENDUM");
    }

    const riskRating = deficiencies.length > 0 ? "MEDIUM" : "LOW";
    return {
      jurisdiction: "CANADA_PIPEDA",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluateAppi(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.technicalMeasures.independentAnnualSoc2OrIso27001Audit) {
      deficiencies.push("APPI Article 24 oversight deficiency: Vendor lacks verifiable independent annual third-party security audits.");
      riders.push("JAPAN-APPI-SUPERVISION-OBLIGATION-RIDER");
    }

    const riskRating = deficiencies.length > 0 ? "LOW" : "LOW";
    return {
      jurisdiction: "JAPAN_APPI",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }

  private evaluatePdpa(c: DpaContractClauses): JurisdictionAssessment {
    const deficiencies: string[] = [];
    const riders: string[] = [];

    if (!c.technicalMeasures.encryptionAtRestWithCustomerKey && !c.technicalMeasures.pseudonymizationEnabled) {
      deficiencies.push("Singapore PDPA transfer limitation obligation: Comparable protection standard requires customer-controlled keys or tokenization.");
      riders.push("SINGAPORE-PDPA-CROSS-BORDER-ASSURANCE-RIDER");
    }

    const riskRating = deficiencies.length > 0 ? "LOW" : "LOW";
    return {
      jurisdiction: "SINGAPORE_PDPA",
      isCompliant: deficiencies.length === 0,
      riskRating,
      deficiencies,
      requiredRemediationRiders: riders,
    };
  }
}
