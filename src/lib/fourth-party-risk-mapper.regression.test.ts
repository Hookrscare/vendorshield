/**
 * QA-133: Regression tests for Automated Vendor Sub-Contractor 4th-Party Supply Chain Risk Mapping.
 */

import { describe, it, expect } from "vitest";
import {
  FourthPartyRiskMapper,
  ThirdPartyVendor,
  FourthPartySubcontractor,
  SupplyChainDependency,
} from "./fourth-party-risk-mapper";

describe("FourthPartyRiskMapper (QA-133)", () => {
  it("handles an empty vendor portfolio gracefully", () => {
    const risks = FourthPartyRiskMapper.mapConcentrationRisks([], [], []);
    expect(risks).toHaveLength(0);

    const manifest = FourthPartyRiskMapper.generateSupplyChainAuditManifest([], [], []);
    expect(manifest.totalDirectVendors).toBe(0);
    expect(manifest.totalFourthPartiesMapped).toBe(0);
    expect(manifest.criticalConcentrationCount).toBe(0);
    expect(manifest.graphChecksumSha256).toHaveLength(64);
  });

  it("identifies systemic concentration SPOF hotspots when multiple vendors depend on the same 4th party", () => {
    const vendors: ThirdPartyVendor[] = [
      {
        vendorId: "v-1",
        vendorName: "AuthCo",
        category: "Identity",
        criticalityTier: "TIER_1_CRITICAL",
        subcontractorIds: ["sub-aws"],
      },
      {
        vendorId: "v-2",
        vendorName: "PayCo",
        category: "Payments",
        criticalityTier: "TIER_1_CRITICAL",
        subcontractorIds: ["sub-aws"],
      },
      {
        vendorId: "v-3",
        vendorName: "DataCo",
        category: "Analytics",
        criticalityTier: "TIER_2_SIGNIFICANT",
        subcontractorIds: ["sub-aws"],
      },
    ];

    const subcontractors: FourthPartySubcontractor[] = [
      {
        subcontractorId: "sub-aws",
        name: "Amazon Web Services",
        serviceType: "CLOUD_INFRASTRUCTURE",
        hostingRegions: ["us-east-1"],
        certifications: ["SOC2_TYPE_II", "ISO_27001", "FEDRAMP"],
        incidentHistoryCount: 0,
      },
    ];

    const dependencies: SupplyChainDependency[] = [
      {
        vendorId: "v-1",
        subcontractorId: "sub-aws",
        dataClassifications: ["PII", "CREDENTIALS"],
        transferLegalBasis: "DPA_AUTHORIZED",
      },
      {
        vendorId: "v-2",
        subcontractorId: "sub-aws",
        dataClassifications: ["FINANCIAL"],
        transferLegalBasis: "DPA_AUTHORIZED",
      },
      {
        vendorId: "v-3",
        subcontractorId: "sub-aws",
        dataClassifications: ["ANALYTICS"],
        transferLegalBasis: "DPA_AUTHORIZED",
      },
    ];

    const risks = FourthPartyRiskMapper.mapConcentrationRisks(
      vendors,
      subcontractors,
      dependencies
    );

    expect(risks).toHaveLength(1);
    expect(risks[0].subcontractorId).toBe("sub-aws");
    expect(risks[0].dependentVendorCount).toBe(3);
    expect(risks[0].concentrationRatio).toBe(1.0); // 3 of 3 = 100%
    expect(risks[0].systemicRiskLevel).toBe("CRITICAL");
  });

  it("models cascade blast radius during a simulated 4th-party outage", () => {
    const vendors: ThirdPartyVendor[] = [
      {
        vendorId: "v-1",
        vendorName: "AuthCo",
        category: "Identity",
        criticalityTier: "TIER_1_CRITICAL",
        subcontractorIds: ["sub-cloud"],
      },
      {
        vendorId: "v-2",
        vendorName: "LogsCo",
        category: "Logging",
        criticalityTier: "TIER_3_TACTICAL",
        subcontractorIds: ["sub-cloud"],
      },
    ];

    const subcontractors: FourthPartySubcontractor[] = [
      {
        subcontractorId: "sub-cloud",
        name: "GlobalCloud Inc",
        serviceType: "CLOUD_INFRASTRUCTURE",
        hostingRegions: ["eu-west-1"],
        certifications: [],
        incidentHistoryCount: 2,
      },
    ];

    const dependencies: SupplyChainDependency[] = [
      {
        vendorId: "v-1",
        subcontractorId: "sub-cloud",
        dataClassifications: ["CREDENTIALS"],
        transferLegalBasis: "SCC_MODULE_3",
      },
      {
        vendorId: "v-2",
        subcontractorId: "sub-cloud",
        dataClassifications: ["ANALYTICS"],
        transferLegalBasis: "DPA_AUTHORIZED",
      },
    ];

    const impact = FourthPartyRiskMapper.simulateCascadeFailure(
      "sub-cloud",
      vendors,
      subcontractors,
      dependencies
    );

    expect(impact.failedSubcontractorId).toBe("sub-cloud");
    expect(impact.totalVendorsImpacted).toBe(2);
    expect(impact.tier1OutageCount).toBe(1);
    expect(impact.systemicFailureSeverity).toBe("CATASTROPHIC"); // 100% of tier 1 vendors affected
  });
});
