/**
 * automated-third-party-vendor-data-processing-security-risk-scorer.ts
 * QA-189: Automated Third-Party Vendor Data Processing Security Risk Scorer
 *
 * Continuously evaluates vendor data processing activities, DPA contractual adherence,
 * data sensitivity classifications, cross-border transfer mechanisms, and technical
 * security safeguards to produce a composite risk rating with automated gating.
 */

import { createHmac } from "crypto";

export type DataSensitivityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL_PII" | "REGULATED_FINANCIAL" | "RESTRICTED_PHI";
export type VendorRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TechnicalSafeguards {
  tlsVersion: "1.2" | "1.3";
  mTLSEnforced: boolean;
  encryptionAtRest: "NONE" | "AES-128" | "AES-256" | "AES-256-GCM-CMEK";
  keyRotationDays: number;
  ephemeralAccessOnly: boolean;
  mfaEnforced: boolean;
  soc2TypeIIValid: boolean;
  iso27001Valid: boolean;
}

export interface ContractualDPAStatus {
  dpaSigned: boolean;
  gdprArticle28Compliant: boolean;
  subprocessorNotificationDays: number;
  breachNotificationSlaHours: number;
  auditRightsGranted: boolean;
  transferMechanism: "EU_US_DPF" | "SCC_2021" | "BINDING_CORPORATE_RULES" | "NONE";
}

export interface VendorProcessingProfile {
  vendorId: string;
  vendorName: string;
  primaryJurisdiction: string;
  dataSensitivity: DataSensitivityLevel;
  monthlyRecordVolume: number;
  contractualDpa: ContractualDPAStatus;
  safeguards: TechnicalSafeguards;
}

export interface RiskScoringResult {
  vendorId: string;
  vendorName: string;
  compositeRiskScore: number; // 0 to 100
  riskLevel: VendorRiskLevel;
  approvedForProcessing: boolean;
  findings: string[];
  remediationPlan: string[];
  attestationSignature: string;
  evaluatedAtIso: string;
}

export class ThirdPartyVendorDataProcessingSecurityRiskScorer {
  private signingSecret: string;

  constructor(signingSecret: string = "default_vendor_risk_signing_secret_2026") {
    this.signingSecret = signingSecret;
  }

  public static determineRiskLevel(score: number): VendorRiskLevel {
    if (score < 25) return "LOW";
    if (score < 50) return "MEDIUM";
    if (score < 75) return "HIGH";
    return "CRITICAL";
  }

  public scoreVendor(profile: VendorProcessingProfile): RiskScoringResult {
    let score = 0;
    const findings: string[] = [];
    const remediationPlan: string[] = [];

    // 1. Data sensitivity base penalty
    switch (profile.dataSensitivity) {
      case "RESTRICTED_PHI":
        score += 30;
        break;
      case "REGULATED_FINANCIAL":
        score += 25;
        break;
      case "CONFIDENTIAL_PII":
        score += 15;
        break;
      case "INTERNAL":
        score += 5;
        break;
      case "PUBLIC":
      default:
        score += 0;
        break;
    }

    // 2. Volume scale
    if (profile.monthlyRecordVolume > 1_000_000) {
      score += 15;
      findings.push("High-volume data processing (>1M records/month)");
    } else if (profile.monthlyRecordVolume > 100_000) {
      score += 10;
    }

    // 3. DPA & Contractual checks
    const dpa = profile.contractualDpa;
    if (!dpa.dpaSigned) {
      score += 35;
      findings.push("DPA is unsigned or missing");
      remediationPlan.push("Execute binding Data Processing Agreement before transmitting data");
    } else {
      if (!dpa.gdprArticle28Compliant) {
        score += 15;
        findings.push("DPA lacks mandatory GDPR Article 28 mandatory clauses");
        remediationPlan.push("Incorporate Article 28(3) sub-processor & audit clauses");
      }
      if (dpa.breachNotificationSlaHours > 72) {
        score += 10;
        findings.push(`Breach notification SLA (${dpa.breachNotificationSlaHours}h) exceeds 72-hour regulatory threshold`);
        remediationPlan.push("Reduce vendor security incident notification SLA to <= 48 hours");
      }
      if (dpa.transferMechanism === "NONE" && profile.dataSensitivity !== "PUBLIC") {
        score += 25;
        findings.push("No lawful cross-border transfer mechanism declared");
        remediationPlan.push("Adopt EU Standard Contractual Clauses (SCC 2021) or verify EU-US DPF certification");
      }
    }

    // 4. Technical Safeguards
    const tech = profile.safeguards;
    if (tech.tlsVersion !== "1.3") {
      score += 10;
      findings.push("Legacy TLS version (< 1.3) detected on data ingest endpoints");
      remediationPlan.push("Enforce modern TLS 1.3 cipher suites");
    }
    if (tech.encryptionAtRest === "NONE") {
      score += 30;
      findings.push("Data is stored unencrypted at rest");
      remediationPlan.push("Implement AES-256-GCM encryption at rest");
    } else if (tech.encryptionAtRest === "AES-128") {
      score += 10;
      findings.push("Sub-standard AES-128 encryption at rest");
    }

    if (!tech.mfaEnforced) {
      score += 20;
      findings.push("MFA not enforced for vendor administrative access");
      remediationPlan.push("Mandate FIDO2/WebAuthn MFA across all vendor staff accounts");
    }

    if (!tech.soc2TypeIIValid && !tech.iso27001Valid) {
      score += 20;
      findings.push("Vendor possesses neither valid SOC 2 Type II nor ISO 27001 certification");
      remediationPlan.push("Require annual SOC 2 Type II audit or comprehensive third-party penetration test");
    }

    // Clamp score
    const compositeRiskScore = Math.min(100, Math.max(0, score));
    const riskLevel = ThirdPartyVendorDataProcessingSecurityRiskScorer.determineRiskLevel(compositeRiskScore);
    const approvedForProcessing = compositeRiskScore < 50 && dpa.dpaSigned && tech.encryptionAtRest !== "NONE";

    const evaluatedAtIso = new Date().toISOString();
    const payloadToSign = `${profile.vendorId}:${compositeRiskScore}:${riskLevel}:${evaluatedAtIso}`;
    const attestationSignature = createHmac("sha256", this.signingSecret)
      .update(payloadToSign)
      .digest("hex");

    return {
      vendorId: profile.vendorId,
      vendorName: profile.vendorName,
      compositeRiskScore,
      riskLevel,
      approvedForProcessing,
      findings,
      remediationPlan,
      attestationSignature,
      evaluatedAtIso
    };
  }
}
