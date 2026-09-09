/**
 * QA-130: Automated CISO Executive Security Posture KPI Dashboard Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Aggregates vendor compliance posture, sub-processor data residency risks,
 * SLA adherence, and breach exposure into executive CISO-ready metrics,
 * computing an overall Security Posture Index (0-100) with tamper-evident cryptographic digests.
 */

import { createHash } from "crypto";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface VendorSecuritySnapshot {
  vendorId: string;
  vendorName: string;
  tier: 1 | 2 | 3;
  riskScore: number; // 0 (safest) - 100 (highest risk)
  hasSoc2Type2: boolean;
  hasIso27001: boolean;
  hasGdprDpaSigned: boolean;
  isDataResidencyCompliant: boolean;
  activeVulnerabilitiesCount: number;
  slaUptimePercentage: number;
}

export interface CisoKpiSummary {
  evaluatedAtIso: string;
  tenantId: string;
  totalVendors: number;
  tier1VendorsCount: number;
  overallSecurityPostureScore: number; // 0 - 100 (higher is better)
  postureGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  complianceRates: {
    soc2CoveragePct: number;
    iso27001CoveragePct: number;
    gdprDpaCoveragePct: number;
    dataResidencyCompliancePct: number;
  };
  riskDistribution: {
    lowRiskCount: number;
    mediumRiskCount: number;
    highRiskCount: number;
    criticalRiskCount: number;
  };
  averageVendorRiskScore: number;
  averageUptimePct: number;
  criticalActionItems: string[];
  reportDigestSha256: string;
}

export class CisoKpiExporter {
  public static calculateGrade(score: number): "A+" | "A" | "B" | "C" | "D" | "F" {
    if (score >= 95) return "A+";
    if (score >= 85) return "A";
    if (score >= 75) return "B";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
  }

  public static categorizeRisk(riskScore: number): RiskLevel {
    if (riskScore >= 75) return "CRITICAL";
    if (riskScore >= 50) return "HIGH";
    if (riskScore >= 25) return "MEDIUM";
    return "LOW";
  }

  public static exportDashboardKpis(
    tenantId: string,
    vendors: VendorSecuritySnapshot[]
  ): CisoKpiSummary {
    const timestamp = new Date().toISOString();

    if (!vendors || vendors.length === 0) {
      const emptyDigest = createHash("sha256")
        .update(`EMPTY:${tenantId}:${timestamp}`)
        .digest("hex");

      return {
        evaluatedAtIso: timestamp,
        tenantId,
        totalVendors: 0,
        tier1VendorsCount: 0,
        overallSecurityPostureScore: 100,
        postureGrade: "A+",
        complianceRates: {
          soc2CoveragePct: 100,
          iso27001CoveragePct: 100,
          gdprDpaCoveragePct: 100,
          dataResidencyCompliancePct: 100,
        },
        riskDistribution: {
          lowRiskCount: 0,
          mediumRiskCount: 0,
          highRiskCount: 0,
          criticalRiskCount: 0,
        },
        averageVendorRiskScore: 0,
        averageUptimePct: 100,
        criticalActionItems: [],
        reportDigestSha256: emptyDigest,
      };
    }

    const total = vendors.length;
    let tier1Count = 0;
    let totalRisk = 0;
    let totalUptime = 0;
    let soc2Count = 0;
    let isoCount = 0;
    let dpaCount = 0;
    let dataResidencyCompliantCount = 0;

    let lowRisk = 0;
    let medRisk = 0;
    let highRisk = 0;
    let critRisk = 0;

    const actionItems: string[] = [];

    for (const v of vendors) {
      if (v.tier === 1) tier1Count++;
      totalRisk += v.riskScore;
      totalUptime += v.slaUptimePercentage;

      if (v.hasSoc2Type2) soc2Count++;
      if (v.hasIso27001) isoCount++;
      if (v.hasGdprDpaSigned) dpaCount++;
      if (v.isDataResidencyCompliant) dataResidencyCompliantCount++;

      const riskCat = this.categorizeRisk(v.riskScore);
      if (riskCat === "CRITICAL") critRisk++;
      else if (riskCat === "HIGH") highRisk++;
      else if (riskCat === "MEDIUM") medRisk++;
      else lowRisk++;

      if (v.tier === 1 && !v.hasSoc2Type2) {
        actionItems.push(`Tier 1 vendor '${v.vendorName}' is missing active SOC 2 Type II certification.`);
      }
      if (v.tier === 1 && !v.hasGdprDpaSigned) {
        actionItems.push(`Tier 1 vendor '${v.vendorName}' lacks an executed GDPR Data Processing Agreement.`);
      }
      if (!v.isDataResidencyCompliant) {
        actionItems.push(`Vendor '${v.vendorName}' violates regional data residency guardrails.`);
      }
      if (v.activeVulnerabilitiesCount > 5) {
        actionItems.push(`Vendor '${v.vendorName}' has ${v.activeVulnerabilitiesCount} outstanding critical CVE vulnerabilities.`);
      }
    }

    const avgRisk = totalRisk / total;
    const avgUptime = totalUptime / total;

    const soc2Pct = (soc2Count / total) * 100;
    const isoPct = (isoCount / total) * 100;
    const dpaPct = (dpaCount / total) * 100;
    const residencyPct = (dataResidencyCompliantCount / total) * 100;

    // Weighted composite score (0 - 100)
    // 30% from low average risk, 25% from SOC 2, 20% from DPA, 15% from Residency, 10% from Uptime
    const riskFactor = Math.max(0, 100 - avgRisk);
    const uptimeFactor = Math.min(100, Math.max(0, (avgUptime - 95) * 20)); // scaled 95%-100% -> 0-100
    const compositeScore = Math.round(
      riskFactor * 0.3 +
      soc2Pct * 0.25 +
      dpaPct * 0.2 +
      residencyPct * 0.15 +
      uptimeFactor * 0.1
    );

    const clampedScore = Math.min(100, Math.max(0, compositeScore));
    const grade = this.calculateGrade(clampedScore);

    const payloadToSign = `${tenantId}:${timestamp}:${clampedScore}:${total}:${critRisk}`;
    const digest = createHash("sha256").update(payloadToSign).digest("hex");

    return {
      evaluatedAtIso: timestamp,
      tenantId,
      totalVendors: total,
      tier1VendorsCount: tier1Count,
      overallSecurityPostureScore: clampedScore,
      postureGrade: grade,
      complianceRates: {
        soc2CoveragePct: Number(soc2Pct.toFixed(1)),
        iso27001CoveragePct: Number(isoPct.toFixed(1)),
        gdprDpaCoveragePct: Number(dpaPct.toFixed(1)),
        dataResidencyCompliancePct: Number(residencyPct.toFixed(1)),
      },
      riskDistribution: {
        lowRiskCount: lowRisk,
        mediumRiskCount: medRisk,
        highRiskCount: highRisk,
        criticalRiskCount: critRisk,
      },
      averageVendorRiskScore: Number(avgRisk.toFixed(1)),
      averageUptimePct: Number(avgUptime.toFixed(2)),
      criticalActionItems: actionItems,
      reportDigestSha256: digest,
    };
  }

  public static formatMarkdownReport(summary: CisoKpiSummary): string {
    return [
      `# 🛡️ CISO Executive Security Posture KPI Report`,
      ``,
      `- **Tenant ID:** \`${summary.tenantId}\``,
      `- **Generated:** \`${summary.evaluatedAtIso}\``,
      `- **Overall Security Posture:** **${summary.overallSecurityPostureScore}/100 (Grade: ${summary.postureGrade})**`,
      `- **Report Digest:** \`${summary.reportDigestSha256}\``,
      ``,
      `### 📊 Key Compliance Metrics`,
      `- **SOC 2 Type II Coverage:** ${summary.complianceRates.soc2CoveragePct}%`,
      `- **ISO 27001 Coverage:** ${summary.complianceRates.iso27001CoveragePct}%`,
      `- **GDPR DPA Sign-off:** ${summary.complianceRates.gdprDpaCoveragePct}%`,
      `- **Data Residency Compliance:** ${summary.complianceRates.dataResidencyCompliancePct}%`,
      ``,
      `### ⚠️ Risk Distribution`,
      `- **Low Risk Vendors:** ${summary.riskDistribution.lowRiskCount}`,
      `- **Medium Risk Vendors:** ${summary.riskDistribution.mediumRiskCount}`,
      `- **High Risk Vendors:** ${summary.riskDistribution.highRiskCount}`,
      `- **Critical Risk Vendors:** ${summary.riskDistribution.criticalRiskCount}`,
      ``,
      `### 🎯 Priority Action Items (${summary.criticalActionItems.length})`,
      summary.criticalActionItems.length > 0
        ? summary.criticalActionItems.map((item) => `- ❌ ${item}`).join("\n")
        : `- ✅ No critical compliance or security blockers identified.`
    ].join("\n");
  }
}
