import { describe, it, expect } from "vitest";
import {
  SecurityQuestionnaireAiAnswerArbiter,
  SecurityPolicyClause
} from "./security-questionnaire-ai-answer-arbiter";

describe("QA-200: Automated Third-Party SaaS Security Questionnaire AI Answer Arbiter", () => {
  const policies: SecurityPolicyClause[] = [
    {
      clauseId: "POL-SEC-01",
      framework: "SOC2_TYPE_II",
      title: "Multi-Factor Authentication MFA Enforcement",
      attestedEvidenceSummary: "Mandatory hardware WebAuthn / FIDO2 MFA enforced for all production consoles.",
      auditEvidenceDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      isEnforced: true
    },
    {
      clauseId: "POL-CRYPTO-02",
      framework: "ISO_27001",
      title: "Encryption At Rest Database",
      attestedEvidenceSummary: "Customer data encrypted with AWS KMS customer-managed keys using AES-256-GCM.",
      auditEvidenceDigest: "4a8a08f09d37b73795649038408b5f33021aecab71ac4e8e4f7ad8263d5c0269",
      isEnforced: true
    },
    {
      clauseId: "POL-DISASTER-03",
      framework: "NIST_CSF",
      title: "Multi-Region Cold Disaster Recovery Failover",
      attestedEvidenceSummary: "Automated failover runbooks created, quarterly DR drill pending final audit.",
      auditEvidenceDigest: "5d41402abc4b2a76b9719d911017c592",
      isEnforced: false
    }
  ];

  it("arbitrates a compliant answer grounded in enforced SOC 2 policy evidence", () => {
    const arbiter = new SecurityQuestionnaireAiAnswerArbiter(policies);

    const result = arbiter.arbitrateQuestion({
      questionId: "SIG-MFA-001",
      standardCatalog: "SIG_CORE",
      questionText: "Do you require Multi-Factor Authentication MFA on all administrative systems?",
      requiresEvidenceAttachment: true
    });

    expect(result.conformanceStatus).toBe("FULLY_COMPLIANT");
    expect(result.confidenceScorePercent).toBeGreaterThan(95.0);
    expect(result.hallucinationRisk).toBe("NONE");
    expect(result.matchedClauseId).toBe("POL-SEC-01");
    expect(result.frameworkRef).toBe("SOC2_TYPE_II");
    expect(result.attestationSignature).toHaveLength(64);
  });

  it("identifies partially compliant controls undergoing remediation without hallucinating compliance", () => {
    const arbiter = new SecurityQuestionnaireAiAnswerArbiter(policies);

    const result = arbiter.arbitrateQuestion({
      questionId: "SIG-DR-004",
      standardCatalog: "SIG_LITE",
      questionText: "Do you have automated Multi-Region Disaster Recovery failover capabilities?",
      requiresEvidenceAttachment: false
    });

    expect(result.conformanceStatus).toBe("PARTIALLY_COMPLIANT");
    expect(result.hallucinationRisk).toBe("LOW");
    expect(result.generatedAnswerText).toContain("pending remediation");
  });

  it("flags non-compliant requirements with high hallucination risk when ungrounded", () => {
    const arbiter = new SecurityQuestionnaireAiAnswerArbiter(policies);

    const result = arbiter.arbitrateQuestion({
      questionId: "CUSTOM-QUANTUM-01",
      questionText: "Do you use post-quantum lattice cryptography for all internal IoT sensors?",
      requiresEvidenceAttachment: true
    });

    expect(result.conformanceStatus).toBe("NON_COMPLIANT");
    expect(result.confidenceScorePercent).toBeLessThan(30.0);
    expect(result.hallucinationRisk).toBe("HIGH");
    expect(result.matchedClauseId).toBeUndefined();
  });

  it("throws validation error when mandatory question fields are missing", () => {
    const arbiter = new SecurityQuestionnaireAiAnswerArbiter(policies);
    expect(() => {
      arbiter.arbitrateQuestion({
        questionId: "",
        questionText: "Test question?",
        requiresEvidenceAttachment: false
      });
    }).toThrow("questionId and questionText are required.");
  });
});
