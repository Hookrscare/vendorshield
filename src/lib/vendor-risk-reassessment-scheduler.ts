/**
 * QA-191: Automated Vendor Risk Re-Assessment Scheduling Engine.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 * 
 * Computes dynamic TPRM risk re-assessment cadences based on vendor criticality tier,
 * material threat triggers, and sub-processor expansions.
 */

import { createHash } from "crypto";

export interface VendorRiskProfile {
  vendorId: string;
  vendorName: string;
  criticalityTier: "TIER_1_CRITICAL" | "TIER_2_SIGNIFICANT" | "TIER_3_COMMODITY";
  lastAssessmentDate: string; // YYYY-MM-DD
  activeSecurityIncidentOrBreach: boolean;
  unresolvedSoc2Exceptions: boolean;
  newHighRiskSubprocessorsAdded: boolean;
}

export interface ReassessmentScheduleResult {
  vendorId: string;
  nextAssessmentDueDate: string;
  cadenceDays: number;
  daysRemaining: number;
  urgencyLevel: "IMMEDIATE_EXPEDITED_REVIEW" | "NORMAL_SCHEDULED_CYCLE" | "LOW_RISK_DEFERRED";
  verificationDigest: string;
}

export class VendorRiskReassessmentScheduler {
  public static calculateNextSchedule(
    profile: VendorRiskProfile,
    currentDateStr: string = "2026-09-13"
  ): ReassessmentScheduleResult {
    if (!profile.vendorId || !profile.vendorName || !profile.lastAssessmentDate) {
      throw new Error("vendorId, vendorName, and lastAssessmentDate are required.");
    }

    const lastDate = new Date(profile.lastAssessmentDate).getTime();
    const curDate = new Date(currentDateStr).getTime();
    if (isNaN(lastDate) || isNaN(curDate)) {
      throw new Error("Invalid date format.");
    }

    // 1. Base Cadence by Tier
    let baseCadenceDays = 365; // Default Tier 2
    if (profile.criticalityTier === "TIER_1_CRITICAL") {
      baseCadenceDays = 180;
    } else if (profile.criticalityTier === "TIER_3_COMMODITY") {
      baseCadenceDays = 730;
    }

    // 2. Modifiers
    if (profile.newHighRiskSubprocessorsAdded) {
      baseCadenceDays = Math.round(baseCadenceDays * 0.5);
    }

    // 3. Emergency triggers: active breach or critical SOC 2 exception forces 30-day review
    let effectiveCadenceDays = baseCadenceDays;
    let urgency: ReassessmentScheduleResult["urgencyLevel"] = "NORMAL_SCHEDULED_CYCLE";

    if (profile.activeSecurityIncidentOrBreach || profile.unresolvedSoc2Exceptions) {
      effectiveCadenceDays = 30;
      urgency = "IMMEDIATE_EXPEDITED_REVIEW";
    } else if (profile.criticalityTier === "TIER_3_COMMODITY") {
      urgency = "LOW_RISK_DEFERRED";
    }

    const dueDateEpoch = lastDate + effectiveCadenceDays * 86400 * 1000;
    const dueDateStr = new Date(dueDateEpoch).toISOString().split("T")[0];
    const daysRemaining = Math.round((dueDateEpoch - curDate) / (86400 * 1000));

    const raw = `${profile.vendorId}:${dueDateStr}:${effectiveCadenceDays}:${urgency}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: profile.vendorId,
      nextAssessmentDueDate: dueDateStr,
      cadenceDays: effectiveCadenceDays,
      daysRemaining,
      urgencyLevel: urgency,
      verificationDigest: digest
    };
  }
}
