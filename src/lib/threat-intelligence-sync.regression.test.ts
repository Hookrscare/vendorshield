import { describe, it, expect } from "vitest";
import {
  classifyCVSS,
  calculateEffectiveRisk,
  determineRemediationSLA,
  syncThreatIntelligence,
  type CVECatalogItem,
  type MonitoredVendor
} from "./threat-intelligence-sync";

describe("QA-121: Continuous Third-Party Vulnerability & CVE Threat Intelligence Sync", () => {
  it("classifies CVSS severity scores accurately", () => {
    expect(classifyCVSS(9.8)).toBe("CRITICAL");
    expect(classifyCVSS(9.0)).toBe("CRITICAL");
    expect(classifyCVSS(8.5)).toBe("HIGH");
    expect(classifyCVSS(7.0)).toBe("HIGH");
    expect(classifyCVSS(5.5)).toBe("MEDIUM");
    expect(classifyCVSS(4.0)).toBe("MEDIUM");
    expect(classifyCVSS(3.2)).toBe("LOW");
  });

  it("calculates compound risk with CISA KEV and tier weighting", () => {
    const standardCve: CVECatalogItem = {
      cveId: "CVE-2026-1001",
      vendorName: "CloudScale",
      affectedProduct: "Database Engine",
      cvssScore: 7.5,
      severity: "HIGH",
      cisaKevExploited: false,
      epssProbability: 0.10,
      summary: "Buffer overflow",
      patchAvailable: true,
      publishedAtIso: "2026-09-01T00:00:00Z"
    };

    const riskStandard = calculateEffectiveRisk(standardCve, "TIER_3_MEDIUM_LOW");
    expect(riskStandard).toBe(75.0);

    // With CISA KEV weaponization penalty (+20) and TIER_1_CRITICAL (1.15x)
    const weaponizedCve: CVECatalogItem = {
      ...standardCve,
      cveId: "CVE-2026-1002",
      cisaKevExploited: true
    };
    const riskWeaponized = calculateEffectiveRisk(weaponizedCve, "TIER_1_CRITICAL");
    // (75 + 20) * 1.15 = 95 * 1.15 = 109.25 -> clamped to 100.0
    expect(riskWeaponized).toBe(100.0);
  });

  it("determines remediation SLA deadlines based on risk severity", () => {
    expect(determineRemediationSLA(90.0, true)).toBe(7);  // CISA KEV -> 7 days
    expect(determineRemediationSLA(88.0, false)).toBe(7); // >= 85 -> 7 days
    expect(determineRemediationSLA(75.0, false)).toBe(15);
    expect(determineRemediationSLA(50.0, false)).toBe(30);
    expect(determineRemediationSLA(25.0, false)).toBe(60);
  });

  it("syncs threat feed against vendor inventory and generates posture alerts", () => {
    const cves: CVECatalogItem[] = [
      {
        cveId: "CVE-2026-4401",
        vendorName: "Snowflake",
        affectedProduct: "Snowflake Python Connector",
        cvssScore: 9.8,
        severity: "CRITICAL",
        cisaKevExploited: true,
        epssProbability: 0.75,
        summary: "Remote code execution in connector deserialization",
        patchAvailable: true,
        publishedAtIso: "2026-09-05T00:00:00Z"
      },
      {
        cveId: "CVE-2026-2205",
        vendorName: "Redis",
        affectedProduct: "Redis Enterprise Cloud",
        cvssScore: 6.2,
        severity: "MEDIUM",
        cisaKevExploited: false,
        epssProbability: 0.05,
        summary: "Denial of service via crafted command",
        patchAvailable: true,
        publishedAtIso: "2026-09-02T00:00:00Z"
      }
    ];

    const vendors: MonitoredVendor[] = [
      {
        vendorId: "v-01",
        vendorName: "Snowflake Inc",
        tier: "TIER_1_CRITICAL",
        activeProductsUsed: ["Snowflake Data Warehouse", "Snowflake Python Connector"]
      },
      {
        vendorId: "v-02",
        vendorName: "Redis Labs",
        tier: "TIER_2_HIGH",
        activeProductsUsed: ["Redis Enterprise Cloud"]
      },
      {
        vendorId: "v-03",
        vendorName: "Stripe",
        tier: "TIER_1_CRITICAL",
        activeProductsUsed: ["Stripe Payments API"]
      }
    ];

    const report = syncThreatIntelligence(cves, vendors);

    expect(report.totalCvesProcessed).toBe(2);
    expect(report.totalVendorsMonitored).toBe(3);
    expect(report.vulnerableVendorsCount).toBe(2);
    expect(report.criticalExploitAlertsCount).toBe(1);

    const snowflake = report.vendorProfiles.find(v => v.vendorId === "v-01");
    expect(snowflake?.posture).toBe("CRITICAL_EXPLOIT_ALERT");
    expect(snowflake?.cisaKevCount).toBe(1);

    const redis = report.vendorProfiles.find(v => v.vendorId === "v-02");
    expect(redis?.posture).toBe("ACTIONABLE_PATCH_PENDING");

    const stripe = report.vendorProfiles.find(v => v.vendorId === "v-03");
    expect(stripe?.posture).toBe("HEALTHY_LOW_RISK");
    expect(stripe?.activeCveCount).toBe(0);

    expect(report.highPriorityEscalations.length).toBe(1);
    expect(report.highPriorityEscalations[0].cveId).toBe("CVE-2026-4401");
  });
});
