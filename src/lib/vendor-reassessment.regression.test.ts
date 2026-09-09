import { describe, it, expect } from "vitest";
import {
  calculateNextReassessment,
  evaluateRosterReassessments,
  VendorSecurityProfile,
} from "./vendor-reassessment";

describe("QA-117: Automated Vendor Risk Re-Assessment Scheduling Engine", () => {
  const baseDate = new Date("2026-09-01T00:00:00.000Z");

  it("should enforce standard tier cadences (90d, 180d, 365d)", () => {
    const tier1: VendorSecurityProfile = {
      vendorId: "v-aws",
      vendorName: "Amazon Web Services",
      tier: "TIER_1_CRITICAL",
      lastAssessedAtIso: "2026-08-01T00:00:00.000Z", // 31 days ago
    };
    const sched1 = calculateNextReassessment(tier1, baseDate);
    expect(sched1.effectiveCadenceDays).toBe(90);
    expect(sched1.daysRemaining).toBe(59);
    expect(sched1.status).toBe("ON_TRACK");

    const tier2: VendorSecurityProfile = {
      vendorId: "v-github",
      vendorName: "GitHub Enterprise",
      tier: "TIER_2_HIGH",
      lastAssessedAtIso: "2026-08-01T00:00:00.000Z",
    };
    const sched2 = calculateNextReassessment(tier2, baseDate);
    expect(sched2.effectiveCadenceDays).toBe(180);
    expect(sched2.daysRemaining).toBe(149);

    const tier3: VendorSecurityProfile = {
      vendorId: "v-fonts",
      vendorName: "Google Fonts CDN",
      tier: "TIER_3_MEDIUM_LOW",
      lastAssessedAtIso: "2026-08-01T00:00:00.000Z",
    };
    const sched3 = calculateNextReassessment(tier3, baseDate);
    expect(sched3.effectiveCadenceDays).toBe(365);
    expect(sched3.daysRemaining).toBe(334);
  });

  it("should accelerate re-assessment when vendor has open remediations", () => {
    const vendorWithFlaws: VendorSecurityProfile = {
      vendorId: "v-analytics",
      vendorName: "Analytics Corp",
      tier: "TIER_1_CRITICAL",
      lastAssessedAtIso: "2026-08-15T00:00:00.000Z",
      hasOpenRemediations: true,
    };
    const sched = calculateNextReassessment(vendorWithFlaws, baseDate);
    expect(sched.effectiveCadenceDays).toBe(30);
    expect(sched.triggersApplied).toContain("OPEN_REMEDIATION_SHORT_CADENCE_30D");
    expect(sched.daysRemaining).toBe(13); // 30 - 17 days
    expect(sched.status).toBe("DUE_SOON");
  });

  it("should accelerate assessment date if SOC 2 report expires earlier than cadence", () => {
    const vendor: VendorSecurityProfile = {
      vendorId: "v-crm",
      vendorName: "Sales CRM Inc",
      tier: "TIER_2_HIGH", // 180 days standard
      lastAssessedAtIso: "2026-07-01T00:00:00.000Z",
      soc2ReportExpiresAtIso: "2026-09-15T00:00:00.000Z", // expires in 14 days
    };
    const sched = calculateNextReassessment(vendor, baseDate);
    expect(sched.triggersApplied).toContain("SOC2_EXPIRATION_ALIGNMENT");
    expect(sched.daysRemaining).toBe(14);
    expect(sched.status).toBe("DUE_SOON");
  });

  it("should trigger IMMEDIATE_ACTION_REQUIRED upon recent security incident", () => {
    const incidentVendor: VendorSecurityProfile = {
      vendorId: "v-cdn",
      vendorName: "Cloud Edge CDN",
      tier: "TIER_1_CRITICAL",
      lastAssessedAtIso: "2026-08-28T00:00:00.000Z",
      recentSecurityIncident: true,
    };
    const sched = calculateNextReassessment(incidentVendor, baseDate);
    expect(sched.status).toBe("IMMEDIATE_ACTION_REQUIRED");
    expect(sched.triggersApplied).toContain("SECURITY_INCIDENT_IMMEDIATE_REVIEW");
    expect(sched.daysRemaining).toBeLessThanOrEqual(2);
  });

  it("should evaluate and prioritize multi-vendor roster correctly", () => {
    const roster: VendorSecurityProfile[] = [
      {
        vendorId: "v1",
        vendorName: "Compliant Vendor",
        tier: "TIER_3_MEDIUM_LOW",
        lastAssessedAtIso: "2026-08-01T00:00:00.000Z",
      },
      {
        vendorId: "v2",
        vendorName: "Overdue Vendor",
        tier: "TIER_1_CRITICAL",
        lastAssessedAtIso: "2026-05-30T00:00:00.000Z", // 94 days ago -> 4 days overdue
      },
      {
        vendorId: "v3",
        vendorName: "Breached Vendor",
        tier: "TIER_2_HIGH",
        lastAssessedAtIso: "2026-08-01T00:00:00.000Z",
        recentSecurityIncident: true,
      },
    ];

    const summary = evaluateRosterReassessments(roster, baseDate);
    expect(summary.totalVendors).toBe(3);
    expect(summary.immediateActionCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.onTrackCount).toBe(1);
    expect(summary.highPriorityQueue).toHaveLength(2);
    // Breached vendor should be first due to immediate urgency
    expect(summary.highPriorityQueue[0].vendorId).toBe("v3");
  });
});
