import { describe, it, expect } from "vitest";
import {
  SecurityQuestionnaireAssistant,
  SecurityQuestionInput,
} from "./security-questionnaire-assistant";

describe("QA-137: Real-Time B2B Security Questionnaire AI Auto-Completion Assistant", () => {
  it("accurately auto-completes encryption question with citations and high confidence", () => {
    const q: SecurityQuestionInput = {
      questionId: "sec-01",
      questionText: "Do you encrypt customer data at rest and in transit, and what is your key management policy?",
    };

    const answer = SecurityQuestionnaireAssistant.answerSingleQuestion(q);
    expect(answer.questionId).toBe("sec-01");
    expect(answer.matchedDomain).toBe("ENCRYPTION_AND_KEY_MANAGEMENT");
    expect(answer.suggestedAnswer).toContain("TLS 1.3");
    expect(answer.suggestedAnswer).toContain("AES-256");
    expect(answer.auditCitation).toContain("SOC 2 Type II");
    expect(answer.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(answer.status).toBe("AUTO_ANSWERED");
    expect(answer.requiresHumanReview).toBe(false);
  });

  it("accurately auto-completes vendor risk and sub-processor questions", () => {
    const q: SecurityQuestionInput = {
      questionId: "sec-02",
      questionText: "How do you evaluate third party vendor risk and do you sign DPAs with sub-processors?",
    };

    const answer = SecurityQuestionnaireAssistant.answerSingleQuestion(q);
    expect(answer.matchedDomain).toBe("SUB_PROCESSOR_AND_VENDOR_RISK");
    expect(answer.suggestedAnswer).toContain("Standard Contractual Clauses");
    expect(answer.auditCitation).toContain("ISO 27001");
    expect(answer.status).toBe("AUTO_ANSWERED");
  });

  it("flags obscure or unknown questions for human review", () => {
    const q: SecurityQuestionInput = {
      questionId: "sec-unknown",
      questionText: "Does your office building have armed guards at the parking lot entrance gate?",
    };

    const answer = SecurityQuestionnaireAssistant.answerSingleQuestion(q);
    expect(answer.confidenceScore).toBeLessThan(0.50);
    expect(answer.status).toBe("NEEDS_REVIEW");
    expect(answer.requiresHumanReview).toBe(true);
  });

  it("processes batch questionnaire and outputs verified package with sha256 checksum", () => {
    const questions: SecurityQuestionInput[] = [
      { questionId: "q1", questionText: "What is your MFA policy?" },
      { questionId: "q2", questionText: "Tell us about your disaster recovery plan and RTO/RPO." },
      { questionId: "q3", questionText: "What is the square footage of your data center server racks?" },
    ];

    const pkg = SecurityQuestionnaireAssistant.completeQuestionnaire("tenant-enterprise-99", questions);
    expect(pkg.tenantId).toBe("tenant-enterprise-99");
    expect(pkg.totalQuestions).toBe(3);
    expect(pkg.autoAnsweredCount).toBe(2);
    expect(pkg.humanReviewCount).toBe(1);
    expect(pkg.automationCoveragePct).toBe(66.7);
    expect(pkg.verificationSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
