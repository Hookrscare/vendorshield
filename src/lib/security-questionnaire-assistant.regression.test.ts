/**
 * QA-137: Real-Time B2B Security Questionnaire AI Auto-Completion Assistant.
 * Regression Tests.
 */

import { describe, it, expect } from "vitest";
import {
  SecurityQuestionnaireAssistant,
  InboundQuestion,
  VERIFIED_EVIDENCE_VAULT
} from "./security-questionnaire-assistant";

describe("QA-137: SecurityQuestionnaireAssistant", () => {
  const assistant = new SecurityQuestionnaireAssistant();

  it("auto-completes encryption question with high confidence and exact SOC 2 anchor", () => {
    const question: InboundQuestion = {
      id: "q-101",
      questionText: "How is customer data encrypted at rest and what key management protocols are used?",
      framework: "SOC2"
    };

    const answer = assistant.answerQuestion(question);
    expect(answer.reviewStatus).toBe("AUTO_APPROVED");
    expect(answer.confidenceScore).toBeGreaterThanOrEqual(0.75);
    expect(answer.matchedEvidenceId).toBe("EV-ENC-01");
    expect(answer.evidenceAnchor).toContain("CC6.1-ENCRYPTION");
    expect(answer.generatedAnswer).toContain("AES-256");
  });

  it("correctly identifies multi-factor authentication controls for ISO 27001", () => {
    const question: InboundQuestion = {
      id: "q-102",
      questionText: "Do you enforce MFA and SAML 2.0 SSO with RBAC access control?",
      framework: "ISO27001"
    };

    const answer = assistant.answerQuestion(question);
    expect(answer.reviewStatus).toBe("AUTO_APPROVED");
    expect(answer.matchedEvidenceId).toBe("EV-AUTH-02");
    expect(answer.evidenceAnchor).toContain("A.9.2-AUTHENTICATION");
  });

  it("flags ambiguous or unknown questions for human CISO review", () => {
    const question: InboundQuestion = {
      id: "q-103",
      questionText: "What is your internal cafeteria biometric thumbprint scanning policy?",
      framework: "CUSTOM"
    };

    const answer = assistant.answerQuestion(question);
    expect(answer.reviewStatus).toBe("REQUIRES_HUMAN_REVIEW");
    expect(answer.confidenceScore).toBeLessThan(0.5);
    expect(answer.matchedEvidenceId).toBe("NONE");
  });

  it("processes a complete multi-domain questionnaire with audit signature and metrics", () => {
    const questions: InboundQuestion[] = [
      {
        id: "q-1",
        questionText: "How is data encrypted at rest and in transit?",
        framework: "SOC2"
      },
      {
        id: "q-2",
        questionText: "What are your RPO and RTO disaster recovery targets?",
        framework: "SOC2"
      },
      {
        id: "q-3",
        questionText: "How often are third-party penetration tests executed?",
        framework: "ISO27001"
      },
      {
        id: "q-4",
        questionText: "What is your custom drone perimeter defense policy?",
        framework: "CUSTOM"
      }
    ];

    const summary = assistant.processQuestionnaire("quest-2026-acme", "org-acme-corp", questions);

    expect(summary.totalQuestions).toBe(4);
    expect(summary.autoApprovedCount).toBe(3);
    expect(summary.reviewRequiredCount).toBe(1);
    expect(summary.completionRatePercent).toBe(75);
    expect(summary.auditSignature).toMatch(/^VS-ASSIST-[A-F0-9]{16}$/);
    expect(summary.averageConfidence).toBeGreaterThan(0.6);
  });
});
