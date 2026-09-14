/**
 * src/lib/vendor-questionnaire-pdf-auto-responder.regression.test.ts
 * Regression tests for QA-118: Vendor Security Questionnaire PDF Auto-Responder & Risk Scoring Matrix.
 */

import { describe, it, expect } from "vitest";
import {
  VendorQuestionnairePdfAutoResponder,
  type QuestionnaireItem,
} from "./vendor-questionnaire-pdf-auto-responder";

describe("VendorQuestionnairePdfAutoResponder", () => {
  const responder = new VendorQuestionnairePdfAutoResponder();

  const standardQuestionnaire: QuestionnaireItem[] = [
    {
      id: "Q-01",
      category: "ENCRYPTION",
      prompt: "How is customer data encrypted at rest and in transit?",
    },
    {
      id: "Q-02",
      category: "ACCESS_CONTROL",
      prompt: "What MFA requirements are enforced on production systems?",
    },
    {
      id: "Q-03",
      category: "INCIDENT_RESPONSE",
      prompt: "Describe your data breach notification SLA.",
    },
    {
      id: "Q-04",
      category: "PRIVACY",
      prompt: "Do you offer a GDPR-compliant Data Processing Addendum?",
    },
  ];

  it("evaluates a standard questionnaire with low risk score and compliant ratings", () => {
    const report = responder.evaluateQuestionnaire("Acme Cloud Solutions", standardQuestionnaire);

    expect(report.vendorName).toBe("Acme Cloud Solutions");
    expect(report.totalQuestions).toBe(4);
    expect(report.overallRiskScore).toBeLessThanOrEqual(20);
    expect(report.riskTier).toBe("LOW_RISK_APPROVED");
    expect(report.answers).toHaveLength(4);
    expect(report.answers[0].complianceRating).toBe("COMPLIANT");
    expect(report.answers[0].evidenceRef).toContain("SOC 2");
    expect(report.pdfMetadata.evidenceSeal).toHaveLength(64);
  });

  it("handles single-item questionnaires and computes correct tier", () => {
    const singleItem: QuestionnaireItem[] = [
      {
        id: "Q-SINGLE",
        category: "BUSINESS_CONTINUITY",
        prompt: "What are your RTO and RPO targets?",
      },
    ];
    const report = responder.evaluateQuestionnaire("Global Logistics Corp", singleItem);

    expect(report.totalQuestions).toBe(1);
    expect(report.overallRiskScore).toBe(12);
    expect(report.riskTier).toBe("LOW_RISK_APPROVED");
  });

  it("validates inputs and throws appropriate errors", () => {
    expect(() => responder.evaluateQuestionnaire("", standardQuestionnaire)).toThrow(
      "vendorName must be a non-empty string"
    );
    expect(() => responder.evaluateQuestionnaire("Valid Vendor", [])).toThrow(
      "items must contain at least one questionnaire item"
    );
  });
});
