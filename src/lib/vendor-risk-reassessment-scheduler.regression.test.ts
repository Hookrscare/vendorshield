import { describe, it, expect } from "vitest";
import {
  VendorRiskReassessmentScheduler,
  VendorRiskProfile
} from "./vendor-risk-reassessment-scheduler";

describe("VendorRiskReassessmentScheduler (QA-191)", () => {
  it("schedules standard Tier 1 semi-annual assessment", () => {
    const profile: VendorRiskProfile = {
      vendorId: "VND-AWS-CLOUD",
      vendorName: "AWS Core Services",
      criticalityTier: "TIER_1_CRITICAL",
      lastAssessmentDate: "2026-06-01",
      activeSecurityIncidentOrBreach: false,
      unresolvedSoc2Exceptions: false,
      newHighRiskSubprocessorsAdded: false
    };

    const res = VendorRiskReassessmentScheduler.calculateNextSchedule(profile, "2026-09-13");

    expect(res.cadenceDays).toBe(180);
    expect(res.urgencyLevel).toBe("NORMAL_SCHEDULED_CYCLE");
    expect(res.daysRemaining).toBeGreaterThan(0);
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("trips immediate 30-day expedited review on active breach", () => {
    const profile: VendorRiskProfile = {
      vendorId: "VND-BREACHED-01",
      vendorName: "Vulnerable SaaS Inc",
      criticalityTier: "TIER_2_SIGNIFICANT",
      lastAssessmentDate: "2026-09-01",
      activeSecurityIncidentOrBreach: true,
      unresolvedSoc2Exceptions: false,
      newHighRiskSubprocessorsAdded: false
    };

    const res = VendorRiskReassessmentScheduler.calculateNextSchedule(profile, "2026-09-13");

    expect(res.cadenceDays).toBe(30);
    expect(res.urgencyLevel).toBe("IMMEDIATE_EXPEDITED_REVIEW");
    expect(res.nextAssessmentDueDate).toBe("2026-10-01");
  });

  it("validates input sanity", () => {
    expect(() => {
      VendorRiskReassessmentScheduler.calculateNextSchedule({
        vendorId: "",
        vendorName: "",
        criticalityTier: "TIER_1_CRITICAL",
        lastAssessmentDate: "",
        activeSecurityIncidentOrBreach: false,
        unresolvedSoc2Exceptions: false,
        newHighRiskSubprocessorsAdded: false
      });
    }).toThrow("vendorId, vendorName, and lastAssessmentDate are required.");
  });
});
