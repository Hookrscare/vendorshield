import { describe, it, expect } from "vitest";
import {
  CisoKpiDashboardExporter,
  VendorComplianceTelemetry,
} from "./ciso-kpi-dashboard-exporter";

describe("QA-130: CISO Executive Security Posture KPI Dashboard Exporter", () => {
  const sampleVendors: VendorComplianceTelemetry[] = [
    {
      vendorId: "v-aws",
      vendorName: "Amazon Web Services",
      soc2Compliant: true,
      iso27001Compliant: true,
      dpaSigned: true,
      sccValid: true,
      dataResidencyCompliant: true,
      openCriticalCves: 0,
      riskTier: "LOW",
      uptimeSlaPct: 99.99,
    },
    {
      vendorId: "v-stripe",
      vendorName: "Stripe Payments",
      soc2Compliant: true,
      iso27001Compliant: true,
      dpaSigned: true,
      sccValid: true,
      dataResidencyCompliant: true,
      openCriticalCves: 0,
      riskTier: "LOW",
      uptimeSlaPct: 99.98,
    },
    {
      vendorId: "v-analytics",
      vendorName: "Legacy Analytics Co",
      soc2Compliant: false,
      iso27001Compliant: false,
      dpaSigned: false,
      sccValid: false,
      dataResidencyCompliant: false,
      openCriticalCves: 2,
      riskTier: "CRITICAL",
      uptimeSlaPct: 98.5,
    },
  ];

  it("calculates accurate KPI metrics and weighted Security Posture Index", () => {
    const kpis = CisoKpiDashboardExporter.calculateKpis(sampleVendors);
    expect(kpis.totalVendors).toBe(3);
    expect(kpis.soc2ReadinessPct).toBe(66.7);
    expect(kpis.iso27001CoveragePct).toBe(66.7);
    expect(kpis.dpaCoveragePct).toBe(66.7);
    expect(kpis.riskDistribution.low).toBe(2);
    expect(kpis.riskDistribution.critical).toBe(1);
    expect(kpis.totalCriticalCves).toBe(2);
    expect(kpis.securityPostureIndex).toBeLessThan(75);
    expect(kpis.executiveActionRequired).toBe(true);
  });

  it("handles an empty vendor list gracefully with pristine defaults", () => {
    const kpis = CisoKpiDashboardExporter.calculateKpis([]);
    expect(kpis.totalVendors).toBe(0);
    expect(kpis.securityPostureIndex).toBe(100);
    expect(kpis.grade).toBe("A+");
    expect(kpis.executiveActionRequired).toBe(false);
  });

  it("generates targeted alerts for critical CVEs, high-risk vendors, and DPA deficits", () => {
    const kpis = CisoKpiDashboardExporter.calculateKpis(sampleVendors);
    const alerts = CisoKpiDashboardExporter.generateAlerts(sampleVendors, kpis);
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts.some((a) => a.severity === "CRITICAL")).toBe(true);
    expect(alerts.some((a) => a.title.includes("Active Critical CVEs"))).toBe(true);
  });

  it("exports a tamper-evident dashboard package with sha256 attestation digest and markdown", () => {
    const exported = CisoKpiDashboardExporter.exportDashboard("tenant-acme-corp", sampleVendors);
    expect(exported.tenantId).toBe("tenant-acme-corp");
    expect(exported.exportId).toContain("ciso-kpi-tenant-acme-corp");
    expect(exported.cisoAttestationDigestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(exported.executiveSummaryMarkdown).toContain("# 🛡️ VendorShield Executive CISO Security Posture Dashboard");
    expect(exported.executiveSummaryMarkdown).toContain("Security Posture Index (SPI)");
  });

  it("produces high grade and zero critical alerts for pristine enterprise compliance portfolio", () => {
    const pristineVendors: VendorComplianceTelemetry[] = [
      {
        vendorId: "v-1",
        vendorName: "Enterprise Cloud",
        soc2Compliant: true,
        iso27001Compliant: true,
        dpaSigned: true,
        sccValid: true,
        dataResidencyCompliant: true,
        openCriticalCves: 0,
        riskTier: "LOW",
        uptimeSlaPct: 99.99,
      },
    ];
    const exported = CisoKpiDashboardExporter.exportDashboard("tenant-pristine", pristineVendors);
    expect(exported.kpis.grade).toBe("A+");
    expect(exported.kpis.executiveActionRequired).toBe(false);
    expect(exported.criticalAlerts.length).toBe(0);
  });
});
