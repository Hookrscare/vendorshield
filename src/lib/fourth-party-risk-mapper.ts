/**
 * QA-133: Automated Vendor Sub-Contractor 4th-Party Supply Chain Risk Mapping.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Maps Nth-tier/4th-party dependencies, detects systemic supply chain concentration risks,
 * models cascade blast radius upon 4th-party failure, and exports cryptographically verifiable supply chain graphs.
 */

import { createHash } from "crypto";

export type VendorCriticalityTier = "TIER_1_CRITICAL" | "TIER_2_SIGNIFICANT" | "TIER_3_TACTICAL";

export type SubcontractorServiceType =
  | "CLOUD_INFRASTRUCTURE"
  | "PAYMENT_GATEWAY"
  | "AI_MODEL_PROVIDER"
  | "IDENTITY_IAM"
  | "DATA_WAREHOUSE"
  | "COMMUNICATIONS_SMS_EMAIL";

export type ComplianceCertification = "SOC2_TYPE_II" | "ISO_27001" | "HIPAA" | "FEDRAMP" | "PCI_DSS";

export interface ThirdPartyVendor {
  vendorId: string;
  vendorName: string;
  category: string;
  criticalityTier: VendorCriticalityTier;
  subcontractorIds: string[];
}

export interface FourthPartySubcontractor {
  subcontractorId: string;
  name: string;
  serviceType: SubcontractorServiceType;
  hostingRegions: string[];
  certifications: ComplianceCertification[];
  incidentHistoryCount: number;
}

export interface SupplyChainDependency {
  vendorId: string;
  subcontractorId: string;
  dataClassifications: ("PII" | "FINANCIAL" | "HEALTH_PHI" | "CREDENTIALS" | "ANALYTICS")[];
  transferLegalBasis: "SCC_MODULE_3" | "DPA_AUTHORIZED" | "ADEQUACY_DECISION" | "DEROGATION";
}

export interface SupplyChainConcentrationRisk {
  subcontractorId: string;
  subcontractorName: string;
  serviceType: SubcontractorServiceType;
  dependentVendorCount: number;
  dependentVendorIds: string[];
  tier1VendorExposureCount: number;
  concentrationRatio: number; // 0.0 to 1.0 (dependent vendors / total vendors)
  systemicRiskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  unmitigatedCertifications: ComplianceCertification[];
}

export interface CascadeFailureImpact {
  failedSubcontractorId: string;
  failedSubcontractorName: string;
  affectedVendors: {
    vendorId: string;
    vendorName: string;
    criticalityTier: VendorCriticalityTier;
    compromisedDataClasses: string[];
  }[];
  totalVendorsImpacted: number;
  tier1OutageCount: number;
  criticalServiceDisruptionRate: number; // 0.0 to 1.0
  systemicFailureSeverity: "NEGLIGIBLE" | "MODERATE" | "SEVERE" | "CATASTROPHIC";
}

export interface SupplyChainAuditManifest {
  manifestId: string;
  generatedAtIso: string;
  totalDirectVendors: number;
  totalFourthPartiesMapped: number;
  criticalConcentrationCount: number;
  highRiskSubcontractorIds: string[];
  graphChecksumSha256: string;
}

export class FourthPartyRiskMapper {
  public static readonly HIGH_CONCENTRATION_RATIO = 0.40; // >= 40% of vendors depend on this 4th-party
  public static readonly CRITICAL_CONCENTRATION_RATIO = 0.60; // >= 60%

  /**
   * Evaluates systemic concentration across all direct vendors and maps 4th-party dependencies.
   */
  public static mapConcentrationRisks(
    vendors: ThirdPartyVendor[],
    subcontractors: FourthPartySubcontractor[],
    dependencies: SupplyChainDependency[]
  ): SupplyChainConcentrationRisk[] {
    if (vendors.length === 0) return [];

    const totalVendors = vendors.length;
    const subMap = new Map<string, FourthPartySubcontractor>(
      subcontractors.map((s) => [s.subcontractorId, s])
    );

    // Group dependent vendors per subcontractor
    const subToVendors = new Map<string, Set<string>>();
    for (const dep of dependencies) {
      if (!subToVendors.has(dep.subcontractorId)) {
        subToVendors.set(dep.subcontractorId, new Set<string>());
      }
      subToVendors.get(dep.subcontractorId)!.add(dep.vendorId);
    }

    const vendorMap = new Map<string, ThirdPartyVendor>(
      vendors.map((v) => [v.vendorId, v])
    );

    const results: SupplyChainConcentrationRisk[] = [];

    for (const [subId, vendorSet] of subToVendors.entries()) {
      const sub = subMap.get(subId);
      const dependentVendorIds = Array.from(vendorSet);
      const dependentCount = dependentVendorIds.length;
      const ratio = dependentCount / totalVendors;

      let tier1Count = 0;
      for (const vid of dependentVendorIds) {
        const v = vendorMap.get(vid);
        if (v && v.criticalityTier === "TIER_1_CRITICAL") {
          tier1Count++;
        }
      }

      // Missing expected standard enterprise certs
      const standardCerts: ComplianceCertification[] = ["SOC2_TYPE_II", "ISO_27001"];
      const missingCerts = standardCerts.filter(
        (c) => !(sub?.certifications || []).includes(c)
      );

      let systemicRiskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
      if (ratio >= this.CRITICAL_CONCENTRATION_RATIO || tier1Count >= 3) {
        systemicRiskLevel = "CRITICAL";
      } else if (ratio >= this.HIGH_CONCENTRATION_RATIO || tier1Count >= 2 || (sub && sub.incidentHistoryCount >= 2)) {
        systemicRiskLevel = "HIGH";
      } else if (ratio >= 0.20 || tier1Count >= 1) {
        systemicRiskLevel = "MODERATE";
      }

      results.push({
        subcontractorId: subId,
        subcontractorName: sub ? sub.name : `Subcontractor-${subId}`,
        serviceType: sub ? sub.serviceType : "CLOUD_INFRASTRUCTURE",
        dependentVendorCount: dependentCount,
        dependentVendorIds,
        tier1VendorExposureCount: tier1Count,
        concentrationRatio: Number(ratio.toFixed(3)),
        systemicRiskLevel,
        unmitigatedCertifications: missingCerts,
      });
    }

    // Sort by descending systemic severity and concentration ratio
    return results.sort((a, b) => b.concentrationRatio - a.concentrationRatio);
  }

  /**
   * Models the cascade blast radius if a single 4th-party subcontractor experiences a catastrophic failure/breach.
   */
  public static simulateCascadeFailure(
    failedSubcontractorId: string,
    vendors: ThirdPartyVendor[],
    subcontractors: FourthPartySubcontractor[],
    dependencies: SupplyChainDependency[]
  ): CascadeFailureImpact {
    const sub = subcontractors.find((s) => s.subcontractorId === failedSubcontractorId);
    const vendorMap = new Map<string, ThirdPartyVendor>(
      vendors.map((v) => [v.vendorId, v])
    );

    const relevantDeps = dependencies.filter(
      (d) => d.subcontractorId === failedSubcontractorId
    );

    const vendorToDataClasses = new Map<string, Set<string>>();
    for (const dep of relevantDeps) {
      if (!vendorToDataClasses.has(dep.vendorId)) {
        vendorToDataClasses.set(dep.vendorId, new Set());
      }
      for (const dc of dep.dataClassifications) {
        vendorToDataClasses.get(dep.vendorId)!.add(dc);
      }
    }

    const affectedVendors = Array.from(vendorToDataClasses.entries()).map(
      ([vid, dcSet]) => {
        const v = vendorMap.get(vid);
        return {
          vendorId: vid,
          vendorName: v ? v.vendorName : `Vendor-${vid}`,
          criticalityTier: v ? v.criticalityTier : "TIER_3_TACTICAL",
          compromisedDataClasses: Array.from(dcSet),
        };
      }
    );

    const tier1Outages = affectedVendors.filter(
      (av) => av.criticalityTier === "TIER_1_CRITICAL"
    ).length;

    const totalTier1InFleet = vendors.filter(
      (v) => v.criticalityTier === "TIER_1_CRITICAL"
    ).length;

    const criticalDisruptionRate =
      totalTier1InFleet > 0 ? tier1Outages / totalTier1InFleet : 0;

    let systemicFailureSeverity: "NEGLIGIBLE" | "MODERATE" | "SEVERE" | "CATASTROPHIC" =
      "NEGLIGIBLE";
    if (criticalDisruptionRate >= 0.5 || tier1Outages >= 3) {
      systemicFailureSeverity = "CATASTROPHIC";
    } else if (criticalDisruptionRate >= 0.25 || tier1Outages >= 1) {
      systemicFailureSeverity = "SEVERE";
    } else if (affectedVendors.length > 0) {
      systemicFailureSeverity = "MODERATE";
    }

    return {
      failedSubcontractorId,
      failedSubcontractorName: sub ? sub.name : `Subcontractor-${failedSubcontractorId}`,
      affectedVendors,
      totalVendorsImpacted: affectedVendors.length,
      tier1OutageCount: tier1Outages,
      criticalServiceDisruptionRate: Number(criticalDisruptionRate.toFixed(3)),
      systemicFailureSeverity,
    };
  }

  /**
   * Issues a cryptographically signed supply chain audit manifest for enterprise CISO trust verification.
   */
  public static generateSupplyChainAuditManifest(
    vendors: ThirdPartyVendor[],
    subcontractors: FourthPartySubcontractor[],
    dependencies: SupplyChainDependency[],
    generatedAtIso?: string
  ): SupplyChainAuditManifest {
    const timestamp = generatedAtIso || new Date().toISOString();
    const risks = this.mapConcentrationRisks(vendors, subcontractors, dependencies);
    const criticalRisks = risks.filter((r) => r.systemicRiskLevel === "CRITICAL");
    const highRiskIds = risks
      .filter((r) => r.systemicRiskLevel === "CRITICAL" || r.systemicRiskLevel === "HIGH")
      .map((r) => r.subcontractorId);

    const rawPayload = JSON.stringify({
      vendors: vendors.map((v) => v.vendorId).sort(),
      subcontractors: subcontractors.map((s) => s.subcontractorId).sort(),
      depCount: dependencies.length,
      criticalCount: criticalRisks.length,
      timestamp,
    });

    const hash = createHash("sha256").update(rawPayload).digest("hex");

    return {
      manifestId: `scm_${hash.slice(0, 12)}`,
      generatedAtIso: timestamp,
      totalDirectVendors: vendors.length,
      totalFourthPartiesMapped: subcontractors.length,
      criticalConcentrationCount: criticalRisks.length,
      highRiskSubcontractorIds: highRiskIds,
      graphChecksumSha256: hash,
    };
  }
}
