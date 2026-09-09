/**
 * QA-137: Real-Time B2B Security Questionnaire AI Auto-Completion Assistant.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Automatically analyzes incoming enterprise security questionnaires, matches questions
 * against verified trust evidence vaults, generates audit-grade responses with cryptographic
 * evidence citations, and flags low-confidence items for CISO review.
 */

import crypto from "crypto";

export type ComplianceFramework =
  | "SOC2"
  | "ISO27001"
  | "GDPR"
  | "FEDRAMP"
  | "NIST_CSF"
  | "HIPAA"
  | "CUSTOM";

export type ReviewStatus = "AUTO_APPROVED" | "REQUIRES_HUMAN_REVIEW";

export interface KnowledgeBaseEvidence {
  id: string;
  category: string;
  keywords: string[];
  standardAnswer: string;
  evidenceAnchor: string;
  documentRef: string;
  complianceMappings: ComplianceFramework[];
}

export interface InboundQuestion {
  id: string;
  questionText: string;
  framework?: ComplianceFramework;
  customNotes?: string;
}

export interface AutoCompletedAnswer {
  questionId: string;
  questionText: string;
  generatedAnswer: string;
  confidenceScore: number; // 0.0 to 1.0
  reviewStatus: ReviewStatus;
  matchedEvidenceId: string;
  evidenceAnchor: string;
  documentRef: string;
  relevantFrameworks: ComplianceFramework[];
}

export interface QuestionnaireAssistantSummary {
  questionnaireId: string;
  organizationId: string;
  timestamp: string;
  totalQuestions: number;
  autoApprovedCount: number;
  reviewRequiredCount: number;
  averageConfidence: number;
  completionRatePercent: number;
  auditSignature: string;
  answers: AutoCompletedAnswer[];
}

export const VERIFIED_EVIDENCE_VAULT: KnowledgeBaseEvidence[] = [
  {
    id: "EV-ENC-01",
    category: "Encryption & Key Management",
    keywords: ["encrypt", "aes-256", "rest", "transit", "tls", "key rotation", "kms"],
    standardAnswer:
      "All customer data is encrypted at rest using AES-256 with automated envelope key rotation via hardware security modules. Data in transit is strictly encrypted using TLS 1.3 with forward secrecy.",
    evidenceAnchor: "[DOC-SOC2-TYPE2#CC6.1-ENCRYPTION]",
    documentRef: "SOC 2 Type II Security Report - Section IV.B",
    complianceMappings: ["SOC2", "ISO27001", "GDPR", "FEDRAMP", "NIST_CSF", "HIPAA"]
  },
  {
    id: "EV-AUTH-02",
    category: "Authentication & Access Control",
    keywords: ["mfa", "2fa", "sso", "saml", "rbac", "least privilege", "access control", "password"],
    standardAnswer:
      "Mandatory Multi-Factor Authentication (MFA) via FIDO2/WebAuthn or TOTP is enforced across all internal and administrative systems. Enterprise customers can integrate SAML 2.0 / OIDC SSO with role-based access control (RBAC) and just-in-time provisioning.",
    evidenceAnchor: "[DOC-ISO27001#A.9.2-AUTHENTICATION]",
    documentRef: "ISO/IEC 27001:2022 Statement of Applicability Annex A.9",
    complianceMappings: ["SOC2", "ISO27001", "FEDRAMP", "NIST_CSF"]
  },
  {
    id: "EV-BCDR-03",
    category: "Disaster Recovery & Business Continuity",
    keywords: ["disaster recovery", "business continuity", "bcp", "dr", "backup", "rpo", "rto"],
    standardAnswer:
      "We maintain multi-region hot-standby replicas with automated failover. Recovery Point Objective (RPO) is guaranteed < 1 hour, and Recovery Time Objective (RTO) is < 4 hours. Full restoration drills are executed and audited semi-annually.",
    evidenceAnchor: "[DOC-SOC2-TYPE2#A1.2-BCDR]",
    documentRef: "Business Continuity & Disaster Recovery Plan v4.2",
    complianceMappings: ["SOC2", "ISO27001", "NIST_CSF", "HIPAA"]
  },
  {
    id: "EV-VULN-04",
    category: "Vulnerability & Threat Management",
    keywords: ["penetration test", "pen test", "vulnerability", "patching", "cve", "static analysis", "sast", "dast"],
    standardAnswer:
      "Independent third-party penetration testing is conducted annually by accredited CREST-certified testers. Continuous SAST/DAST pipelines scan every code commit, and critical CVEs are remediated within an SLA of 14 days or fewer.",
    evidenceAnchor: "[DOC-PEN-TEST-2026#EXECUTIVE-SUMMARY]",
    documentRef: "Annual Third-Party Penetration Test & Remediation Attestation 2026",
    complianceMappings: ["SOC2", "ISO27001", "FEDRAMP"]
  },
  {
    id: "EV-PRIV-05",
    category: "Privacy & Sub-Processor Management",
    keywords: ["gdpr", "sub-processor", "dpa", "data residency", "scc", "dsar", "right to be forgotten", "deletion"],
    standardAnswer:
      "We execute standard Article 28 GDPR Data Processing Agreements (DPAs) with Standard Contractual Clauses (SCCs). Sub-processors undergo continuous security re-evaluations. Complete cryptographic tenant data deletion is completed within 30 days of contract termination.",
    evidenceAnchor: "[DOC-GDPR-ART28#SUBPROCESSOR-GOVERNANCE]",
    documentRef: "VendorShield GDPR Article 28 Governance & Sub-Processor Register",
    complianceMappings: ["GDPR", "ISO27001", "HIPAA"]
  },
  {
    id: "EV-INC-06",
    category: "Incident Response & Notification",
    keywords: ["incident", "breach", "notification", "security event", "72 hours", "soc", "siem"],
    standardAnswer:
      "Our 24/7 Security Operations Center (SOC) utilizes centralized SIEM and automated anomaly detection. In the event of a confirmed personal data breach, affected customers are notified without undue delay and within 72 hours in compliance with GDPR Art. 33.",
    evidenceAnchor: "[DOC-INCIDENT-RESPONSE#BREACH-SLA]",
    documentRef: "Global Security Incident Response Runbook & SLA v3.1",
    complianceMappings: ["SOC2", "ISO27001", "GDPR", "FEDRAMP"]
  }
];

export class SecurityQuestionnaireAssistant {
  private knowledgeBase: KnowledgeBaseEvidence[];
  private autoApproveConfidenceThreshold: number;

  constructor(
    customVault?: KnowledgeBaseEvidence[],
    confidenceThreshold: number = 0.75
  ) {
    this.knowledgeBase = customVault || VERIFIED_EVIDENCE_VAULT;
    this.autoApproveConfidenceThreshold = confidenceThreshold;
  }

  /**
   * Process a single question and match against the knowledge base.
   */
  public answerQuestion(inbound: InboundQuestion): AutoCompletedAnswer {
    const textLower = inbound.questionText.toLowerCase();
    let bestMatch: KnowledgeBaseEvidence | null = null;
    let highestScore = 0;

    for (const evidence of this.knowledgeBase) {
      let matchedKeywords = 0;
      for (const kw of evidence.keywords) {
        if (textLower.includes(kw.toLowerCase())) {
          matchedKeywords++;
        }
      }

      if (matchedKeywords > 0) {
        // Base confidence calculated from keyword density and specificity
        let score = Math.min(1.0, 0.45 + matchedKeywords * 0.18);

        // Boost confidence if question specified framework matches evidence mappings
        if (inbound.framework && evidence.complianceMappings.includes(inbound.framework)) {
          score = Math.min(1.0, score + 0.15);
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = evidence;
        }
      }
    }

    if (!bestMatch || highestScore < 0.4) {
      return {
        questionId: inbound.id,
        questionText: inbound.questionText,
        generatedAnswer:
          "This question requires customized enterprise policy review. Please consult the VendorShield compliance portal or request custom CISO attestation.",
        confidenceScore: 0.2,
        reviewStatus: "REQUIRES_HUMAN_REVIEW",
        matchedEvidenceId: "NONE",
        evidenceAnchor: "N/A",
        documentRef: "N/A",
        relevantFrameworks: inbound.framework ? [inbound.framework] : []
      };
    }

    const reviewStatus: ReviewStatus =
      highestScore >= this.autoApproveConfidenceThreshold
        ? "AUTO_APPROVED"
        : "REQUIRES_HUMAN_REVIEW";

    return {
      questionId: inbound.id,
      questionText: inbound.questionText,
      generatedAnswer: bestMatch.standardAnswer,
      confidenceScore: Math.round(highestScore * 100) / 100,
      reviewStatus,
      matchedEvidenceId: bestMatch.id,
      evidenceAnchor: bestMatch.evidenceAnchor,
      documentRef: bestMatch.documentRef,
      relevantFrameworks: bestMatch.complianceMappings
    };
  }

  /**
   * Batch process an entire questionnaire and produce an audit-grade package.
   */
  public processQuestionnaire(
    questionnaireId: string,
    organizationId: string,
    questions: InboundQuestion[]
  ): QuestionnaireAssistantSummary {
    const answers = questions.map((q) => this.answerQuestion(q));
    const totalQuestions = answers.length;
    const autoApprovedCount = answers.filter((a) => a.reviewStatus === "AUTO_APPROVED").length;
    const reviewRequiredCount = totalQuestions - autoApprovedCount;

    const totalConfidence = answers.reduce((sum, a) => sum + a.confidenceScore, 0);
    const averageConfidence =
      totalQuestions > 0 ? Math.round((totalConfidence / totalQuestions) * 100) / 100 : 0;
    const completionRatePercent =
      totalQuestions > 0 ? Math.round((autoApprovedCount / totalQuestions) * 100) : 0;

    const timestamp = new Date().toISOString();
    const digestSeed = `${questionnaireId}:${organizationId}:${totalQuestions}:${autoApprovedCount}:${timestamp}`;
    const auditSignature = `VS-ASSIST-${crypto
      .createHash("sha256")
      .update(digestSeed)
      .digest("hex")
      .substring(0, 16)
      .toUpperCase()}`;

    return {
      questionnaireId,
      organizationId,
      timestamp,
      totalQuestions,
      autoApprovedCount,
      reviewRequiredCount,
      averageConfidence,
      completionRatePercent,
      auditSignature,
      answers
    };
  }
}
