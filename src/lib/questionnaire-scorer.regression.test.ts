import { describe, it, expect } from "vitest";
import {
  evaluateQuestionnaire,
  autoAnswerQuestion,
  QuestionnaireItem,
} from "./questionnaire-scorer";

describe("QA-118: Vendor Security Questionnaire Auto-Responder & Risk Scoring Matrix", () => {
  const compliantItems: QuestionnaireItem[] = [
    {
      id: "AC-01",
      domain: "ACCESS_CONTROL",
      question: "Is Multi-Factor Authentication (MFA) enforced for all production access?",
      answer: "YES",
      evidenceReference: "SOC 2 Type II Report Section 4.2",
      isMandatoryControl: true,
      weight: 5,
    },
    {
      id: "DP-01",
      domain: "DATA_PROTECTION_ENCRYPTION",
      question: "Is customer data encrypted in transit using TLS 1.3 and at rest using AES-256?",
      answer: "YES",
      evidenceReference: "AWS KMS & TLS Configuration Policy",
      isMandatoryControl: true,
      weight: 5,
    },
    {
      id: "IR-01",
      domain: "INCIDENT_RESPONSE",
      question: "Are security incidents notified to customers within 72 hours?",
      answer: "YES",
      evidenceReference: "Incident Response Playbook v3.1",
      isMandatoryControl: true,
      weight: 4,
    },
    {
      id: "VM-01",
      domain: "VULNERABILITY_MANAGEMENT",
      question: "Is an annual third-party penetration test conducted?",
      answer: "YES",
      evidenceReference: "2026 BishopFox PenTest Attestation",
      isMandatoryControl: false,
      weight: 3,
    },
  ];

  it("should evaluate fully compliant vendor questionnaire with GRADE_A", () => {
    const res = evaluateQuestionnaire("v-stripe", "Stripe Inc", compliantItems);

    expect(res.overallScore).toBe(100.0);
    expect(res.ratingGrade).toBe("GRADE_A");
    expect(res.passedThreshold).toBe(true);
    expect(res.criticalGaps).toHaveLength(0);
    expect(res.domainScores.ACCESS_CONTROL.scorePercentage).toBe(100.0);
  });

  it("should flag mandatory control failure as critical gap and prevent passing", () => {
    const flawedItems: QuestionnaireItem[] = [
      ...compliantItems.slice(0, 1), // AC-01 YES
      {
        id: "DP-01",
        domain: "DATA_PROTECTION_ENCRYPTION",
        question: "Is customer data encrypted in transit and at rest?",
        answer: "NO", // Fatal gap on mandatory control
        isMandatoryControl: true,
        weight: 5,
      },
    ];

    const res = evaluateQuestionnaire("v-flawed", "Flawed Storage SaaS", flawedItems);

    expect(res.criticalGaps.length).toBeGreaterThan(0);
    expect(res.criticalGaps[0]).toContain("[CRITICAL GAP] DATA_PROTECTION_ENCRYPTION");
    expect(res.passedThreshold).toBe(false);
    // Grade should be capped at C or F due to critical gap
    expect(["GRADE_C", "GRADE_F"]).toContain(res.ratingGrade);
  });

  it("should exclude NOT_APPLICABLE questions from the scoring denominator", () => {
    const itemsWithNa: QuestionnaireItem[] = [
      {
        id: "AC-01",
        domain: "ACCESS_CONTROL",
        question: "Is MFA enforced?",
        answer: "YES",
        evidenceReference: "SOC 2 Section 4",
        weight: 5,
      },
      {
        id: "BC-01",
        domain: "BUSINESS_CONTINUITY_DR",
        question: "Do you maintain physical backup tape drives?",
        answer: "NOT_APPLICABLE", // Cloud-native SaaS
        weight: 5,
      },
    ];

    const res = evaluateQuestionnaire("v-cloud", "Cloud Co", itemsWithNa);

    // Total possible points should be 5, not 10
    expect(res.overallScore).toBe(100.0);
    expect(res.domainScores.BUSINESS_CONTINUITY_DR.totalPossiblePoints).toBe(0);
  });

  it("should auto-answer questions using policy knowledge base", () => {
    const knowledgeBase = {
      mfa: "Enforced for 100% of employees and production bastion hosts via Okta Verify.",
      encryption: "AES-256-GCM at rest; TLS 1.3 in transit.",
    };

    const res1 = autoAnswerQuestion("Does your organization require MFA for access?", knowledgeBase);
    expect(res1.answer).toBe("YES");
    expect(res1.evidence).toContain("Okta Verify");

    const res2 = autoAnswerQuestion("Do you support quantum key distribution?", knowledgeBase);
    expect(res2.answer).toBe("PARTIAL");
    expect(res2.evidence).toBeUndefined();
  });
});
