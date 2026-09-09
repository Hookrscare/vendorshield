/**
 * QA-118: Vendor Security Questionnaire Auto-Responder & Risk Scoring Matrix.
 * Automated grading and answer evaluation for SIG Lite, CSA CAIQ, and VSA questionnaires
 * for SOC 2 CC6.1-CC6.8 and ISO 27001 third-party risk management.
 */

export type SecurityDomain =
  | "ACCESS_CONTROL"
  | "DATA_PROTECTION_ENCRYPTION"
  | "INCIDENT_RESPONSE"
  | "BUSINESS_CONTINUITY_DR"
  | "VULNERABILITY_MANAGEMENT"
  | "COMPLIANCE_AUDIT";

export type QuestionAnswer = "YES" | "NO" | "PARTIAL" | "NOT_APPLICABLE";

export type SecurityRatingGrade = "GRADE_A" | "GRADE_B" | "GRADE_C" | "GRADE_F";

export interface QuestionnaireItem {
  id: string;
  domain: SecurityDomain;
  question: string;
  answer: QuestionAnswer;
  evidenceReference?: string;
  isMandatoryControl?: boolean;
  weight?: number; // 1 to 5, default 3
}

export interface DomainScoreSummary {
  domain: SecurityDomain;
  earnedPoints: number;
  totalPossiblePoints: number;
  scorePercentage: number;
  unansweredMandatoryCount: number;
}

export interface QuestionnaireEvaluation {
  vendorId: string;
  vendorName: string;
  overallScore: number; // 0 to 100
  ratingGrade: SecurityRatingGrade;
  passedThreshold: boolean;
  criticalGaps: string[];
  domainScores: Record<SecurityDomain, DomainScoreSummary>;
  totalQuestions: number;
  evaluatedAtIso: string;
}

const DEFAULT_PASSING_THRESHOLD = 75.0;

export function evaluateQuestionnaire(
  vendorId: string,
  vendorName: string,
  items: QuestionnaireItem[],
  passingScore: number = DEFAULT_PASSING_THRESHOLD
): QuestionnaireEvaluation {
  const domainTotals: Record<
    SecurityDomain,
    { earned: number; possible: number; mandatoryGaps: number }
  > = {
    ACCESS_CONTROL: { earned: 0, possible: 0, mandatoryGaps: 0 },
    DATA_PROTECTION_ENCRYPTION: { earned: 0, possible: 0, mandatoryGaps: 0 },
    INCIDENT_RESPONSE: { earned: 0, possible: 0, mandatoryGaps: 0 },
    BUSINESS_CONTINUITY_DR: { earned: 0, possible: 0, mandatoryGaps: 0 },
    VULNERABILITY_MANAGEMENT: { earned: 0, possible: 0, mandatoryGaps: 0 },
    COMPLIANCE_AUDIT: { earned: 0, possible: 0, mandatoryGaps: 0 },
  };

  const criticalGaps: string[] = [];

  for (const item of items) {
    if (item.answer === "NOT_APPLICABLE") {
      continue;
    }

    const weight = item.weight || 3;
    const stats = domainTotals[item.domain];
    stats.possible += weight;

    if (item.answer === "YES") {
      // Bonus multiplier if verified with audit evidence
      const points = item.evidenceReference ? weight * 1.0 : weight * 0.9;
      stats.earned += points;
    } else if (item.answer === "PARTIAL") {
      stats.earned += weight * 0.4;
      if (item.isMandatoryControl) {
        criticalGaps.push(`[MANDATORY PARTIAL] ${item.domain}: ${item.question}`);
        stats.mandatoryGaps++;
      }
    } else if (item.answer === "NO") {
      if (item.isMandatoryControl) {
        criticalGaps.push(`[CRITICAL GAP] ${item.domain}: ${item.question}`);
        stats.mandatoryGaps++;
      }
    }
  }

  let totalEarned = 0;
  let totalPossible = 0;
  const domainSummaries: Record<SecurityDomain, DomainScoreSummary> = {} as any;

  for (const [domainStr, stats] of Object.entries(domainTotals)) {
    const domain = domainStr as SecurityDomain;
    totalEarned += stats.earned;
    totalPossible += stats.possible;
    const pct = stats.possible > 0 ? (stats.earned / stats.possible) * 100 : 100;

    domainSummaries[domain] = {
      domain,
      earnedPoints: Number(stats.earned.toFixed(1)),
      totalPossiblePoints: stats.possible,
      scorePercentage: Number(pct.toFixed(1)),
      unansweredMandatoryCount: stats.mandatoryGaps,
    };
  }

  const rawOverall = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 100;
  // If mandatory critical gaps exist, cap grade at maximum GRADE_C
  const hasCriticalGaps = criticalGaps.length > 0;
  const overallScore = Number(rawOverall.toFixed(1));

  let ratingGrade: SecurityRatingGrade = "GRADE_F";
  if (overallScore >= 90 && !hasCriticalGaps) {
    ratingGrade = "GRADE_A";
  } else if (overallScore >= 75 && !hasCriticalGaps) {
    ratingGrade = "GRADE_B";
  } else if (overallScore >= 60) {
    ratingGrade = "GRADE_C";
  } else {
    ratingGrade = "GRADE_F";
  }

  const passedThreshold = overallScore >= passingScore && !hasCriticalGaps;

  return {
    vendorId,
    vendorName,
    overallScore,
    ratingGrade,
    passedThreshold,
    criticalGaps,
    domainScores: domainSummaries,
    totalQuestions: items.length,
    evaluatedAtIso: new Date().toISOString(),
  };
}

/**
 * Knowledge Base auto-matcher: queries vendor compliance policies to auto-answer questions.
 */
export function autoAnswerQuestion(
  questionText: string,
  knowledgeBase: Record<string, string>
): { answer: QuestionAnswer; evidence?: string } {
  const qLower = questionText.toLowerCase();

  for (const [pattern, answerText] of Object.entries(knowledgeBase)) {
    if (qLower.includes(pattern.toLowerCase())) {
      return {
        answer: "YES",
        evidence: answerText,
      };
    }
  }

  return { answer: "PARTIAL" };
}
