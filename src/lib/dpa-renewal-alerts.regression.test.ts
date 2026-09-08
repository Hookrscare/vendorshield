/**
 * QA-128 Regression Test Suite: Automated Vendor DPA Contract Expiration & Auto-Renewal Alert Engine.
 */

import { describe, it, expect } from "vitest";
import { DpaRenewalAlertEngine, VendorContract } from "./dpa-renewal-alerts";

describe("QA-128: Vendor DPA Expiration & Renewal Alert Engine", () => {
  const referenceDate = new Date("2026-09-08T00:00:00Z");

  it("identifies expired contracts and triggers critical alerts", () => {
    const expiredContract: VendorContract = {
      vendorId: "vnd-aws",
      vendorName: "Amazon Web Services",
      dpaSignedDate: "2023-01-01",
      expirationDate: "2026-08-01", // Past date
      autoRenews: false,
      noticePeriodDays: 30,
      riskTier: "TIER_1_CRITICAL",
      legalContactEmail: "legal@company.com"
    };

    const res = DpaRenewalAlertEngine.evaluateContract(expiredContract, referenceDate);
    expect(res.severity).toBe("CRITICAL_EXPIRED");
    expect(res.alertRequired).toBe(true);
    expect(res.daysUntilExpiration).toBeLessThan(0);
  });

  it("flags contracts entering the mandatory auto-renewal notice window", () => {
    const autoRenewContract: VendorContract = {
      vendorId: "vnd-hubspot",
      vendorName: "HubSpot CRM",
      dpaSignedDate: "2025-10-01",
      expirationDate: "2026-10-15", // ~37 days away
      autoRenews: true,
      noticePeriodDays: 60, // Notice window is 60 days before expiration -> deadline was ~23 days ago
      riskTier: "TIER_2_HIGH",
      legalContactEmail: "procurement@company.com"
    };

    const res = DpaRenewalAlertEngine.evaluateContract(autoRenewContract, referenceDate);
    expect(res.severity).toBe("URGENT_NOTICE_WINDOW");
    expect(res.alertRequired).toBe(true);
    expect(res.daysUntilNoticeDeadline).toBeLessThanOrEqual(0);
  });

  it("evaluates a full vendor roster and produces a cryptographically sealed report", () => {
    const fleet: VendorContract[] = [
      {
        vendorId: "vnd-datadog",
        vendorName: "Datadog Observability",
        dpaSignedDate: "2026-01-01",
        expirationDate: "2027-01-01", // Long future
        autoRenews: false,
        noticePeriodDays: 30,
        riskTier: "TIER_2_HIGH",
        legalContactEmail: "ops@company.com"
      },
      {
        vendorId: "vnd-stripe",
        vendorName: "Stripe Payments",
        dpaSignedDate: "2025-10-01",
        expirationDate: "2026-10-25", // 47 days away (< 60 days)
        autoRenews: false,
        noticePeriodDays: 15,
        riskTier: "TIER_1_CRITICAL",
        legalContactEmail: "finance@company.com"
      }
    ];

    const report = DpaRenewalAlertEngine.evaluatePortfolio(fleet, referenceDate);
    expect(report.totalContracts).toBe(2);
    expect(report.compliantCount).toBe(1);
    expect(report.upcomingCount).toBe(1);
    expect(report.auditDigestSha256).toBeDefined();
    expect(report.auditDigestSha256.length).toBe(64);
  });
});
