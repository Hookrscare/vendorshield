/**
 * QA-130: Automated CISO Executive Security Posture KPI Dashboard Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Computes enterprise TPRM metrics, vendor compliance rates, critical coverage,
 * posture grade, and generates board-ready executive summaries with SHA-256 seals.
 */

import { createHash } from "crypto";

export interface VendorPostureRecord {
  vendorId: string;
  vendorName: string;
  criticalityTier: "TIER_1_CRITICAL" | "TIER_2_SIGNIFICANT" | "TIER_3_LOW";
  hasValidDpa: boolean;
  hasSoc2Type2OrIso: boolean;
  unresolvedCriticalCves: number;
  openSlaBreach: boolean;
}

export interface CisoKpiSummary {
  calculatedAtIso: string;
  totalVendors: number;
  tier1VendorCount: number;
  dpaComplianceRatePct: number;
  criticalCoveragePct: number;
  totalCriticalCves: number;
  slaBreachCount: number;
  overallRiskScore: number; // 0 to 100 (higher = safer posture)
  postureGrade: "EXCELLENT" | "ADEQUATE" | "AT_RISK" | "CRITICAL_ACTION_REQUIRED";
  keyRecommendations: string[];
  auditDigestSha256: string;
}

export class CisoKpiExporter {
  public static calculateKpis(vendors: VendorPostureRecord[], timestampIso: string = new Date().toISOString()): CisoKpiSummary {
    if (vendors.length === 0) {
      return {
        calculatedAtIso: timestampIso,
        totalVendors: 0,
        tier1VendorCount: 0,
        dpaComplianceRatePct: 100,
        criticalCoveragePct: 100,
        totalCriticalCves: 0,
        slaBreachCount: 0,
        overallRiskScore: 100,
        postureGrade: "EXCELLENT",
        keyRecommendations: ["No third-party vendors on record."],
        auditDigestSha256: createHash("sha256").update("EMPTY_ROSTER").digest("hex")
      };
    }

    const totalVendors = vendors.length;
    const tier1Vendors = vendors.filter(v => v.criticalityTier === "TIER_1_CRITICAL");
    const dpaValidCount = vendors.filter(v => v.hasValidDpa).length;
    const criticalWithCerts = tier1Vendors.filter(v => v.hasSoc2Type2OrIso).length;
    const totalCriticalCves = vendors.reduce((acc, v) => acc + v.unresolvedCriticalCves, 0);
    const slaBreachCount = vendors.filter(v => v.openSlaBreach).length;

    const dpaComplianceRatePct = Math.round((dpaValidCount / totalVendors) * 1000) / 10;
    const criticalCoveragePct = tier1Vendors.length > 0
      ? Math.round((criticalWithCerts / tier1Vendors.length) * 1000) / 10
      : 100;

    // Score calculation:
    // Base 100 points
    // - DPA penalty: up to -30 based on missing %
    // - Critical coverage penalty: up to -35 based on missing %
    // - CVE penalty: -5 per critical CVE up to -25
    // - SLA breach penalty: -10 per breach up to -20
    const dpaPenalty = (100 - dpaComplianceRatePct) * 0.3;
    const certPenalty = (100 - criticalCoveragePct) * 0.35;
    const cvePenalty = Math.min(25, totalCriticalCves * 5);
    const slaPenalty = Math.min(20, slaBreachCount * 10);

    const calculatedScore = Math.max(0, Math.min(100, Math.round(100 - dpaPenalty - certPenalty - cvePenalty - slaPenalty)));

    let postureGrade: CisoKpiSummary["postureGrade"] = "EXCELLENT";
    if (calculatedScore < 60) {
      postureGrade = "CRITICAL_ACTION_REQUIRED";
    } else if (calculatedScore < 75) {
      postureGrade = "AT_RISK";
    } else if (calculatedScore < 90) {
      postureGrade = "ADEQUATE";
    }

    const recommendations: string[] = [];
    if (dpaComplianceRatePct < 100) {
      recommendations.push(`Execute outstanding DPAs for ${totalVendors - dpaValidCount} non-compliant vendor(s).`);
    }
    if (criticalCoveragePct < 100) {
      recommendations.push(`Obtain SOC 2 Type II or ISO 27001 certs for ${tier1Vendors.length - criticalWithCerts} Tier-1 critical vendor(s).`);
    }
    if (totalCriticalCves > 0) {
      recommendations.push(`Remediate ${totalCriticalCves} active critical CVE vulnerability exposure(s).`);
    }
    if (slaBreachCount > 0) {
      recommendations.push(`Resolve ${slaBreachCount} open vendor compliance SLA breach(es).`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Third-party security posture is optimal; maintain ongoing continuous monitoring.");
    }

    const rawPayload = JSON.stringify({
      timestampIso,
      totalVendors,
      dpaComplianceRatePct,
      criticalCoveragePct,
      totalCriticalCves,
      calculatedScore,
      postureGrade
    });
    const auditDigestSha256 = createHash("sha256").update(rawPayload).digest("hex");

    return {
      calculatedAtIso: timestampIso,
      totalVendors,
      tier1VendorCount: tier1Vendors.length,
      dpaComplianceRatePct,
      criticalCoveragePct,
      totalCriticalCves,
      slaBreachCount,
      overallRiskScore: calculatedScore,
      postureGrade,
      keyRecommendations: recommendations,
      auditDigestSha256
    };
  }

  public static generateExecutiveMarkdown(kpi: CisoKpiSummary): string {
    return [
      `# 🛡️ Executive Security Posture KPI Dashboard`,
      `**Generated At:** \`${kpi.calculatedAtIso}\` | **Audit Seal:** \`${kpi.auditDigestSha256.slice(0, 16)}...\``,
      ``,
      `### Executive Health Overview`,
      `- **Overall Security Posture Grade:** **${kpi.postureGrade}** (${kpi.overallRiskScore} / 100)`,
      `- **Total Monitored Sub-Processors:** ${kpi.totalVendors} (${kpi.tier1VendorCount} Tier-1 Critical)`,
      `- **DPA Compliance Rate:** ${kpi.dpaComplianceRatePct}%`,
      `- **Tier-1 SOC 2 / ISO Coverage:** ${kpi.criticalCoveragePct}%`,
      `- **Active Critical CVE Exposures:** ${kpi.totalCriticalCves}`,
      `- **SLA Governance Breaches:** ${kpi.slaBreachCount}`,
      ``,
      `### Priority Action Items`,
      ...kpi.keyRecommendations.map(r => `- ⚠️ ${r}`)
    ].join("\n");
  }
}
