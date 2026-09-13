import { describe, it, expect } from "vitest";
import {
  EuAiActConformityFriaVerifier,
  AiSystemProfile
} from "./eu-ai-act-conformity-fria-verifier";

describe("EuAiActConformityFriaVerifier (QA-193)", () => {
  it("approves high-risk AI system meeting all Articles 9-15 and passing FRIA", () => {
    const profile: AiSystemProfile = {
      systemId: "SYS-TALENT-SCREEN-01",
      intendedPurpose: "Automated resume parsing and candidate ranking",
      isBiometricIdentification: false,
      isSocialScoringOrManipulation: false,
      isUsedInEmploymentOrCreditScoring: true, // High-risk trigger (Annex III point 4)
      deployerJurisdiction: "EU",
      requirements: [
        { article: "ART_9_RISK_MGMT", isImplemented: true, evidenceUri: "s3://doc/art9.pdf" },
        { article: "ART_10_DATA_GOVERNANCE", isImplemented: true, evidenceUri: "s3://doc/art10.pdf" },
        { article: "ART_11_TECH_DOC", isImplemented: true, evidenceUri: "s3://doc/art11.pdf" },
        { article: "ART_12_RECORD_KEEPING", isImplemented: true, evidenceUri: "s3://doc/art12.pdf" },
        { article: "ART_13_TRANSPARENCY", isImplemented: true, evidenceUri: "s3://doc/art13.pdf" },
        { article: "ART_14_HUMAN_OVERSIGHT", isImplemented: true, evidenceUri: "s3://doc/art14.pdf" },
        { article: "ART_15_CYBERSECURITY", isImplemented: true, evidenceUri: "s3://doc/art15.pdf" }
      ],
      friaAssessments: [
        { dimension: "HUMAN_DIGNITY", mitigationMeasuresApplied: true, residualRiskLevel: "LOW" },
        { dimension: "NON_DISCRIMINATION", mitigationMeasuresApplied: true, residualRiskLevel: "LOW" },
        { dimension: "WORKER_RIGHTS", mitigationMeasuresApplied: true, residualRiskLevel: "LOW" }
      ]
    };

    const result = EuAiActConformityFriaVerifier.verifySystem(profile);

    expect(result.classification).toBe("HIGH_RISK");
    expect(result.isEligibleForEuMarket).toBe(true);
    expect(result.conformityScore).toBe(100);
    expect(result.friaCompliant).toBe(true);
    expect(result.unresolvedGaps.length).toBe(0);
    expect(result.declarationOfConformityHash).toBeDefined();
  });

  it("bans system categorized under Article 5 prohibited practices immediately", () => {
    const profile: AiSystemProfile = {
      systemId: "SYS-CITIZEN-SCORE-99",
      intendedPurpose: "Public social credit scoring",
      isBiometricIdentification: false,
      isSocialScoringOrManipulation: true, // Prohibited!
      isUsedInEmploymentOrCreditScoring: false,
      deployerJurisdiction: "EU",
      requirements: [],
      friaAssessments: []
    };

    const result = EuAiActConformityFriaVerifier.verifySystem(profile);

    expect(result.classification).toBe("PROHIBITED");
    expect(result.isEligibleForEuMarket).toBe(false);
    expect(result.conformityScore).toBe(0);
    expect(result.prohibitedReasons.length).toBeGreaterThan(0);
  });

  it("detects missing technical documentation and FRIA discrimination hazards", () => {
    const profile: AiSystemProfile = {
      systemId: "SYS-CREDIT-CHECK-02",
      intendedPurpose: "Consumer creditworthiness assessment",
      isBiometricIdentification: false,
      isSocialScoringOrManipulation: false,
      isUsedInEmploymentOrCreditScoring: true,
      deployerJurisdiction: "EU",
      requirements: [
        { article: "ART_9_RISK_MGMT", isImplemented: true, evidenceUri: "s3://doc/art9.pdf" }
        // Missing other required articles
      ],
      friaAssessments: [
        { dimension: "NON_DISCRIMINATION", mitigationMeasuresApplied: false, residualRiskLevel: "UNACCEPTABLE" }
      ]
    };

    const result = EuAiActConformityFriaVerifier.verifySystem(profile);

    expect(result.classification).toBe("HIGH_RISK");
    expect(result.isEligibleForEuMarket).toBe(false);
    expect(result.friaCompliant).toBe(false);
    expect(result.unresolvedGaps.some(g => g.includes("Missing High-Risk requirement"))).toBe(true);
    expect(result.unresolvedGaps.some(g => g.includes("NON_DISCRIMINATION"))).toBe(true);
  });
});
