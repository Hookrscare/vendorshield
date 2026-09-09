/**
 * QA-133: Automated Vendor Sub-Contractor 4th-Party Supply Chain Risk Mapping.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Maps multi-tier supply chain dependencies (Enterprise -> 3rd-Party Vendor -> 4th-Party Subcontractor).
 * Computes:
 * - Systemic concentration risk (identifying shared single-points-of-failure like AWS, Cloudflare, OpenAI).
 * - Cascading blast radius upon 4th-party outage or breach.
 * - Contractual flow-down compliance (GDPR Article 28(4) & SOC 2 CC9.2 pass-through DPA verification).
 * - Supply Chain Fragility Index (0 - 100).
 */

import { createHash } from "crypto";

export interface FourthPartySubcontractor {
  subcontractorId: string;
  name: string;
  serviceCategory: "CLOUD_INFRASTRUCTURE" | "AI_MODEL_HOSTING" | "PAYMENT_GATEWAY" | "IDENTITY_AUTH" | "MESSAGING_COMMUNICATION" | "DATA_WAREHOUSE";
  region: string;
  hasDirectDPAFlowDown: boolean;
  securityTier: "TIER_1_CRITICAL" | "TIER_2_HIGH" | "TIER_3_STANDARD";
  knownBreachHistoryCount: number;
}

export interface ThirdPartyVendorNode {
  vendorId: string;
  vendorName: string;
  vendorCriticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dataClassification: "PCI_RESTRICTED" | "PII_CONFIDENTIAL" | "INTERNAL" | "PUBLIC";
  subcontractors: FourthPartySubcontractor[];
}

export interface ConcentrationRiskAnalysis {
  subcontractorName: string;
  serviceCategory: string;
  dependentVendorCount: number;
  dependentVendorIds: string[];
  dependencyPercentage: number; // percentage of portfolio relying on this 4th party
  isSystemicSinglePointOfFailure: boolean;
}

export interface SupplyChainAuditReport {
  timestampIso: string;
  totalThirdPartyVendors: number;
  totalUniqueFourthParties: number;
  systemicSinglePointsOfFailure: ConcentrationRiskAnalysis[];
  unvettedFlowDownCount: number;
  unvettedFlowDownVendors: { vendorId: string; subcontractorName: string }[];
  fragilityIndex: number; // 0 (resilient) to 100 (fragile)
  riskRating: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
  auditDigestSha256: string;
}

export class FourthPartySupplyChainMapper {
  public static readonly CONCENTRATION_SPOF_THRESHOLD_PCT = 35.0; // If >= 35% of vendors share a 4th party

  /**
   * Analyzes the 4th-party concentration risk across all registered 3rd-party vendors.
   */
  public static analyzeConcentration(vendors: ThirdPartyVendorNode[]): ConcentrationRiskAnalysis[] {
    if (vendors.length === 0) return [];

    const map = new Map<string, { category: string; vendorIds: Set<string> }>();

    for (const v of vendors) {
      for (const sub of v.subcontractors) {
        const key = sub.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, { category: sub.serviceCategory, vendorIds: new Set() });
        }
        map.get(key)!.vendorIds.add(v.vendorId);
      }
    }

    const totalVendors = vendors.length;
    const results: ConcentrationRiskAnalysis[] = [];

    for (const [subName, data] of map.entries()) {
      const count = data.vendorIds.size;
      const pct = (count / totalVendors) * 100.0;
      results.push({
        subcontractorName: subName.toUpperCase(),
        serviceCategory: data.category,
        dependentVendorCount: count,
        dependentVendorIds: Array.from(data.vendorIds),
        dependencyPercentage: Math.round(pct * 10) / 10,
        isSystemicSinglePointOfFailure: pct >= this.CONCENTRATION_SPOF_THRESHOLD_PCT
      });
    }

    // Sort descending by dependency percentage
    return results.sort((a, b) => b.dependencyPercentage - a.dependencyPercentage);
  }

  /**
   * Simulates the blast radius if a specific 4th-party subcontractor experiences a major failure.
   */
  public static simulateBlastRadius(
    subcontractorName: string,
    vendors: ThirdPartyVendorNode[]
  ): {
    subcontractorName: string;
    impactedVendorCount: number;
    impactedVendorIds: string[];
    criticalVendorImpactCount: number;
    restrictedDataExposureCount: number;
    blastRadiusSeverity: "LOW" | "MEDIUM" | "HIGH" | "CATASTROPHIC";
  } {
    const target = subcontractorName.trim().toLowerCase();
    const impactedVendors = vendors.filter(v =>
      v.subcontractors.some(s => s.name.trim().toLowerCase() === target)
    );

    const criticalCount = impactedVendors.filter(v => v.vendorCriticality === "CRITICAL").length;
    const restrictedCount = impactedVendors.filter(
      v => v.dataClassification === "PCI_RESTRICTED" || v.dataClassification === "PII_CONFIDENTIAL"
    ).length;

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CATASTROPHIC" = "LOW";
    if (criticalCount >= 2 || restrictedCount >= 3) {
      severity = "CATASTROPHIC";
    } else if (criticalCount >= 1 || restrictedCount >= 2) {
      severity = "HIGH";
    } else if (impactedVendors.length >= 2) {
      severity = "MEDIUM";
    }

    return {
      subcontractorName: subcontractorName.toUpperCase(),
      impactedVendorCount: impactedVendors.length,
      impactedVendorIds: impactedVendors.map(v => v.vendorId),
      criticalVendorImpactCount: criticalCount,
      restrictedDataExposureCount: restrictedCount,
      blastRadiusSeverity: severity
    };
  }

  /**
   * Generates a comprehensive supply chain fragility audit report.
   */
  public static generateSupplyChainAudit(vendors: ThirdPartyVendorNode[]): SupplyChainAuditReport {
    const totalVendors = vendors.length;
    const concentration = this.analyzeConcentration(vendors);

    const uniqueSubs = new Set<string>();
    const unvettedFlowDown: { vendorId: string; subcontractorName: string }[] = [];

    for (const v of vendors) {
      for (const s of v.subcontractors) {
        uniqueSubs.add(s.name.trim().toLowerCase());
        if (!s.hasDirectDPAFlowDown) {
          unvettedFlowDown.push({
            vendorId: v.vendorId,
            subcontractorName: s.name
          });
        }
      }
    }

    const spofs = concentration.filter(c => c.isSystemicSinglePointOfFailure);

    // Calculate Fragility Index (0 to 100):
    let fragility = 10;
    fragility += Math.min(50, spofs.length * 15);
    fragility += Math.min(30, unvettedFlowDown.length * 5);
    fragility = Math.min(100, fragility);

    let rating: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL" = "LOW";
    if (fragility >= 70) rating = "CRITICAL";
    else if (fragility >= 45) rating = "ELEVATED";
    else if (fragility >= 25) rating = "MODERATE";

    const timestampIso = new Date().toISOString();
    const digestPayload = JSON.stringify({
      vendors: totalVendors,
      uniqueSubs: uniqueSubs.size,
      spofs: spofs.length,
      fragility,
      timestampIso
    });
    const auditDigestSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      timestampIso,
      totalThirdPartyVendors: totalVendors,
      totalUniqueFourthParties: uniqueSubs.size,
      systemicSinglePointsOfFailure: spofs,
      unvettedFlowDownCount: unvettedFlowDown.length,
      unvettedFlowDownVendors: unvettedFlowDown,
      fragilityIndex: fragility,
      riskRating: rating,
      auditDigestSha256
    };
  }
}
