/**
 * QA-200: Automated Third-Party SaaS Security Questionnaire AI Answer Arbiter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Automatically arbitrates, evaluates, and grounds vendor security questionnaire responses
 * against attested compliance policies, SOC 2 Type II controls, and ISO 27001:2022 clauses.
 */

import { createHash } from "crypto";

export interface SecurityPolicyClause {
  clauseId: string;
  framework: "SOC2_TYPE_II" | "ISO_27001" | "GDPR" | "NIST_CSF";
  title: string;
  attestedEvidenceSummary: string;
  auditEvidenceDigest: string;
  isEnforced: boolean;
}

export interface QuestionnaireQuestion {
  questionId: string;
  standardCatalog?: "SIG_CORE" | "SIG_LITE" | "CAIQ_V4" | "CUSTOM";
  questionText: string;
  requiresEvidenceAttachment: boolean;
}

export interface ArbitratedQuestionnaireAnswer {
  questionId: string;
  questionText: string;
  generatedAnswerText: string;
  conformanceStatus: "FULLY_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT";
  confidenceScorePercent: number;
  matchedClauseId?: string;
  frameworkRef?: string;
  evidenceAuditDigest?: string;
  hallucinationRisk: "NONE" | "LOW" | "HIGH";
  attestationSignature: string;
}

export class SecurityQuestionnaireAiAnswerArbiter {
  private policyClauses: Map<string, SecurityPolicyClause> = new Map();

  constructor(initialClauses?: SecurityPolicyClause[]) {
    if (initialClauses) {
      for (const clause of initialClauses) {
        this.policyClauses.set(clause.clauseId, clause);
      }
    }
  }

  public arbitrateQuestion(question: QuestionnaireQuestion): ArbitratedQuestionnaireAnswer {
    if (!question.questionId || !question.questionText) {
      throw new Error("questionId and questionText are required.");
    }

    const qLower = question.questionText.toLowerCase();

    // Semantic matching against attested policy clauses
    let matchedClause: SecurityPolicyClause | undefined;
    for (const clause of this.policyClauses.values()) {
      const titleWords = clause.title.toLowerCase().split(/\s+/);
      const hasOverlap = titleWords.some((w) => w.length > 3 && qLower.includes(w));
      if (hasOverlap) {
        matchedClause = clause;
        break;
      }
    }

    let conformanceStatus: "FULLY_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" = "NON_COMPLIANT";
    let confidenceScore = 15.0;
    let answerText = "No attested policy evidence found to substantiate this requirement.";
    let hallucinationRisk: "NONE" | "LOW" | "HIGH" = "HIGH";

    if (matchedClause) {
      if (matchedClause.isEnforced) {
        conformanceStatus = "FULLY_COMPLIANT";
        confidenceScore = 98.5;
        hallucinationRisk = "NONE";
        answerText = `Yes. VendorShield enforces this via ${matchedClause.clauseId} (${matchedClause.framework}): ${matchedClause.attestedEvidenceSummary}`;
      } else {
        conformanceStatus = "PARTIALLY_COMPLIANT";
        confidenceScore = 70.0;
        hallucinationRisk = "LOW";
        answerText = `Under development. Policy ${matchedClause.clauseId} is defined but runtime enforcement is pending remediation.`;
      }
    }

    const payload = `${question.questionId}:${conformanceStatus}:${confidenceScore}:${matchedClause?.clauseId ?? "NONE"}`;
    const signature = createHash("sha256").update(payload).digest("hex");

    return {
      questionId: question.questionId,
      questionText: question.questionText,
      generatedAnswerText: answerText,
      conformanceStatus,
      confidenceScorePercent: confidenceScore,
      matchedClauseId: matchedClause?.clauseId,
      frameworkRef: matchedClause?.framework,
      evidenceAuditDigest: matchedClause?.auditEvidenceDigest,
      hallucinationRisk,
      attestationSignature: signature,
    };
  }
}
