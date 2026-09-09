/**
 * QA-149: Multi-Jurisdiction Cross-Border Data Transfer Risk Assessor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Conducts multi-jurisdictional evaluations of international sub-processor data transfers.
 * Implements GDPR Chapter V (Articles 44-50), UK Data Protection Act 2018 / IDTA,
 * Swiss FADP, and Schrems II supplementary measures (EDPB Recommendations 01/2020).
 * Assesses destination national surveillance laws (e.g., US FISA 702 / Executive Order 14086),
 * required technical safeguards (HSM client-held keys, zero-knowledge tokenization),
 * and generates deterministic regulatory transfer risk assessments.
 */

import { createHash } from "crypto";

export type LegalJurisdiction =
  | "EU_EEA"
  | "UNITED_KINGDOM"
  | "SWITZERLAND"
  | "UNITED_STATES"
  | "CANADA_PIPEDA"
  | "JAPAN_APPI"
  | "SINGAPORE_PDPA"
  | "AUSTRALIA_PRIVACY_ACT"
  | "RESTRICTED_THIRD_COUNTRY";

export type LegalTransferBasis =
  | "ADEQUACY_DECISION_ARTICLE_45"
  | "DATA_PRIVACY_FRAMEWORK_DPF"
  | "STANDARD_CONTRACTUAL_CLAUSES_SCC"
  | "INTERNATIONAL_DATA_TRANSFER_ADDENDUM_IDTA"
  | "BINDING_CORPORATE_RULES_BCR"
  | "ARTICLE_49_DEROGATION";

export type DataSensitivityLevel =
  | "PUBLIC_METADATA"
  | "CONFIDENTIAL_BUSINESS_DATA"
  | "PII_STANDARD"
  | "SPECIAL_CATEGORY_SENSITIVE_HEALTH_FINANCIAL";

export interface TechnicalSafeguard {
  code: string;
  description: string;
  category: "ENCRYPTION_IN_TRANSIT" | "ENCRYPTION_AT_REST_BYOK" | "PSEUDONYMIZATION" | "ACCESS_RESTRICTION";
  verified: boolean;
  mitigationFactor: number; // 0.0 to 1.0
}

export interface CrossBorderTransferSpec {
  transferId: string;
  vendorId: string;
  vendorName: string;
  sourceJurisdiction: LegalJurisdiction;
  destinationJurisdiction: LegalJurisdiction;
  legalBasis: LegalTransferBasis;
  sensitivity: DataSensitivityLevel;
  dpfCertified: boolean;
  safeguards: TechnicalSafeguard[];
}

export type TransferRiskTier = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type RegulatoryApprovalStatus = "AUTHORIZED" | "CONDITIONAL_APPROVAL" | "PROHIBITED";

export interface TransferRiskAssessmentResult {
  transferId: string;
  vendorId: string;
  sourceJurisdiction: LegalJurisdiction;
  destinationJurisdiction: LegalJurisdiction;
  baseSurveillanceRisk: number; // 0 to 100
  safeguardMitigationScore: number; // 0 to 100
  compositeRiskScore: number; // 0 to 100
  riskTier: TransferRiskTier;
  approvalStatus: RegulatoryApprovalStatus;
  mandatoryActions: string[];
  auditDigest: string;
  timestamp: string;
}

export class CrossBorderTransferRiskAssessor {
  /**
   * Base surveillance & government intercept risk per destination jurisdiction.
   */
  private getBaseSurveillanceRisk(destination: LegalJurisdiction, dpfCertified: boolean): number {
    switch (destination) {
      case "EU_EEA":
      case "SWITZERLAND":
        return 10;
      case "UNITED_KINGDOM":
      case "CANADA_PIPEDA":
      case "JAPAN_APPI":
        return 20;
      case "SINGAPORE_PDPA":
      case "AUSTRALIA_PRIVACY_ACT":
        return 35;
      case "UNITED_STATES":
        // If certified under EU-US Data Privacy Framework (EO 14086), surveillance risk is mitigated
        return dpfCertified ? 30 : 75;
      case "RESTRICTED_THIRD_COUNTRY":
      default:
        return 90;
    }
  }

  /**
   * Sensitivity weight multiplier.
   */
  private getSensitivityWeight(sensitivity: DataSensitivityLevel): number {
    switch (sensitivity) {
      case "PUBLIC_METADATA":
        return 0.5;
      case "CONFIDENTIAL_BUSINESS_DATA":
        return 1.0;
      case "PII_STANDARD":
        return 1.3;
      case "SPECIAL_CATEGORY_SENSITIVE_HEALTH_FINANCIAL":
        return 1.7;
    }
  }

  public assessTransfer(spec: CrossBorderTransferSpec): TransferRiskAssessmentResult {
    const isAdequate =
      spec.destinationJurisdiction === "EU_EEA" ||
      spec.destinationJurisdiction === "SWITZERLAND" ||
      (spec.destinationJurisdiction === "UNITED_STATES" && spec.dpfCertified && spec.legalBasis === "DATA_PRIVACY_FRAMEWORK_DPF");

    const baseSurveillance = this.getBaseSurveillanceRisk(spec.destinationJurisdiction, spec.dpfCertified);
    const sensitivityMultiplier = this.getSensitivityWeight(spec.sensitivity);

    // Calculate safeguard mitigation score
    let totalMitigation = 0;
    for (const sg of spec.safeguards) {
      if (sg.verified) {
        totalMitigation += sg.mitigationFactor * 25; // max 100 for 4 full safeguards
      }
    }
    const safeguardScore = Math.min(100, Math.max(0, totalMitigation));

    // Raw unmitigated risk
    const rawRisk = baseSurveillance * sensitivityMultiplier;
    // Net risk after technical mitigations
    const mitigationEffect = (safeguardScore / 100) * 0.65; // Safeguards can mitigate up to 65% of raw risk
    const compositeRisk = Math.max(5, Math.min(100, Math.round(rawRisk * (1 - mitigationEffect))));

    let riskTier: TransferRiskTier = "LOW";
    let approvalStatus: RegulatoryApprovalStatus = "AUTHORIZED";
    const mandatoryActions: string[] = [];

    if (compositeRisk >= 75) {
      riskTier = "CRITICAL";
      approvalStatus = "PROHIBITED";
      mandatoryActions.push("Halt data export: Transfer risk exceeds acceptable legal threshold under GDPR Art 44.");
      mandatoryActions.push("Mandate zero-knowledge client-side encryption (BYOK HSM) before destination ingress.");
    } else if (compositeRisk >= 45) {
      riskTier = "HIGH";
      approvalStatus = "CONDITIONAL_APPROVAL";
      mandatoryActions.push("Execute SCC Supplementary Measures Schedule and require annual government disclosure audit.");
      mandatoryActions.push("Enforce end-to-end encryption in transit (TLS 1.3) with client-controlled decryption keys.");
    } else if (compositeRisk >= 25) {
      riskTier = "MODERATE";
      approvalStatus = "CONDITIONAL_APPROVAL";
      if (!isAdequate && spec.legalBasis !== "STANDARD_CONTRACTUAL_CLAUSES_SCC") {
        mandatoryActions.push("Execute Standard Contractual Clauses (Module 2/3) or local transfer addendum.");
      }
    } else {
      riskTier = "LOW";
      approvalStatus = "AUTHORIZED";
    }

    // Check adequacy mismatch
    if (!isAdequate && spec.legalBasis === "ADEQUACY_DECISION_ARTICLE_45") {
      approvalStatus = "PROHIBITED";
      mandatoryActions.unshift("Invalid legal basis: Destination country does not possess a valid adequacy decision.");
      riskTier = "HIGH";
    }

    const digestPayload = `${spec.transferId}|${spec.vendorId}|${spec.sourceJurisdiction}|${spec.destinationJurisdiction}|${compositeRisk}|${approvalStatus}`;
    const auditDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      transferId: spec.transferId,
      vendorId: spec.vendorId,
      sourceJurisdiction: spec.sourceJurisdiction,
      destinationJurisdiction: spec.destinationJurisdiction,
      baseSurveillanceRisk: baseSurveillance,
      safeguardMitigationScore: safeguardScore,
      compositeRiskScore: compositeRisk,
      riskTier,
      approvalStatus,
      mandatoryActions,
      auditDigest,
      timestamp: new Date().toISOString()
    };
  }

  public batchEvaluateTransfers(transfers: CrossBorderTransferSpec[]): {
    totalEvaluated: number;
    authorizedCount: number;
    conditionalCount: number;
    prohibitedCount: number;
    averageRiskScore: number;
    assessments: TransferRiskAssessmentResult[];
  } {
    const assessments = transfers.map((t) => this.assessTransfer(t));
    const authorized = assessments.filter((a) => a.approvalStatus === "AUTHORIZED").length;
    const conditional = assessments.filter((a) => a.approvalStatus === "CONDITIONAL_APPROVAL").length;
    const prohibited = assessments.filter((a) => a.approvalStatus === "PROHIBITED").length;
    const avgScore =
      assessments.length > 0
        ? Math.round(assessments.reduce((acc, curr) => acc + curr.compositeRiskScore, 0) / assessments.length)
        : 0;

    return {
      totalEvaluated: assessments.length,
      authorizedCount: authorized,
      conditionalCount: conditional,
      prohibitedCount: prohibited,
      averageRiskScore: avgScore,
      assessments
    };
  }
}
