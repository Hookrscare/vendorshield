/**
 * vendor-risk-reassessment-scheduler.ts
 * QA-117: Automated Vendor Risk Re-Assessment Scheduling Engine.
 * Part of VendorShield B2B Enterprise Compliance Platform.
 * 
 * Computes risk-adjusted periodic re-assessment schedules, accommodates dynamic risk triggers
 * (e.g. security breaches, data classification escalation, SOC 2 report expiration),
 * and generates audit-ready re-assessment milestones for continuous vendor oversight.
 */

import crypto from "crypto";

export type InherentRiskTier = 'TIER_1_CRITICAL' | 'TIER_2_HIGH' | 'TIER_3_MEDIUM' | 'TIER_4_LOW';

export interface VendorRiskProfile {
  vendorId: string;
  vendorName: string;
  inherentRiskTier: InherentRiskTier;
  lastAssessmentDateIso: string;
  soc2ReportExpiryIso?: string;
  hasProductionDataAccess: boolean;
  processesSensitivePii: boolean;
  recentSecurityIncident: boolean;
  openCriticalFindingCount: number;
}

export interface ReassessmentSchedule {
  vendorId: string;
  vendorName: string;
  scheduledDateIso: string;
  cycleIntervalDays: number;
  isAccelerated: boolean;
  accelerationReasons: string[];
  reminderDatesIso: {
    thirtyDayReminder: string;
    sevenDayReminder: string;
  };
  auditDigest: string;
}

export class VendorRiskReassessmentScheduler {
  private static readonly BASELINE_INTERVALS_DAYS: Record<InherentRiskTier, number> = {
    TIER_1_CRITICAL: 90,   // Quarterly
    TIER_2_HIGH: 180,      // Semi-annually
    TIER_3_MEDIUM: 365,    // Annually
    TIER_4_LOW: 730,       // Biennially
  };

  /**
   * Calculates the next re-assessment date adjusting for risk triggers and audit report expirations.
   */
  public static calculateSchedule(
    profile: VendorRiskProfile,
    referenceDateIso?: string
  ): ReassessmentSchedule {
    const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
    const lastDate = new Date(profile.lastAssessmentDateIso);
    let intervalDays = this.BASELINE_INTERVALS_DAYS[profile.inherentRiskTier];
    const accelerationReasons: string[] = [];
    let isAccelerated = false;

    // Trigger 1: Recent security incident forces emergency 30-day reassessment
    if (profile.recentSecurityIncident) {
      intervalDays = Math.min(intervalDays, 30);
      isAccelerated = true;
      accelerationReasons.push("Active security incident reported within trailing monitoring window.");
    }

    // Trigger 2: Unresolved critical findings accelerates interval by 50%
    if (profile.openCriticalFindingCount > 0) {
      intervalDays = Math.min(intervalDays, Math.max(30, Math.floor(intervalDays * 0.5)));
      isAccelerated = true;
      accelerationReasons.push(`Vendor has ${profile.openCriticalFindingCount} unresolved critical risk findings.`);
    }

    // Trigger 3: Production data and sensitive PII access tightens lower tiers
    if ((profile.hasProductionDataAccess || profile.processesSensitivePii) && intervalDays > 180) {
      intervalDays = 180;
      isAccelerated = true;
      accelerationReasons.push("High data classification scope requires minimum semi-annual reassessment.");
    }

    // Calculate baseline scheduled date
    let scheduledTimestamp = lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000;

    // Trigger 4: Align with SOC 2 expiration (target 30 days before expiry if earlier)
    if (profile.soc2ReportExpiryIso) {
      const expiryDate = new Date(profile.soc2ReportExpiryIso);
      const preExpiryTarget = expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000;
      if (preExpiryTarget > refDate.getTime() && preExpiryTarget < scheduledTimestamp) {
        scheduledTimestamp = preExpiryTarget;
        isAccelerated = true;
        accelerationReasons.push("Scheduled 30 days prior to annual SOC 2 Type II report expiration.");
      }
    }

    // Ensure scheduled date is in future relative to reference date
    if (scheduledTimestamp <= refDate.getTime()) {
      scheduledTimestamp = refDate.getTime() + 14 * 24 * 60 * 60 * 1000; // 14-day urgent grace window
      isAccelerated = true;
      accelerationReasons.push("Overdue re-assessment defaulted to 14-day remediation window.");
    }

    const scheduledDate = new Date(scheduledTimestamp);
    const thirtyDayReminder = new Date(scheduledTimestamp - 30 * 24 * 60 * 60 * 1000);
    const sevenDayReminder = new Date(scheduledTimestamp - 7 * 24 * 60 * 60 * 1000);

    const auditPayload = `${profile.vendorId}:${profile.inherentRiskTier}:${scheduledDate.toISOString()}:${isAccelerated}`;
    const auditDigest = crypto.createHash("sha256").update(auditPayload).digest("hex");

    return {
      vendorId: profile.vendorId,
      vendorName: profile.vendorName,
      scheduledDateIso: scheduledDate.toISOString(),
      cycleIntervalDays: intervalDays,
      isAccelerated,
      accelerationReasons,
      reminderDatesIso: {
        thirtyDayReminder: thirtyDayReminder.toISOString(),
        sevenDayReminder: sevenDayReminder.toISOString(),
      },
      auditDigest,
    };
  }
}
