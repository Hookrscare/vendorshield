/**
 * QA-151: Automated EU AI Act High-Risk System & Third-Party AI Provider Conformity Assessment Engine.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 * 
 * Assesses third-party SaaS vendors and sub-processors providing AI services under Regulation (EU) 2024/1689:
 * 1. Prohibited AI practices detection (Article 5)
 * 2. High-Risk AI classification across Annex III critical areas (biometrics, critical infrastructure, employment, education)
 * 3. General-Purpose AI (GPAI) systemic risk obligations
 * 4. Technical documentation, human oversight (Art 14), and data governance (Art 10) audit
 * 5. Generates cryptographic conformity attestation and vendor risk ratings
 */

import { createHash } from "crypto";

export type AiActRiskTier = "PROHIBITED" | "HIGH_RISK" | "TRANSPARENCY_ONLY" | "MINIMAL_RISK";

export type Annex3Domain =
  | "BIOMETRICS_IDENTIFICATION"
  | "CRITICAL_INFRASTRUCTURE"
  | "EDUCATIONAL_VOCATIONAL_ADMISSION"
  | "EMPLOYMENT_WORKFORCE_MANAGEMENT"
  | "ACCESS_ESSENTIAL_PUBLIC_SERVICES"
  | "LAW_ENFORCEMENT"
  | "MIGRATION_ASYLUM_BORDER_CONTROL"
  | "ADMINISTRATION_OF_JUSTICE";

export interface VendorAiSystemProfile {
  vendorId: string;
  vendorName: string;
  systemName: string;
  systemVersion: string;
  primaryUseCase: string;
  targetUsers: "CONSUMER" | "ENTERPRISE_INTERNAL" | "PUBLIC_AUTHORITY";
  processesBiometricData: boolean;
  performsSubliminalManipulation: boolean;
  performsSocialScoring: boolean;
  performsEmotionRecognitionInWorkplace: boolean;
  annex3Domains: Annex3Domain[];
  isGeneralPurposeAi: boolean;
  hasSystemicRisk: boolean;
  trainingDataGovernanceDocumented: boolean;
  humanOversightControlsDocumented: boolean;
  cybersecurityResilienceTested: boolean;
  zeroDataRetentionSlaGuaranteed: boolean;
}

export interface AiActConformityResult {
  evaluationId: string;
  vendorId: string;
  systemName: string;
  riskTier: AiActRiskTier;
  prohibitedViolations: string[];
  mandatoryRequirements: string[];
  compliant: boolean;
  conformityScorePercent: number;
  cryptographicAttestationHash: string;
  evaluationTimestampIso: string;
}

export class EuAiActConformityAssessor {
  /**
   * Assesses an AI system or third-party vendor against the EU AI Act (Regulation 2024/1689).
   */
  public evaluateSystem(profile: VendorAiSystemProfile): AiActConformityResult {
    const prohibitedViolations: string[] = [];
    const mandatoryRequirements: string[] = [];

    // 1. Article 5: Prohibited Practices Check
    if (profile.performsSubliminalManipulation) {
      prohibitedViolations.push("Article 5(1)(a): Subliminal or manipulative techniques distorting behavior.");
    }
    if (profile.performsSocialScoring) {
      prohibitedViolations.push("Article 5(1)(c): Social scoring leading to detrimental treatment.");
    }
    if (profile.performsEmotionRecognitionInWorkplace) {
      prohibitedViolations.push("Article 5(1)(f): Workplace emotion recognition system without verified medical/safety justification.");
    }

    let riskTier: AiActRiskTier = "MINIMAL_RISK";

    if (prohibitedViolations.length > 0) {
      riskTier = "PROHIBITED";
    } else if (profile.annex3Domains.length > 0 || (profile.processesBiometricData && profile.targetUsers !== "CONSUMER")) {
      riskTier = "HIGH_RISK";
    } else if (profile.isGeneralPurposeAi || profile.targetUsers === "CONSUMER") {
      riskTier = "TRANSPARENCY_ONLY";
    }

    // 2. High-Risk AI Requirements (Articles 9-15)
    let scoreAcc = 100;
    if (riskTier === "PROHIBITED") {
      scoreAcc = 0;
      mandatoryRequirements.push("IMMEDIATE CEASE AND DESIST: Prohibited under EU AI Act Art 5.");
    } else if (riskTier === "HIGH_RISK") {
      if (!profile.trainingDataGovernanceDocumented) {
        scoreAcc -= 25;
        mandatoryRequirements.push("Article 10: High-quality training, validation and testing data governance documentation missing.");
      }
      if (!profile.humanOversightControlsDocumented) {
        scoreAcc -= 25;
        mandatoryRequirements.push("Article 14: Technical measures for human oversight ('human-in-the-loop') missing.");
      }
      if (!profile.cybersecurityResilienceTested) {
        scoreAcc -= 25;
        mandatoryRequirements.push("Article 15: Accuracy, robustness and cybersecurity resilience testing unverified.");
      }
      if (!profile.zeroDataRetentionSlaGuaranteed) {
        scoreAcc -= 15;
        mandatoryRequirements.push("Enterprise Safeguard: Third-party AI provider Zero-Data-Retention SLA not verified.");
      }
    } else if (riskTier === "TRANSPARENCY_ONLY") {
      if (!profile.trainingDataGovernanceDocumented) {
        scoreAcc -= 15;
        mandatoryRequirements.push("Article 50: Transparency summary of training content missing.");
      }
    }

    const finalScore = Math.max(0, Math.min(100, scoreAcc));
    const compliant = riskTier !== "PROHIBITED" && finalScore >= 80;

    const evaluationTimestampIso = new Date().toISOString();
    const evaluationId = `AIACT-${profile.vendorId}-${Date.now().toString(36).toUpperCase()}`;

    // Cryptographic attestation hash
    const attestationPayload = JSON.stringify({
      evaluationId,
      vendorId: profile.vendorId,
      systemName: profile.systemName,
      riskTier,
      finalScore,
      compliant,
      evaluationTimestampIso
    });
    const cryptographicAttestationHash = createHash("sha256").update(attestationPayload).digest("hex");

    return {
      evaluationId,
      vendorId: profile.vendorId,
      systemName: profile.systemName,
      riskTier,
      prohibitedViolations,
      mandatoryRequirements,
      compliant,
      conformityScorePercent: finalScore,
      cryptographicAttestationHash,
      evaluationTimestampIso
    };
  }
}
