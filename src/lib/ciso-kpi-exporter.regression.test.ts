import { describe, it, expect } from "vitest";
import {
  CisoKpiExporter,
  VendorSecuritySnapshot
} from "./ciso-kpi-exporter";

describe("QA-130: CisoKpiExporter Regression Suite", () => {
  it("computes Grade A+ and 100 score for empty vendor roster", () => {
    const summary = CisoKpiExporter.exportDashboardKpis("tenant_empty", []);
    expect(summary.totalVendors).toBe(0);
    expect(summary.overallSecurityPostureScore).toBe(100);
    expect(summary.postureGrade).toBe("A+");
    expect(summary.criticalActionItems.length).toBe(0);
    expect(summary.reportDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("calculates high score for certified low-risk vendor fleet", () => {
    const vendors: VendorSecuritySnapshot[] = [
      {
        vendorId: "v1",
        vendorName: "AWS Cloud Services",
        tier: 1,
        riskScore: 10,
        hasSoc2Type2: true,
        hasIso27001: true,
        hasGdprDpaSigned: true,
        isDataResidencyCompliant: true,
        activeVulnerabilitiesCount: 0,
        slaUptimePercentage: 99.99
      },
      {
        vendorId: "v2",
        vendorName: "Datadog Observability",
        tier: 2,
        riskScore: 15,
        hasSoc2Type2: true,
        hasIso27001: true,
        hasGdprDpaSigned: true,
        isDataResidencyCompliant: true,
        activeVulnerabilitiesCount: 1,
        slaUptimePercentage: 99.95
      }
    ];

    const summary = CisoKpiExporter.exportDashboardKpis("tenant_secure", vendors);
    expect(summary.totalVendors).toBe(2);
    expect(summary.tier1VendorsCount).toBe(1);
    expect(summary.overallSecurityPostureScore).toBeGreaterThanOrEqual(90);
    expect(["A+", "A"]).toContain(summary.postureGrade);
    expect(summary.complianceRates.soc2CoveragePct).toBe(100);
    expect(summary.complianceRates.gdprDpaCoveragePct).toBe(100);
    expect(summary.criticalActionItems.length).toBe(0);
  });

  it("flags action items and degrades score when Tier 1 vendor lacks SOC 2 or violates residency", () => {
    const atRiskVendors: VendorSecuritySnapshot[] = [
      {
        vendorId: "v_risky",
        vendorName: "Legacy Analytics Sub-Processor",
        tier: 1,
        riskScore: 85,
        hasSoc2Type2: false,
        hasIso27001: false,
        hasGdprDpaSigned: false,
        isDataResidencyCompliant: false,
        activeVulnerabilitiesCount: 8,
        slaUptimePercentage: 92.5
      }
    ];

    const summary = CisoKpiExporter.exportDashboardKpis("tenant_at_risk", atRiskVendors);
    expect(summary.postureGrade).toBe("F");
    expect(summary.riskDistribution.criticalRiskCount).toBe(1);
    expect(summary.criticalActionItems.length).toBeGreaterThanOrEqual(3);
    expect(summary.criticalActionItems.some(item => item.includes("missing active SOC 2"))).toBe(true);
    expect(summary.criticalActionItems.some(item => item.includes("violates regional data residency"))).toBe(true);

    const md = CisoKpiExporter.formatMarkdownReport(summary);
    expect(md).toContain("CISO Executive Security Posture KPI Report");
    expect(md).toContain("Grade: F");
  });

  it("accurately categorizes risk bands", () => {
    expect(CisoKpiExporter.categorizeRisk(10)).toBe("LOW");
    expect(CisoKpiExporter.categorizeRisk(30)).toBe("MEDIUM");
    expect(CisoKpiExporter.categorizeRisk(60)).toBe("HIGH");
    expect(CisoKpiExporter.categorizeRisk(80)).toBe("CRITICAL");
  });
});
