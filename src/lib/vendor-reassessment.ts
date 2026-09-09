/**
 * QA-117: Automated Vendor Risk Re-Assessment Scheduling Engine.
 * Calculates dynamic risk re-assessment dates and compliance audit cadences
 * for SOC 2 CC6.4 / CC6.8 and ISO 27001 A.15 third-party risk management.
 */

export type VendorRiskTier = "TIER_1_CRITICAL" | "TIER_2_HIGH" | "TIER_3_MEDIUM_LOW";

export type ReassessmentStatus =
  | "ON_TRACK"
  | "DUE_SOON"
  | "OVERDUE"
  | "IMMEDIATE_ACTION_REQUIRED";

export interface VendorSecurityProfile {
  vendorId: string;
  vendorName: string;
  tier: VendorRiskTier;
  lastAssessedAtIso: string;
  soc2ReportExpiresAtIso?: string;
  dpaLastModifiedAtIso?: string;
  hasOpenRemediations?: boolean;
  recentSecurityIncident?: boolean;
  customCadenceDays?: number;
}

export interface ReassessmentSchedule {
  vendorId: string;
  vendorName: string;
  tier: VendorRiskTier;
  lastAssessedAtIso: string;
  nextAssessmentDateIso: string;
  daysRemaining: number;
  status: ReassessmentStatus;
  effectiveCadenceDays: number;
  triggersApplied: string[];
}

export interface RosterReassessmentSummary {
  totalVendors: number;
  onTrackCount: number;
  dueSoonCount: number;
  overdueCount: number;
  immediateActionCount: number;
  schedules: ReassessmentSchedule[];
  highPriorityQueue: ReassessmentSchedule[];
}

export const STANDARD_TIER_CADENCE_DAYS: Record<VendorRiskTier, number> = {
  TIER_1_CRITICAL: 90,     // Quarterly re-assessments
  TIER_2_HIGH: 180,        // Semi-annual re-assessments
  TIER_3_MEDIUM_LOW: 365,  // Annual re-assessments
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_PRIORITY_WEIGHT: Record<ReassessmentStatus, number> = {
  IMMEDIATE_ACTION_REQUIRED: 0,
  OVERDUE: 1,
  DUE_SOON: 2,
  ON_TRACK: 3,
};

/**
 * Calculates next re-assessment date, incorporating dynamic risk accelerators.
 */
export function calculateNextReassessment(
  vendor: VendorSecurityProfile,
  referenceDate: Date = new Date()
): ReassessmentSchedule {
  const refTime = referenceDate.getTime();
  const lastAssessedTime = new Date(vendor.lastAssessedAtIso).getTime();
  const baseCadence = vendor.customCadenceDays || STANDARD_TIER_CADENCE_DAYS[vendor.tier] || 180;

  let effectiveCadence = baseCadence;
  const triggers: string[] = [];

  // 1. Check open remediation items -> shorten to max 30 days
  if (vendor.hasOpenRemediations) {
    effectiveCadence = Math.min(effectiveCadence, 30);
    triggers.push("OPEN_REMEDIATION_SHORT_CADENCE_30D");
  }

  // Base next assessment timestamp
  let nextAssessmentTime = lastAssessedTime + effectiveCadence * MS_PER_DAY;

  // 2. Dynamic Accelerator: Recent security incident -> immediate review within 2 days of incident or now
  if (vendor.recentSecurityIncident) {
    nextAssessmentTime = Math.min(nextAssessmentTime, refTime + 2 * MS_PER_DAY);
    triggers.push("SECURITY_INCIDENT_IMMEDIATE_REVIEW");
  }

  // 3. Dynamic Accelerator: SOC 2 expiry date
  if (vendor.soc2ReportExpiresAtIso) {
    const soc2ExpiryTime = new Date(vendor.soc2ReportExpiresAtIso).getTime();
    // Must re-assess on or before SOC 2 expires
    if (soc2ExpiryTime < nextAssessmentTime) {
      nextAssessmentTime = soc2ExpiryTime;
      triggers.push("SOC2_EXPIRATION_ALIGNMENT");
    }
  }

  // 4. Dynamic Accelerator: DPA changes -> review within 14 days of DPA modification
  if (vendor.dpaLastModifiedAtIso) {
    const dpaModTime = new Date(vendor.dpaLastModifiedAtIso).getTime();
    const dpaReviewDeadline = dpaModTime + 14 * MS_PER_DAY;
    if (dpaReviewDeadline < nextAssessmentTime && dpaModTime > lastAssessedTime) {
      nextAssessmentTime = dpaReviewDeadline;
      triggers.push("DPA_MODIFICATION_REVIEW_14D");
    }
  }

  const daysRemaining = Math.ceil((nextAssessmentTime - refTime) / MS_PER_DAY);

  let status: ReassessmentStatus = "ON_TRACK";
  if (vendor.recentSecurityIncident || daysRemaining <= -14) {
    status = "IMMEDIATE_ACTION_REQUIRED";
  } else if (daysRemaining < 0) {
    status = "OVERDUE";
  } else if (daysRemaining <= 14) {
    status = "DUE_SOON";
  }

  return {
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    tier: vendor.tier,
    lastAssessedAtIso: vendor.lastAssessedAtIso,
    nextAssessmentDateIso: new Date(nextAssessmentTime).toISOString(),
    daysRemaining,
    status,
    effectiveCadenceDays: effectiveCadence,
    triggersApplied: triggers,
  };
}

/**
 * Aggregates a vendor roster into an actionable compliance re-assessment schedule.
 */
export function evaluateRosterReassessments(
  roster: VendorSecurityProfile[],
  referenceDate: Date = new Date()
): RosterReassessmentSummary {
  const schedules = roster.map((v) => calculateNextReassessment(v, referenceDate));

  // Sort by priority severity first, then by daysRemaining
  schedules.sort((a, b) => {
    const weightDiff = STATUS_PRIORITY_WEIGHT[a.status] - STATUS_PRIORITY_WEIGHT[b.status];
    if (weightDiff !== 0) return weightDiff;
    return a.daysRemaining - b.daysRemaining;
  });

  let onTrack = 0;
  let dueSoon = 0;
  let overdue = 0;
  let immediate = 0;

  const highPriority: ReassessmentSchedule[] = [];

  for (const s of schedules) {
    if (s.status === "IMMEDIATE_ACTION_REQUIRED") {
      immediate++;
      highPriority.push(s);
    } else if (s.status === "OVERDUE") {
      overdue++;
      highPriority.push(s);
    } else if (s.status === "DUE_SOON") {
      dueSoon++;
      highPriority.push(s);
    } else {
      onTrack++;
    }
  }

  return {
    totalVendors: roster.length,
    onTrackCount: onTrack,
    dueSoonCount: dueSoon,
    overdueCount: overdue,
    immediateActionCount: immediate,
    schedules,
    highPriorityQueue: highPriority,
  };
}
