/**
 * QA-130: Automated CISO Executive Security Posture KPI Dashboard Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Aggregates enterprise compliance telemetry, calculates composite Security Posture Index (SPI),
 * evaluates critical vendor risk distribution, and exports executive CISO dashboards with cryptographic verification.
 */

import { createHash } from "crypto";

export type SecurityGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface VendorComplianceTelemetry {
  vendorId: string;
  vendorName: string;
  soc2Compliant: boolean;
  iso27001Compliant: boolean;
  dpaSigned: boolean;
  sccValid: boolean;
  dataResidencyCompliant: boolean;
  openCriticalCves: number;
  riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  uptimeSlaPct: number;
}

export interface SecurityPostureKpis {
  totalVendors: number;
  soc2ReadinessPct: number;
  iso27001CoveragePct: number;
  dpaCoveragePct: number;
  dataResidencyCompliancePct: number;
  averageUptimeSlaPct: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  totalCriticalCves: number;
  securityPostureIndex: number; // 0 - 100
  grade: SecurityGrade;
  executiveActionRequired: boolean;
}

export interface ExecutiveAlert {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  details: string;
  remediationRecommendation: string;
}

export interface CisoDashboardExport {
  exportId: string;
  tenantId: string;
  generatedAtIso: string;
  kpis: SecurityPostureKpis;
  criticalAlerts: ExecutiveAlert[];
  executiveSummaryMarkdown: string;
  cisoAttestationDigestSha256: string;
}

export class CisoKpiDashboardExporter {
  public static calculateKpis(vendors: VendorComplianceTelemetry[]): SecurityPostureKpis {
    const total = vendors.length;
    if (total === 0) {
      return {
        totalVendors: 0,
        soc2ReadinessPct: 100,
        iso27001CoveragePct: 100,
        dpaCoveragePct: 100,
        dataResidencyCompliancePct: 100,
        averageUptimeSlaPct: 100,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        totalCriticalCves: 0,
        securityPostureIndex: 100,
        grade: "A+",
        executiveActionRequired: false,
      };
    }

    let soc2Count = 0;
    let isoCount = 0;
    let dpaCount = 0;
    let residencyCount = 0;
    let uptimeSum = 0;
    let criticalCves = 0;

    const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const v of vendors) {
      if (v.soc2Compliant) soc2Count++;
      if (v.iso27001Compliant) isoCount++;
      if (v.dpaSigned && v.sccValid) dpaCount++;
      if (v.dataResidencyCompliant) residencyCount++;
      uptimeSum += v.uptimeSlaPct;
      criticalCves += v.openCriticalCves;

      if (v.riskTier === "LOW") riskDist.low++;
      else if (v.riskTier === "MEDIUM") riskDist.medium++;
      else if (v.riskTier === "HIGH") riskDist.high++;
      else if (v.riskTier === "CRITICAL") riskDist.critical++;
    }

    const soc2Pct = Number(((soc2Count / total) * 100).toFixed(1));
    const isoPct = Number(((isoCount / total) * 100).toFixed(1));
    const dpaPct = Number(((dpaCount / total) * 100).toFixed(1));
    const residencyPct = Number(((residencyCount / total) * 100).toFixed(1));
    const avgUptime = Number((uptimeSum / total).toFixed(2));

    // Calculate Composite Security Posture Index (SPI) weighted score
    // Weights: SOC 2 (25%), ISO 27001 (25%), DPA/SCC (25%), Data Residency (15%), Uptime (10%)
    let baseScore =
      soc2Pct * 0.25 +
      isoPct * 0.25 +
      dpaPct * 0.25 +
      residencyPct * 0.15 +
      (Math.min(avgUptime, 100) / 100) * 10;

    // Deduct 5 points per critical CVE and 4 points per critical vendor
    const cveDeduction = criticalCves * 5;
    const criticalVendorDeduction = riskDist.critical * 4;
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - cveDeduction - criticalVendorDeduction)));

    let grade: SecurityGrade = "F";
    if (finalScore >= 95) grade = "A+";
    else if (finalScore >= 85) grade = "A";
    else if (finalScore >= 75) grade = "B";
    else if (finalScore >= 65) grade = "C";
    else if (finalScore >= 50) grade = "D";

    const executiveAction = criticalCves > 0 || riskDist.critical > 0 || finalScore < 75;

    return {
      totalVendors: total,
      soc2ReadinessPct: soc2Pct,
      iso27001CoveragePct: isoPct,
      dpaCoveragePct: dpaPct,
      dataResidencyCompliancePct: residencyPct,
      averageUptimeSlaPct: avgUptime,
      riskDistribution: riskDist,
      totalCriticalCves: criticalCves,
      securityPostureIndex: finalScore,
      grade,
      executiveActionRequired: executiveAction,
    };
  }

  public static generateAlerts(vendors: VendorComplianceTelemetry[], kpis: SecurityPostureKpis): ExecutiveAlert[] {
    const alerts: ExecutiveAlert[] = [];

    if (kpis.totalCriticalCves > 0) {
      alerts.push({
        severity: "CRITICAL",
        title: `Active Critical CVEs Detected (${kpis.totalCriticalCves})`,
        details: "One or more sub-processors report unresolved high-impact common vulnerabilities and exposures.",
        remediationRecommendation: "Trigger emergency vendor remediation SLA workflow and request mitigation proof.",
      });
    }

    if (kpis.riskDistribution.critical > 0) {
      alerts.push({
        severity: "HIGH",
        title: `Critical Vendor Risk Exposure (${kpis.riskDistribution.critical} Vendors)`,
        details: "Sub-processors identified in the critical risk tier lack core trust validations.",
        remediationRecommendation: "Conduct immediate vendor re-assessment or activate redundant failover vendors.",
      });
    }

    if (kpis.dpaCoveragePct < 90) {
      alerts.push({
        severity: "MEDIUM",
        title: "Sub-Processor DPA Coverage Deficit",
        details: `Current DPA & SCC compliance coverage is ${kpis.dpaCoveragePct}%, below the 90% enterprise threshold.`,
        remediationRecommendation: "Execute automated DPA e-signature counter-party renewal engine.",
      });
    }

    return alerts;
  }

  public static generateMarkdownSummary(
    tenantId: string,
    kpis: SecurityPostureKpis,
    alerts: ExecutiveAlert[],
    timestampIso: string
  ): string {
    return `# 🛡️ VendorShield Executive CISO Security Posture Dashboard
**Tenant:** \`${tenantId}\`  
**Generated At:** \`${timestampIso}\`  
**Overall Security Posture Index (SPI):** \`${kpis.securityPostureIndex}/100\` — **Grade: \`${kpis.grade}\`**  
**Executive Action Required:** \`${kpis.executiveActionRequired ? "YES (URGENT)" : "NO (STABLE)"}\`

---

## 📊 Core Compliance & Security Metrics
- **Total Monitored Sub-Processors:** ${kpis.totalVendors}
- **SOC 2 Type II Certified Coverage:** ${kpis.soc2ReadinessPct}%
- **ISO 27001 Annex A Alignment:** ${kpis.iso27001CoveragePct}%
- **GDPR DPA & SCC Coverage:** ${kpis.dpaCoveragePct}%
- **Data Residency Sovereignty Compliance:** ${kpis.dataResidencyCompliancePct}%
- **Sub-Processor SLA Uptime Average:** ${kpis.averageUptimeSlaPct}%

### 🚨 Risk Tier Breakdown
- **Low Risk:** ${kpis.riskDistribution.low}
- **Medium Risk:** ${kpis.riskDistribution.medium}
- **High Risk:** ${kpis.riskDistribution.high}
- **Critical Risk:** ${kpis.riskDistribution.critical}
- **Active Critical CVEs:** ${kpis.totalCriticalCves}

---

## ⚠️ Executive Alerts & Remediations
${
  alerts.length === 0
    ? "_No active critical alerts. All vendors meet baseline posture criteria._"
    : alerts
        .map(
          (a) =>
            `### [${a.severity}] ${a.title}\n- **Details:** ${a.details}\n- **Recommendation:** ${a.remediationRecommendation}`
        )
        .join("\n\n")
}
`;
  }

  public static exportDashboard(
    tenantId: string,
    vendors: VendorComplianceTelemetry[],
    timestampIso: string = new Date().toISOString()
  ): CisoDashboardExport {
    const kpis = this.calculateKpis(vendors);
    const alerts = this.generateAlerts(vendors, kpis);
    const summaryMd = this.generateMarkdownSummary(tenantId, kpis, alerts, timestampIso);

    const payloadToHash = JSON.stringify({
      tenantId,
      timestampIso,
      kpis,
      alerts,
    });
    const digest = createHash("sha256").update(payloadToHash).digest("hex");

    return {
      exportId: `ciso-kpi-${tenantId}-${Date.now()}`,
      tenantId,
      generatedAtIso: timestampIso,
      kpis,
      criticalAlerts: alerts,
      executiveSummaryMarkdown: summaryMd,
      cisoAttestationDigestSha256: digest,
    };
  }
}
