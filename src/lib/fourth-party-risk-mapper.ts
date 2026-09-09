/**
 * QA-133: Automated Vendor Sub-Contractor 4th-Party Supply Chain Risk Mapping.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Analyzes multi-tier supplier dependency chains, maps 4th-party sub-contractors,
 * calculates systemic concentration risk, and detects compliance cascade vulnerabilities.
 */

import { createHash } from 'crypto';

export type CriticalityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface FourthPartySubcontractor {
  id: string;
  name: string;
  category: 'INFRASTRUCTURE' | 'IDENTITY' | 'PAYMENTS' | 'COMMUNICATIONS' | 'AI_MODELS' | 'ANALYTICS';
  region: string;
  hasDpa: boolean;
  soc2Valid: boolean;
  riskScore: number; // 0 (safest) to 100 (highest risk)
  dataAccessScope: 'CUSTOMER_PII' | 'METADATA_ONLY' | 'NO_DIRECT_DATA';
}

export interface ThirdPartyVendorNode {
  vendorId: string;
  vendorName: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  subcontractors: FourthPartySubcontractor[];
}

export interface ConcentrationRiskHotspot {
  fourthPartyId: string;
  fourthPartyName: string;
  dependentVendors: string[];
  dependencyPercentage: number; // % of total 3rd-party vendors dependent on this 4th party
  isSystemicSPOF: boolean; // Single Point of Failure (>= 50% dependency)
}

export interface ComplianceCascadeVulnerability {
  vendorId: string;
  vendorName: string;
  fourthPartyId: string;
  fourthPartyName: string;
  deficiencies: string[];
  impactSeverity: CriticalityLevel;
}

export interface SupplyChainRiskReport {
  generatedAt: string;
  totalThirdParties: number;
  totalUniqueFourthParties: number;
  overallSupplyChainRiskScore: number; // 0 to 100
  riskRating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  concentrationHotspots: ConcentrationRiskHotspot[];
  cascadeVulnerabilities: ComplianceCascadeVulnerability[];
  immutableManifestHash: string;
}

export class FourthPartyRiskMapper {
  private vendors: Map<string, ThirdPartyVendorNode> = new Map();

  public registerVendor(vendor: ThirdPartyVendorNode): void {
    this.vendors.set(vendor.vendorId, vendor);
  }

  public registerVendorsBatch(vendors: ThirdPartyVendorNode[]): void {
    for (const v of vendors) {
      this.registerVendor(v);
    }
  }

  public getVendor(vendorId: string): ThirdPartyVendorNode | undefined {
    return this.vendors.get(vendorId);
  }

  public analyzeSupplyChain(): SupplyChainRiskReport {
    const vendorList = Array.from(this.vendors.values());
    const totalVendors = vendorList.length;

    if (totalVendors === 0) {
      return {
        generatedAt: new Date().toISOString(),
        totalThirdParties: 0,
        totalUniqueFourthParties: 0,
        overallSupplyChainRiskScore: 0,
        riskRating: 'LOW',
        concentrationHotspots: [],
        cascadeVulnerabilities: [],
        immutableManifestHash: createHash('sha256').update('EMPTY_CHAIN').digest('hex'),
      };
    }

    // Map 4th parties and track vendor usage
    const fourthPartyUsage = new Map<string, { info: FourthPartySubcontractor; vendors: Set<string> }>();
    const cascadeVulnerabilities: ComplianceCascadeVulnerability[] = [];

    for (const vendor of vendorList) {
      for (const sub of vendor.subcontractors) {
        if (!fourthPartyUsage.has(sub.id)) {
          fourthPartyUsage.set(sub.id, { info: sub, vendors: new Set() });
        }
        fourthPartyUsage.get(sub.id)!.vendors.add(vendor.vendorName);

        // Check for cascade compliance risks
        const deficiencies: string[] = [];
        if (!sub.hasDpa && sub.dataAccessScope !== 'NO_DIRECT_DATA') {
          deficiencies.push('Missing executed Data Processing Addendum (DPA)');
        }
        if (!sub.soc2Valid) {
          deficiencies.push('Expired or absent SOC 2 Type II attestation');
        }
        if (sub.riskScore >= 70) {
          deficiencies.push(`High 4th-party risk score (${sub.riskScore}/100)`);
        }

        if (deficiencies.length > 0) {
          let impact: CriticalityLevel = 'LOW';
          if (vendor.tier === 'TIER_1' && sub.dataAccessScope === 'CUSTOMER_PII') {
            impact = 'CRITICAL';
          } else if (vendor.tier === 'TIER_1' || sub.riskScore >= 70) {
            impact = 'HIGH';
          } else if (deficiencies.length > 1) {
            impact = 'MEDIUM';
          }

          cascadeVulnerabilities.push({
            vendorId: vendor.vendorId,
            vendorName: vendor.vendorName,
            fourthPartyId: sub.id,
            fourthPartyName: sub.name,
            deficiencies,
            impactSeverity: impact,
          });
        }
      }
    }

    // Analyze concentration hotspots
    const concentrationHotspots: ConcentrationRiskHotspot[] = [];
    for (const [subId, data] of fourthPartyUsage.entries()) {
      const depPct = Math.round((data.vendors.size / totalVendors) * 100);
      const isSystemicSPOF = depPct >= 50;
      if (data.vendors.size > 1 || isSystemicSPOF) {
        concentrationHotspots.push({
          fourthPartyId: subId,
          fourthPartyName: data.info.name,
          dependentVendors: Array.from(data.vendors).sort(),
          dependencyPercentage: depPct,
          isSystemicSPOF,
        });
      }
    }

    // Sort concentration hotspots descending by dependency percentage
    concentrationHotspots.sort((a, b) => b.dependencyPercentage - a.dependencyPercentage);

    // Compute composite supply chain risk score
    let baseScore = 0;
    for (const [, data] of fourthPartyUsage.entries()) {
      baseScore += data.info.riskScore;
    }
    const avgSubRisk = fourthPartyUsage.size > 0 ? baseScore / fourthPartyUsage.size : 0;

    // Penalty for concentration SPOF and critical cascade vulnerabilities
    const spofCount = concentrationHotspots.filter((h) => h.isSystemicSPOF).length;
    const criticalVulnerabilitiesCount = cascadeVulnerabilities.filter((v) => v.impactSeverity === 'CRITICAL').length;

    let overallRiskScore = Math.round(
      avgSubRisk * 0.5 + spofCount * 15 + criticalVulnerabilitiesCount * 10
    );
    overallRiskScore = Math.min(100, Math.max(0, overallRiskScore));

    let riskRating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL' = 'LOW';
    if (overallRiskScore >= 75) {
      riskRating = 'CRITICAL';
    } else if (overallRiskScore >= 50) {
      riskRating = 'ELEVATED';
    } else if (overallRiskScore >= 25) {
      riskRating = 'MODERATE';
    }

    // Generate cryptographic audit hash
    const manifestContent = `${totalVendors}:${fourthPartyUsage.size}:${overallRiskScore}:${spofCount}:${criticalVulnerabilitiesCount}`;
    const immutableManifestHash = createHash('sha256').update(manifestContent).digest('hex');

    return {
      generatedAt: new Date().toISOString(),
      totalThirdParties: totalVendors,
      totalUniqueFourthParties: fourthPartyUsage.size,
      overallSupplyChainRiskScore: overallRiskScore,
      riskRating,
      concentrationHotspots,
      cascadeVulnerabilities,
      immutableManifestHash,
    };
  }

  public exportMarkdownReport(report: SupplyChainRiskReport): string {
    const badge =
      report.riskRating === 'LOW'
        ? '🟢 LOW'
        : report.riskRating === 'MODERATE'
        ? '🟡 MODERATE'
        : report.riskRating === 'ELEVATED'
        ? '🟠 ELEVATED'
        : '🔴 CRITICAL';

    const lines = [
      `### 4th-Party Supply Chain Risk Mapping Report (${badge})`,
      `- **Overall Supply Chain Risk Score:** \`${report.overallSupplyChainRiskScore}/100\` (${report.riskRating})`,
      `- **Monitored 3rd-Party Vendors:** \`${report.totalThirdParties}\``,
      `- **Mapped 4th-Party Subcontractors:** \`${report.totalUniqueFourthParties}\``,
      `- **Audit Manifest Digest (SHA-256):** \`${report.immutableManifestHash}\``,
      '',
      '#### 🌐 Systemic Concentration Hotspots & Single Points of Failure',
    ];

    if (report.concentrationHotspots.length === 0) {
      lines.push('_No multi-vendor concentration hotspots identified._');
    } else {
      lines.push('| 4th-Party Subcontractor | Dependent Vendors | Share of Fleet | SPOF Risk? |');
      lines.push('| :--- | :--- | :---: | :---: |');
      for (const h of report.concentrationHotspots) {
        const spof = h.isSystemicSPOF ? '⚠️ YES (>=50%)' : 'NO';
        lines.push(`| **${h.fourthPartyName}** | ${h.dependentVendors.join(', ')} | ${h.dependencyPercentage}% | ${spof} |`);
      }
    }

    lines.push('', '#### ⚠️ Compliance Cascade Vulnerabilities');
    if (report.cascadeVulnerabilities.length === 0) {
      lines.push('_No critical 4th-party compliance cascade gaps detected._');
    } else {
      lines.push('| Primary Vendor | Upstream 4th-Party | Severity | Deficiencies |');
      lines.push('| :--- | :--- | :---: | :--- |');
      for (const v of report.cascadeVulnerabilities) {
        lines.push(`| ${v.vendorName} | ${v.fourthPartyName} | \`${v.impactSeverity}\` | ${v.deficiencies.join('; ')} |`);
      }
    }

    return lines.join('\n');
  }
}
