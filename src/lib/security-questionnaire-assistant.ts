/**
 * QA-137: Real-Time B2B Security Questionnaire AI Auto-Completion Assistant.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Automatically classifies incoming enterprise security questions (SIG, CAIQ, VSA),
 * retrieves authoritative audit evidence citations, generates high-confidence answers,
 * and produces tamper-evident questionnaire response packages.
 */

import { createHash } from "crypto";

export type SecurityDomain =
  | "ENCRYPTION_AND_KEY_MANAGEMENT"
  | "ACCESS_CONTROL_AND_IAM"
  | "INCIDENT_RESPONSE_AND_BCP"
  | "SUB_PROCESSOR_AND_VENDOR_RISK"
  | "DATA_PRIVACY_AND_GDPR"
  | "VULNERABILITY_AND_PEN_TESTING";

export interface ComplianceEvidenceItem {
  domain: SecurityDomain;
  keywords: string[];
  canonicalAnswer: string;
  auditCitation: string;
  policyReference: string;
  defaultConfidence: number;
}

export interface SecurityQuestionInput {
  questionId: string;
  questionText: string;
  targetCategory?: string;
}

export interface SecurityQuestionAnswer {
  questionId: string;
  questionText: string;
  matchedDomain: SecurityDomain;
  suggestedAnswer: string;
  auditCitation: string;
  policyReference: string;
  confidenceScore: number;
  requiresHumanReview: boolean;
  status: "AUTO_ANSWERED" | "NEEDS_REVIEW";
}

export interface CompletedQuestionnairePackage {
  packageId: string;
  tenantId: string;
  totalQuestions: number;
  autoAnsweredCount: number;
  humanReviewCount: number;
  automationCoveragePct: number;
  answers: SecurityQuestionAnswer[];
  timestampIso: string;
  verificationSha256: string;
}

export class SecurityQuestionnaireAssistant {
  private static KNOWLEDGE_BASE: ComplianceEvidenceItem[] = [
    {
      domain: "ENCRYPTION_AND_KEY_MANAGEMENT",
      keywords: ["encrypt", "at rest", "in transit", "aes", "tls", "key management", "kms"],
      canonicalAnswer:
        "All customer data is encrypted in transit using TLS 1.3 with strong cipher suites and encrypted at rest using AES-256 via hardware security modules (HSM) with annual automated key rotation.",
      auditCitation: "SOC 2 Type II Report, Section IV, CC6.1 & CC6.7",
      policyReference: "Information Security Policy Section 4.2 (Cryptographic Controls)",
      defaultConfidence: 0.95,
    },
    {
      domain: "ACCESS_CONTROL_AND_IAM",
      keywords: ["mfa", "2fa", "access control", "rbac", "least privilege", "sso", "saml"],
      canonicalAnswer:
        "Strict Least Privilege Role-Based Access Control (RBAC) and mandatory hardware-backed MFA are enforced across all production environments. Enterprise SSO via SAML 2.0 / OIDC is supported.",
      auditCitation: "SOC 2 Type II Report, Section IV, CC6.2 & CC6.3",
      policyReference: "Access Management & Password Policy Section 3.1",
      defaultConfidence: 0.94,
    },
    {
      domain: "INCIDENT_RESPONSE_AND_BCP",
      keywords: ["incident", "breach", "dr", "bcp", "disaster recovery", "rto", "rpo", "backup"],
      canonicalAnswer:
        "We maintain a 24/7 CSIRT incident response team with guaranteed 72-hour GDPR-compliant customer breach notifications. Multi-region automated snapshots guarantee an RPO < 1 hour and RTO < 4 hours.",
      auditCitation: "SOC 2 Type II Report, Section IV, A1.2 & CC7.3",
      policyReference: "Business Continuity & Incident Response Plan v3.4",
      defaultConfidence: 0.92,
    },
    {
      domain: "SUB_PROCESSOR_AND_VENDOR_RISK",
      keywords: ["sub-processor", "third party", "vendor risk", "dpa", "scc", "supply chain"],
      canonicalAnswer:
        "All third-party sub-processors undergo mandatory annual SOC 2/ISO 27001 reassessments, execute GDPR Article 28 DPAs with EU Standard Contractual Clauses (SCCs), and are continuously monitored.",
      auditCitation: "ISO 27001:2022 Control A.5.19 & A.5.20",
      policyReference: "Third-Party Vendor Risk Management Framework",
      defaultConfidence: 0.96,
    },
    {
      domain: "DATA_PRIVACY_AND_GDPR",
      keywords: ["gdpr", "ccpa", "dsar", "deletion", "data subject", "privacy", "retention"],
      canonicalAnswer:
        "We are fully compliant with GDPR and CCPA. Customers can execute programmatic Data Subject Access Requests (DSAR) and automated data deletion with cryptographic deletion attestations.",
      auditCitation: "ISO 27701 Privacy Information Management System Audit",
      policyReference: "Global Data Protection & Privacy Standard",
      defaultConfidence: 0.93,
    },
    {
      domain: "VULNERABILITY_AND_PEN_TESTING",
      keywords: ["pen test", "penetration", "vulnerability", "cve", "static analysis", "sast", "dast"],
      canonicalAnswer:
        "Annual independent third-party gray-box penetration tests are conducted by CREST-accredited security firms. Continuous automated daily SAST/DAST vulnerability scans enforce zero critical open CVEs.",
      auditCitation: "SOC 2 Type II Report, Section IV, CC7.1",
      policyReference: "Vulnerability Management & Pen Testing Charter",
      defaultConfidence: 0.95,
    },
  ];

  public static answerSingleQuestion(input: SecurityQuestionInput): SecurityQuestionAnswer {
    const textLower = input.questionText.toLowerCase();
    let bestMatch: ComplianceEvidenceItem | null = null;
    let maxMatchedKeywords = 0;

    for (const item of this.KNOWLEDGE_BASE) {
      let matchCount = 0;
      for (const kw of item.keywords) {
        if (textLower.includes(kw)) {
          matchCount++;
        }
      }
      if (matchCount > maxMatchedKeywords) {
        maxMatchedKeywords = matchCount;
        bestMatch = item;
      }
    }

    if (!bestMatch || maxMatchedKeywords === 0) {
      return {
        questionId: input.questionId,
        questionText: input.questionText,
        matchedDomain: "INCIDENT_RESPONSE_AND_BCP",
        suggestedAnswer:
          "This question requires bespoke vendor context. Please consult our Trust Hub documentation or submit a manual clarification request.",
        auditCitation: "Pending Documentation",
        policyReference: "General Trust Security Standard",
        confidenceScore: 0.25,
        requiresHumanReview: true,
        status: "NEEDS_REVIEW",
      };
    }

    // Dynamic confidence based on keyword match depth
    const confidence = Number(
      Math.min(0.99, bestMatch.defaultConfidence * (0.8 + 0.1 * Math.min(3, maxMatchedKeywords))).toFixed(2)
    );
    const requiresReview = confidence < 0.85;

    return {
      questionId: input.questionId,
      questionText: input.questionText,
      matchedDomain: bestMatch.domain,
      suggestedAnswer: bestMatch.canonicalAnswer,
      auditCitation: bestMatch.auditCitation,
      policyReference: bestMatch.policyReference,
      confidenceScore: confidence,
      requiresHumanReview: requiresReview,
      status: requiresReview ? "NEEDS_REVIEW" : "AUTO_ANSWERED",
    };
  }

  public static completeQuestionnaire(
    tenantId: string,
    questions: SecurityQuestionInput[]
  ): CompletedQuestionnairePackage {
    const answers: SecurityQuestionAnswer[] = questions.map((q) => this.answerSingleQuestion(q));

    const total = answers.length;
    const autoAnswered = answers.filter((a) => a.status === "AUTO_ANSWERED").length;
    const humanReview = total - autoAnswered;
    const coveragePct = total > 0 ? Number(((autoAnswered / total) * 100).toFixed(1)) : 100.0;

    const timestampIso = new Date().toISOString();
    const digestPayload = JSON.stringify({ tenantId, timestampIso, answers });
    const hash = createHash("sha256").update(digestPayload).digest("hex");

    return {
      packageId: `quest-pkg-${tenantId}-${Date.now()}`,
      tenantId,
      totalQuestions: total,
      autoAnsweredCount: autoAnswered,
      humanReviewCount: humanReview,
      automationCoveragePct: coveragePct,
      answers,
      timestampIso,
      verificationSha256: hash,
    };
  }
}
