/**
 * QA-192: NIST CSF 2.0 Multi-Cloud Governance & Continuous Maturity Assessor.
 * Part of VendorShield B2B Trust & Enterprise Security Platform.
 *
 * Evaluates cloud infrastructure against the updated 6 Core Functions of NIST CSF 2.0:
 * GOVERN (GV), IDENTIFY (ID), PROTECT (PR), DETECT (DE), RESPOND (RS), RECOVER (RC).
 * Specifically verifies Supply Chain Risk Management (GV.SC) and Tier 1-4 Implementation Tiers.
 */

import { createHash } from "crypto";

export type NistCsfFunction = "GOVERN" | "IDENTIFY" | "PROTECT" | "DETECT" | "RESPOND" | "RECOVER";
export type NistCsfTier = "TIER_1_PARTIAL" | "TIER_2_RISK_INFORMED" | "TIER_3_REPEATABLE" | "TIER_4_ADAPTIVE";

export interface NistCsfSubcategoryTelemetry {
  subcategoryId: string; // e.g. "GV.SC-01", "PR.AA-01", "DE.CM-01"
  csfFunction: NistCsfFunction;
  title: string;
  isImplemented: boolean;
  cloudProvider: "AWS" | "GCP" | "AZURE" | "MULTI_CLOUD";
  automatedTelemetryEvidenceUri: string;
  severityIfDeficient: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface NistCsfAssessmentReport {
  overallMaturityTier: NistCsfTier;
  compliancePercentage: number;
  functionBreakdown: Record<NistCsfFunction, { total: number; implemented: number; complianceRate: number }>;
  criticalGaps: string[];
  supplyChainCompliant: boolean;
  auditSignature: string;
  timestamp: string;
}

export class NistCsfV2ContinuousMaturityAssessor {
  public static evaluatePosture(
    telemetry: NistCsfSubcategoryTelemetry[]
  ): NistCsfAssessmentReport {
    if (!telemetry || telemetry.length === 0) {
      throw new Error("Telemetry array must contain at least one subcategory control.");
    }

    const functionBreakdown: Record<NistCsfFunction, { total: number; implemented: number; complianceRate: number }> = {
      GOVERN: { total: 0, implemented: 0, complianceRate: 0 },
      IDENTIFY: { total: 0, implemented: 0, complianceRate: 0 },
      PROTECT: { total: 0, implemented: 0, complianceRate: 0 },
      DETECT: { total: 0, implemented: 0, complianceRate: 0 },
      RESPOND: { total: 0, implemented: 0, complianceRate: 0 },
      RECOVER: { total: 0, implemented: 0, complianceRate: 0 }
    };

    let totalImplemented = 0;
    const criticalGaps: string[] = [];
    let gvScImplemented = 0;
    let gvScTotal = 0;

    for (const item of telemetry) {
      if (!functionBreakdown[item.csfFunction]) {
        throw new Error(`Unrecognized NIST CSF 2.0 Function: ${item.csfFunction}`);
      }
      functionBreakdown[item.csfFunction].total += 1;
      if (item.isImplemented) {
        functionBreakdown[item.csfFunction].implemented += 1;
        totalImplemented += 1;
      } else {
        if (item.severityIfDeficient === "CRITICAL" || item.severityIfDeficient === "HIGH") {
          criticalGaps.push(`${item.subcategoryId}: ${item.title} (${item.cloudProvider})`);
        }
      }

      if (item.subcategoryId.startsWith("GV.SC")) {
        gvScTotal += 1;
        if (item.isImplemented) gvScImplemented += 1;
      }
    }

    // Calculate rates
    for (const fn of Object.keys(functionBreakdown) as NistCsfFunction[]) {
      const b = functionBreakdown[fn];
      b.complianceRate = b.total > 0 ? Math.round((b.implemented / b.total) * 100) : 0;
    }

    const overallRate = Math.round((totalImplemented / telemetry.length) * 100);

    let maturityTier: NistCsfTier;
    if (overallRate >= 95 && criticalGaps.length === 0) {
      maturityTier = "TIER_4_ADAPTIVE";
    } else if (overallRate >= 80 && criticalGaps.length <= 2) {
      maturityTier = "TIER_3_REPEATABLE";
    } else if (overallRate >= 60) {
      maturityTier = "TIER_2_RISK_INFORMED";
    } else {
      maturityTier = "TIER_1_PARTIAL";
    }

    const supplyChainCompliant = gvScTotal > 0 ? (gvScImplemented === gvScTotal) : true;

    const rawPayload = `${overallRate}:${maturityTier}:${criticalGaps.length}:${telemetry.length}`;
    const auditSignature = createHash("sha256").update(rawPayload).digest("hex");

    return {
      overallMaturityTier: maturityTier,
      compliancePercentage: overallRate,
      functionBreakdown,
      criticalGaps,
      supplyChainCompliant,
      auditSignature,
      timestamp: new Date().toISOString()
    };
  }
}
