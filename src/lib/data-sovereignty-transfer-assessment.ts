/**
 * QA-138: Multi-Region Data Sovereignty Cross-Border Transfer Assessment Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Enforces GDPR Chapter V (Articles 44-49), Schrems II EDPB Recommendations 01/2020,
 * and cross-border adequacy frameworks (EU-US DPF, UK/Swiss Adequacy).
 * Analyzes surveillance risk, required technical supplementary measures (ZKE, tokenization),
 * and generates cryptographically verifiable regulatory Transfer Impact Assessment (TIA) dossiers.
 */

import { createHash } from "crypto";

export type GeographicJurisdiction =
  | "EU_EEA"
  | "UNITED_STATES"
  | "UNITED_KINGDOM"
  | "SWITZERLAND"
  | "CANADA"
  | "JAPAN"
  | "AUSTRALIA"
  | "SINGAPORE"
  | "CHINA"
  | "RUSSIA"
  | "OTHER_THIRD_COUNTRY";

export type TransferMechanism =
  | "ADEQUACY_DECISION"
  | "STANDARD_CONTRACTUAL_CLAUSES_MODULE_2_C2P"
  | "STANDARD_CONTRACTUAL_CLAUSES_MODULE_3_P2P"
  | "BINDING_CORPORATE_RULES"
  | "EXPLICIT_CONSENT_DEROGATION_ART_49";

export type SurveillanceRiskTier = "LOW" | "MODERATE" | "HIGH" | "CRITICAL_UNMITIGATED";

export type AssessmentVerdict =
  | "AUTHORIZED_COMPLIANT"
  | "CONDITIONAL_REMEDIATION_REQUIRED"
  | "PROHIBITED_HIGH_SURVEILLANCE_RISK";

export interface SupplementaryMeasure {
  id: string;
  name: string;
  type: "TECHNICAL" | "ORGANIZATIONAL" | "CONTRACTUAL";
  isImplemented: boolean;
  effectivenessWeight: number; // 0.0 to 1.0
}

export interface CrossBorderTransferRequest {
  transferId: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  originJurisdiction: GeographicJurisdiction;
  destinationJurisdiction: GeographicJurisdiction;
  dataCategories: string[]; // e.g. ["PII", "FINANCIAL", "HEALTH", "USAGE_LOGS"]
  transferMechanism: TransferMechanism;
  supplementaryMeasures: SupplementaryMeasure[];
  dpfCertified?: boolean; // EU-US Data Privacy Framework
}

export interface TransferImpactReport {
  reportId: string;
  tenantId: string;
  vendorName: string;
  originJurisdiction: GeographicJurisdiction;
  destinationJurisdiction: GeographicJurisdiction;
  surveillanceRiskTier: SurveillanceRiskTier;
  baselineSurveillanceScore: number;
  mitigatedRiskScore: number;
  verdict: AssessmentVerdict;
  recommendedActions: string[];
  assessedAtIso: string;
  auditSealSha256: string;
}

export class DataSovereigntyAssessmentEngine {
  private static JURISDICTION_RISK_BASELINE: Record<GeographicJurisdiction, number> = {
    EU_EEA: 10,
    SWITZERLAND: 15,
    UNITED_KINGDOM: 20,
    JAPAN: 25,
    CANADA: 30,
    SINGAPORE: 35,
    AUSTRALIA: 40,
    UNITED_STATES: 55, // FISA 702 / EO 14086
    OTHER_THIRD_COUNTRY: 75,
    CHINA: 95, // National Intelligence Law
    RUSSIA: 98  // SORM / 152-FZ
  };

  /**
   * Assesses a cross-border data transfer against GDPR Chapter V and EDPB guidelines.
   */
  public static evaluateTransfer(req: CrossBorderTransferRequest): TransferImpactReport {
    if (!req.tenantId || !req.vendorName) {
      throw new Error("Tenant ID and Vendor Name are required for transfer assessment.");
    }

    const baselineRisk = this.JURISDICTION_RISK_BASELINE[req.destinationJurisdiction] ?? 70;
    let surveillanceTier: SurveillanceRiskTier;

    if (baselineRisk >= 85) {
      surveillanceTier = "CRITICAL_UNMITIGATED";
    } else if (baselineRisk >= 50) {
      surveillanceTier = "HIGH";
    } else if (baselineRisk >= 25) {
      surveillanceTier = "MODERATE";
    } else {
      surveillanceTier = "LOW";
    }

    // Evaluate mitigation from supplementary measures
    let totalMitigationWeight = 0;
    for (const measure of req.supplementaryMeasures) {
      if (measure.isImplemented) {
        totalMitigationWeight += measure.effectivenessWeight;
      }
    }

    // Bonus mitigation for DPF certification when transferring to US
    if (req.destinationJurisdiction === "UNITED_STATES" && req.dpfCertified) {
      totalMitigationWeight += 0.35;
    }

    // Calculate mitigated risk score (0 to 100)
    const mitigationMultiplier = Math.max(0.15, 1.0 - Math.min(0.85, totalMitigationWeight));
    const mitigatedScore = Math.round(baselineRisk * mitigationMultiplier);

    // Determine verdict
    let verdict: AssessmentVerdict;
    const actions: string[] = [];

    if (surveillanceTier === "CRITICAL_UNMITIGATED" && mitigatedScore > 50) {
      verdict = "PROHIBITED_HIGH_SURVEILLANCE_RISK";
      actions.push("Cease cross-border transfers immediately; host data in local EU-sovereign enclave.");
      actions.push("Engage DPO and execute mandatory Article 48 blocking statute review.");
    } else if (mitigatedScore <= 30) {
      verdict = "AUTHORIZED_COMPLIANT";
      actions.push("Maintain continuous annual vendor reassessment.");
      actions.push("Log ongoing data volumes in compliance telemetry register.");
    } else {
      verdict = "CONDITIONAL_REMEDIATION_REQUIRED";
      if (!req.supplementaryMeasures.some(m => m.name.includes("Zero-Knowledge") && m.isImplemented)) {
        actions.push("Deploy Zero-Knowledge customer-managed encryption keys before transiting data.");
      }
      if (!req.supplementaryMeasures.some(m => m.name.includes("Tokenization") && m.isImplemented)) {
        actions.push("Implement field-level pseudonymization/Tokenization at origin.");
      }
      actions.push("Obtain updated Schrems II supplementary clauses addendum.");
    }

    const timestamp = new Date().toISOString();
    const reportId = `TIA-${createHash("sha256").update(req.transferId + timestamp).digest("hex").slice(0, 12).toUpperCase()}`;

    const rawPayload = {
      reportId,
      tenantId: req.tenantId,
      vendorName: req.vendorName,
      originJurisdiction: req.originJurisdiction,
      destinationJurisdiction: req.destinationJurisdiction,
      baselineRisk,
      mitigatedScore,
      verdict,
      timestamp
    };

    const auditSealSha256 = createHash("sha256").update(JSON.stringify(rawPayload)).digest("hex");

    return {
      reportId,
      tenantId: req.tenantId,
      vendorName: req.vendorName,
      originJurisdiction: req.originJurisdiction,
      destinationJurisdiction: req.destinationJurisdiction,
      surveillanceRiskTier: surveillanceTier,
      baselineSurveillanceScore: baselineRisk,
      mitigatedRiskScore: mitigatedScore,
      verdict,
      recommendedActions: actions,
      assessedAtIso: timestamp,
      auditSealSha256
    };
  }
}
