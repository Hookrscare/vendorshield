/**
 * QA-193: EU AI Act High-Risk AI System Conformity Assessment & FRIA Verifier.
 * Part of VendorShield B2B Enterprise Compliance & Trust Platform.
 *
 * Implements European Artificial Intelligence Act (Regulation (EU) 2024/1689)
 * compliance verification:
 * - Article 5: Prohibited AI Practice Screening
 * - Article 6 & Annex III: High-Risk Classification
 * - Articles 9-15: Technical Conformity Requirements
 * - Article 27: Fundamental Rights Impact Assessment (FRIA)
 */

import { createHash } from "crypto";

export type AiRiskClassification = "PROHIBITED" | "HIGH_RISK" | "SPECIFIC_TRANSPARENCY_RISK" | "MINIMAL_RISK";

export interface HighRiskRequirementStatus {
  article: "ART_9_RISK_MGMT" | "ART_10_DATA_GOVERNANCE" | "ART_11_TECH_DOC" | "ART_12_RECORD_KEEPING" | "ART_13_TRANSPARENCY" | "ART_14_HUMAN_OVERSIGHT" | "ART_15_CYBERSECURITY";
  isImplemented: boolean;
  evidenceUri: string;
}

export interface FriaDimensionAssessment {
  dimension: "HUMAN_DIGNITY" | "NON_DISCRIMINATION" | "DATA_PROTECTION_PRIVACY" | "WORKER_RIGHTS" | "ACCESSIBILITY";
  mitigationMeasuresApplied: boolean;
  residualRiskLevel: "NEGLIGIBLE" | "LOW" | "MEDIUM" | "UNACCEPTABLE";
}

export interface AiSystemProfile {
  systemId: string;
  intendedPurpose: string;
  isBiometricIdentification: boolean;
  isSocialScoringOrManipulation: boolean;
  isUsedInEmploymentOrCreditScoring: boolean;
  deployerJurisdiction: "EU" | "EEA" | "THIRD_COUNTRY_SERVING_EU";
  requirements: HighRiskRequirementStatus[];
  friaAssessments: FriaDimensionAssessment[];
}

export interface EuAiActConformityResult {
  systemId: string;
  classification: AiRiskClassification;
  isEligibleForEuMarket: boolean;
  conformityScore: number; // 0 to 100
  prohibitedReasons: string[];
  friaCompliant: boolean;
  unresolvedGaps: string[];
  declarationOfConformityHash: string;
  timestamp: string;
}

export class EuAiActConformityFriaVerifier {
  public static verifySystem(profile: AiSystemProfile): EuAiActConformityResult {
    if (!profile.systemId || !profile.intendedPurpose) {
      throw new Error("Invalid profile: systemId and intendedPurpose are required.");
    }

    const prohibitedReasons: string[] = [];
    const unresolvedGaps: string[] = [];

    // 1. Article 5: Prohibited Practices Screening
    if (profile.isSocialScoringOrManipulation) {
      prohibitedReasons.push("Article 5(1)(a/c): Social scoring or subliminal manipulation detected.");
    }

    if (prohibitedReasons.length > 0) {
      return {
        systemId: profile.systemId,
        classification: "PROHIBITED",
        isEligibleForEuMarket: false,
        conformityScore: 0,
        prohibitedReasons,
        friaCompliant: false,
        unresolvedGaps: ["CRITICAL: System falls under Article 5 prohibited AI practices."],
        declarationOfConformityHash: createHash("sha256").update(`PROHIBITED:${profile.systemId}`).digest("hex"),
        timestamp: new Date().toISOString()
      };
    }

    // 2. Article 6 & Annex III: High-Risk Classification
    const isHighRisk = profile.isBiometricIdentification || profile.isUsedInEmploymentOrCreditScoring;
    const classification: AiRiskClassification = isHighRisk ? "HIGH_RISK" : "MINIMAL_RISK";

    // 3. Articles 9-15 Technical Conformity (Mandatory for High-Risk)
    let conformityScore = 100;
    if (isHighRisk) {
      const requiredArticles = [
        "ART_9_RISK_MGMT",
        "ART_10_DATA_GOVERNANCE",
        "ART_11_TECH_DOC",
        "ART_12_RECORD_KEEPING",
        "ART_13_TRANSPARENCY",
        "ART_14_HUMAN_OVERSIGHT",
        "ART_15_CYBERSECURITY"
      ];

      const implementedArticles = new Set(
        profile.requirements.filter(r => r.isImplemented).map(r => r.article)
      );

      for (const art of requiredArticles) {
        if (!implementedArticles.has(art as any)) {
          unresolvedGaps.push(`Missing High-Risk requirement: ${art}`);
          conformityScore -= 12;
        }
      }
    }

    // 4. Article 27 FRIA Assessment
    let friaCompliant = true;
    for (const f of profile.friaAssessments) {
      if (!f.mitigationMeasuresApplied || f.residualRiskLevel === "UNACCEPTABLE") {
        friaCompliant = false;
        unresolvedGaps.push(`FRIA violation in dimension: ${f.dimension} (Risk: ${f.residualRiskLevel})`);
        conformityScore -= 10;
      }
    }

    conformityScore = Math.max(0, conformityScore);
    const isEligibleForEuMarket = unresolvedGaps.length === 0 && (!isHighRisk || friaCompliant);

    const rawDigest = `${profile.systemId}:${classification}:${isEligibleForEuMarket}:${conformityScore}`;
    const declarationOfConformityHash = createHash("sha256").update(rawDigest).digest("hex");

    return {
      systemId: profile.systemId,
      classification,
      isEligibleForEuMarket,
      conformityScore,
      prohibitedReasons: [],
      friaCompliant,
      unresolvedGaps,
      declarationOfConformityHash,
      timestamp: new Date().toISOString()
    };
  }
}
