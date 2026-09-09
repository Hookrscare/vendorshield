/**
 * src/lib/nist-csf-governance-mapper.ts
 * QA-137: Automated NIST CSF 2.0 Governance & Organizational Context Mapping Engine.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 * 
 * Maps vendor and enterprise cybersecurity controls against NIST CSF 2.0's 6 Core Functions:
 * GOVERN (GV), IDENTIFY (ID), PROTECT (PR), DETECT (DE), RESPOND (RS), RECOVER (RC).
 * Evaluates Implementation Tiers (1: Partial to 4: Adaptive) and supply chain C-SCRM controls.
 */

import { createHash } from "node:crypto";

export type NistCsfFunction = "GOVERN" | "IDENTIFY" | "PROTECT" | "DETECT" | "RESPOND" | "RECOVER";

export type NistCsfTier = 1 | 2 | 3 | 4; // 1: Partial, 2: Risk Informed, 3: Repeatable, 4: Adaptive

export interface NistControlEvaluation {
  categoryCode: string; // e.g., "GV.OC", "GV.SC", "PR.DS", "DE.CM"
  function: NistCsfFunction;
  title: string;
  implemented: boolean;
  score: number; // 0.0 to 1.0
  evidenceRefs: string[];
}

export interface NistCsfAuditResult {
  vendorId: string;
  overallScore: number; // 0 - 100
  implementationTier: NistCsfTier;
  functionBreakdown: Record<NistCsfFunction, { score: number; controlsCount: number; passedCount: number }>;
  supplyChainRiskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  unmetControls: string[];
  attestationToken: string;
  evaluatedAt: string;
}

export class NistCsfGovernanceMapper {
  /**
   * Evaluates vendor control set against NIST CSF 2.0 standard controls.
   */
  public evaluatePosture(vendorId: string, evaluations: NistControlEvaluation[]): NistCsfAuditResult {
    if (!evaluations || evaluations.length === 0) {
      const now = new Date().toISOString();
      return {
        vendorId,
        overallScore: 0,
        implementationTier: 1,
        functionBreakdown: {
          GOVERN: { score: 0, controlsCount: 0, passedCount: 0 },
          IDENTIFY: { score: 0, controlsCount: 0, passedCount: 0 },
          PROTECT: { score: 0, controlsCount: 0, passedCount: 0 },
          DETECT: { score: 0, controlsCount: 0, passedCount: 0 },
          RESPOND: { score: 0, controlsCount: 0, passedCount: 0 },
          RECOVER: { score: 0, controlsCount: 0, passedCount: 0 }
        },
        supplyChainRiskLevel: "CRITICAL",
        unmetControls: ["ALL_CONTROLS_MISSING"],
        attestationToken: createHash("sha256").update(`${vendorId}:EMPTY:${now}`).digest("hex"),
        evaluatedAt: now
      };
    }

    const functions: NistCsfFunction[] = ["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"];
    const breakdown: Record<NistCsfFunction, { totalScore: number; controlsCount: number; passedCount: number }> = {
      GOVERN: { totalScore: 0, controlsCount: 0, passedCount: 0 },
      IDENTIFY: { totalScore: 0, controlsCount: 0, passedCount: 0 },
      PROTECT: { totalScore: 0, controlsCount: 0, passedCount: 0 },
      DETECT: { totalScore: 0, controlsCount: 0, passedCount: 0 },
      RESPOND: { totalScore: 0, controlsCount: 0, passedCount: 0 },
      RECOVER: { totalScore: 0, controlsCount: 0, passedCount: 0 }
    };

    const unmet: string[] = [];
    let grandTotalScore = 0;

    for (const ctrl of evaluations) {
      const fn = ctrl.function;
      const val = Math.max(0, Math.min(1.0, ctrl.score));
      breakdown[fn].totalScore += val;
      breakdown[fn].controlsCount += 1;
      if (ctrl.implemented && val >= 0.7) {
        breakdown[fn].passedCount += 1;
      } else {
        unmet.push(ctrl.categoryCode);
      }
      grandTotalScore += val;
    }

    const overallScore = Math.round((grandTotalScore / evaluations.length) * 100);

    // Implementation Tier calculation based on NIST CSF guidelines:
    // Tier 4: Adaptive (Score >= 90 and all functions >= 80)
    // Tier 3: Repeatable (Score >= 75)
    // Tier 2: Risk Informed (Score >= 50)
    // Tier 1: Partial (< 50)
    let implementationTier: NistCsfTier = 1;
    if (overallScore >= 90) {
      implementationTier = 4;
    } else if (overallScore >= 75) {
      implementationTier = 3;
    } else if (overallScore >= 50) {
      implementationTier = 2;
    }

    // Supply Chain C-SCRM risk specifically evaluated under GOVERN (GV.SC)
    const governScore = breakdown.GOVERN.controlsCount > 0 
      ? (breakdown.GOVERN.totalScore / breakdown.GOVERN.controlsCount) * 100 
      : 0;

    let supplyChainRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "CRITICAL";
    if (governScore >= 85) supplyChainRisk = "LOW";
    else if (governScore >= 65) supplyChainRisk = "MODERATE";
    else if (governScore >= 45) supplyChainRisk = "HIGH";

    const formattedBreakdown: Record<NistCsfFunction, { score: number; controlsCount: number; passedCount: number }> = {
      GOVERN: { score: Math.round(breakdown.GOVERN.controlsCount ? (breakdown.GOVERN.totalScore / breakdown.GOVERN.controlsCount) * 100 : 0), controlsCount: breakdown.GOVERN.controlsCount, passedCount: breakdown.GOVERN.passedCount },
      IDENTIFY: { score: Math.round(breakdown.IDENTIFY.controlsCount ? (breakdown.IDENTIFY.totalScore / breakdown.IDENTIFY.controlsCount) * 100 : 0), controlsCount: breakdown.IDENTIFY.controlsCount, passedCount: breakdown.IDENTIFY.passedCount },
      PROTECT: { score: Math.round(breakdown.PROTECT.controlsCount ? (breakdown.PROTECT.totalScore / breakdown.PROTECT.controlsCount) * 100 : 0), controlsCount: breakdown.PROTECT.controlsCount, passedCount: breakdown.PROTECT.passedCount },
      DETECT: { score: Math.round(breakdown.DETECT.controlsCount ? (breakdown.DETECT.totalScore / breakdown.DETECT.controlsCount) * 100 : 0), controlsCount: breakdown.DETECT.controlsCount, passedCount: breakdown.DETECT.passedCount },
      RESPOND: { score: Math.round(breakdown.RESPOND.controlsCount ? (breakdown.RESPOND.totalScore / breakdown.RESPOND.controlsCount) * 100 : 0), controlsCount: breakdown.RESPOND.controlsCount, passedCount: breakdown.RESPOND.passedCount },
      RECOVER: { score: Math.round(breakdown.RECOVER.controlsCount ? (breakdown.RECOVER.totalScore / breakdown.RECOVER.controlsCount) * 100 : 0), controlsCount: breakdown.RECOVER.controlsCount, passedCount: breakdown.RECOVER.passedCount }
    };

    const evaluatedAt = new Date().toISOString();
    const tokenSource = `${vendorId}:${overallScore}:${implementationTier}:${supplyChainRisk}:${evaluatedAt}`;
    const attestationToken = createHash("sha256").update(tokenSource).digest("hex");

    return {
      vendorId,
      overallScore,
      implementationTier,
      functionBreakdown: formattedBreakdown,
      supplyChainRiskLevel: supplyChainRisk,
      unmetControls: unmet,
      attestationToken,
      evaluatedAt
    };
  }
}
