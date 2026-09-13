import { describe, it, expect } from "vitest";
import {
  EuAiActConformityAssessor,
  VendorAiSystemProfile
} from "./eu-ai-act-conformity-assessor";

describe("QA-151: EU AI Act Conformity Assessor Regression Tests", () => {
  const assessor = new EuAiActConformityAssessor();

  it("identifies Article 5 prohibited subliminal manipulation and rejects with 0 score", () => {
    const profile: VendorAiSystemProfile = {
      vendorId: "vnd-dark-pattern",
      vendorName: "NeuroNudge Inc",
      systemName: "SubliminalBuyer-v2",
      systemVersion: "2.1.0",
      primaryUseCase: "Ad conversion optimization",
      targetUsers: "CONSUMER",
      processesBiometricData: false,
      performsSubliminalManipulation: true,
      performsSocialScoring: false,
      performsEmotionRecognitionInWorkplace: false,
      annex3Domains: [],
      isGeneralPurposeAi: false,
      hasSystemicRisk: false,
      trainingDataGovernanceDocumented: true,
      humanOversightControlsDocumented: true,
      cybersecurityResilienceTested: true,
      zeroDataRetentionSlaGuaranteed: true
    };

    const result = assessor.evaluateSystem(profile);
    expect(result.riskTier).toBe("PROHIBITED");
    expect(result.compliant).toBe(false);
    expect(result.conformityScorePercent).toBe(0);
    expect(result.prohibitedViolations.length).toBeGreaterThan(0);
    expect(result.cryptographicAttestationHash).toHaveLength(64);
  });

  it("classifies Annex III employment AI as High-Risk and validates all mandatory documentation", () => {
    const compliantHrProfile: VendorAiSystemProfile = {
      vendorId: "vnd-talent-ai",
      vendorName: "TalentScan Corp",
      systemName: "ResumeRank-Enterprise",
      systemVersion: "4.0.0",
      primaryUseCase: "Candidate shortlisting & resume parsing",
      targetUsers: "ENTERPRISE_INTERNAL",
      processesBiometricData: false,
      performsSubliminalManipulation: false,
      performsSocialScoring: false,
      performsEmotionRecognitionInWorkplace: false,
      annex3Domains: ["EMPLOYMENT_WORKFORCE_MANAGEMENT"],
      isGeneralPurposeAi: false,
      hasSystemicRisk: false,
      trainingDataGovernanceDocumented: true,
      humanOversightControlsDocumented: true,
      cybersecurityResilienceTested: true,
      zeroDataRetentionSlaGuaranteed: true
    };

    const result = assessor.evaluateSystem(compliantHrProfile);
    expect(result.riskTier).toBe("HIGH_RISK");
    expect(result.compliant).toBe(true);
    expect(result.conformityScorePercent).toBe(100);
    expect(result.prohibitedViolations).toHaveLength(0);
  });

  it("penalizes High-Risk AI lacking Article 14 human oversight and data governance", () => {
    const nonCompliantProfile: VendorAiSystemProfile = {
      vendorId: "vnd-blackbox-eval",
      vendorName: "AutoJudge AI",
      systemName: "AutonomousAssessor",
      systemVersion: "1.0.0",
      primaryUseCase: "Automated student exam scoring",
      targetUsers: "ENTERPRISE_INTERNAL",
      processesBiometricData: false,
      performsSubliminalManipulation: false,
      performsSocialScoring: false,
      performsEmotionRecognitionInWorkplace: false,
      annex3Domains: ["EDUCATIONAL_VOCATIONAL_ADMISSION"],
      isGeneralPurposeAi: false,
      hasSystemicRisk: false,
      trainingDataGovernanceDocumented: false,
      humanOversightControlsDocumented: false,
      cybersecurityResilienceTested: false,
      zeroDataRetentionSlaGuaranteed: false
    };

    const result = assessor.evaluateSystem(nonCompliantProfile);
    expect(result.riskTier).toBe("HIGH_RISK");
    expect(result.compliant).toBe(false);
    expect(result.conformityScorePercent).toBeLessThan(50);
    expect(result.mandatoryRequirements.length).toBeGreaterThanOrEqual(3);
  });

  it("classifies standard consumer GPAI under transparency tier", () => {
    const gpaiProfile: VendorAiSystemProfile = {
      vendorId: "vnd-chat-corp",
      vendorName: "CognitiveGen",
      systemName: "Model-9B",
      systemVersion: "1.2.0",
      primaryUseCase: "General customer support assistant",
      targetUsers: "CONSUMER",
      processesBiometricData: false,
      performsSubliminalManipulation: false,
      performsSocialScoring: false,
      performsEmotionRecognitionInWorkplace: false,
      annex3Domains: [],
      isGeneralPurposeAi: true,
      hasSystemicRisk: false,
      trainingDataGovernanceDocumented: true,
      humanOversightControlsDocumented: true,
      cybersecurityResilienceTested: true,
      zeroDataRetentionSlaGuaranteed: true
    };

    const result = assessor.evaluateSystem(gpaiProfile);
    expect(result.riskTier).toBe("TRANSPARENCY_ONLY");
    expect(result.compliant).toBe(true);
    expect(result.conformityScorePercent).toBe(100);
  });
});
