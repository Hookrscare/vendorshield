/**
 * QA-130 Regression Test Suite: CISO Executive Security Posture KPI Dashboard Exporter.
 */

import { describe, it, expect } from "vitest";
import { CisoKpiExporter, VendorPostureRecord } from "./ciso-kpi-exporter";

describe("QA-130: CISO Executive Security Posture KPI Exporter", () => {
  it("computes 100/100 EXCELLENT grade for fully compliant vendor fleet", () => {
    const vendors: VendorPostureRecord[] = [
      {
        vendorId: "v-aws",
        vendorName: "Amazon Web Services",
        criticalityTier: "TIER_1_CRITICAL",
        hasValidDpa: true,
        hasSoc2Type2OrIso: true,
        unresolvedCriticalCves: 0,
        openSlaBreach: false
      },
      {
        vendorId: "v-stripe",
        vendorName: "Stripe Payments",
        criticalityTier: "TIER_1_CRITICAL",
        hasValidDpa: true,
        hasSoc2Type2OrIso: true,
        unresolvedCriticalCves: 0,
        openSlaBreach: false
      }
    ];

    const kpi = CisoKpiExporter.calculateKpis(vendors, "2026-09-09T00:00:00Z");
    expect(kpi.overallRiskScore).toBe(100);
    expect(kpi.postureGrade).toBe("EXCELLENT");
    expect(kpi.dpaComplianceRatePct).toBe(100);
    expect(kpi.criticalCoveragePct).toBe(100);
    expect(kpi.totalCriticalCves).toBe(0);

    const md = CisoKpiExporter.generateExecutiveMarkdown(kpi);
    expect(md).toContain("- **Overall Security Posture Grade:** **EXCELLENT** (100 / 100)");
  });

  it("penalizes missing DPAs, missing SOC 2 certs, and active CVE exposures", () => {
    const vendors: VendorPostureRecord[] = [
      {
        vendorId: "v-risky-db",
        vendorName: "Legacy DB Hosting",
        criticalityTier: "TIER_1_CRITICAL",
        hasValidDpa: false,
        hasSoc2Type2OrIso: false,
        unresolvedCriticalCves: 3,
        openSlaBreach: true
      },
      {
        vendorId: "v-marketing",
        vendorName: "Ad Pixel Service",
        criticalityTier: "TIER_2_SIGNIFICANT",
        hasValidDpa: false,
        hasSoc2Type2OrIso: false,
        unresolvedCriticalCves: 1,
        openSlaBreach: false
      }
    ];

    const kpi = CisoKpiExporter.calculateKpis(vendors, "2026-09-09T00:00:00Z");
    expect(kpi.postureGrade).toBe("CRITICAL_ACTION_REQUIRED");
    expect(kpi.overallRiskScore).toBeLessThan(60);
    expect(kpi.dpaComplianceRatePct).toBe(0);
    expect(kpi.criticalCoveragePct).toBe(0);
    expect(kpi.totalCriticalCves).toBe(4);
    expect(kpi.keyRecommendations.length).toBeGreaterThanOrEqual(3);
  });

  it("handles empty vendor roster gracefully", () => {
    const kpi = CisoKpiExporter.calculateKpis([]);
    expect(kpi.totalVendors).toBe(0);
    expect(kpi.overallRiskScore).toBe(100);
    expect(kpi.auditDigestSha256).toBeDefined();
  });
});
