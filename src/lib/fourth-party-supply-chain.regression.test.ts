import { describe, it, expect } from "vitest";
import {
  FourthPartySupplyChainMapper,
  ThirdPartyVendorNode
} from "./fourth-party-supply-chain";

describe("QA-133: FourthPartySupplyChainMapper Regression Suite", () => {
  const mockVendors: ThirdPartyVendorNode[] = [
    {
      vendorId: "v_auth0",
      vendorName: "Auth0 Inc",
      vendorCriticality: "CRITICAL",
      dataClassification: "PII_CONFIDENTIAL",
      subcontractors: [
        {
          subcontractorId: "sub_aws",
          name: "Amazon Web Services",
          serviceCategory: "CLOUD_INFRASTRUCTURE",
          region: "us-east-1",
          hasDirectDPAFlowDown: true,
          securityTier: "TIER_1_CRITICAL",
          knownBreachHistoryCount: 0
        },
        {
          subcontractorId: "sub_cf",
          name: "Cloudflare",
          serviceCategory: "CLOUD_INFRASTRUCTURE",
          region: "global",
          hasDirectDPAFlowDown: true,
          securityTier: "TIER_1_CRITICAL",
          knownBreachHistoryCount: 0
        }
      ]
    },
    {
      vendorId: "v_stripe",
      vendorName: "Stripe Payments",
      vendorCriticality: "CRITICAL",
      dataClassification: "PCI_RESTRICTED",
      subcontractors: [
        {
          subcontractorId: "sub_aws",
          name: "Amazon Web Services",
          serviceCategory: "CLOUD_INFRASTRUCTURE",
          region: "us-west-2",
          hasDirectDPAFlowDown: true,
          securityTier: "TIER_1_CRITICAL",
          knownBreachHistoryCount: 0
        }
      ]
    },
    {
      vendorId: "v_zendesk",
      vendorName: "Zendesk Support",
      vendorCriticality: "HIGH",
      dataClassification: "PII_CONFIDENTIAL",
      subcontractors: [
        {
          subcontractorId: "sub_aws",
          name: "Amazon Web Services",
          serviceCategory: "CLOUD_INFRASTRUCTURE",
          region: "us-east-1",
          hasDirectDPAFlowDown: true,
          securityTier: "TIER_1_CRITICAL",
          knownBreachHistoryCount: 0
        },
        {
          subcontractorId: "sub_twilio",
          name: "Twilio",
          serviceCategory: "MESSAGING_COMMUNICATION",
          region: "us-east-1",
          hasDirectDPAFlowDown: false, // Unvetted flow down!
          securityTier: "TIER_2_HIGH",
          knownBreachHistoryCount: 1
        }
      ]
    }
  ];

  it("accurately detects systemic single point of failure (AWS shared by 100% of vendors)", () => {
    const analysis = FourthPartySupplyChainMapper.analyzeConcentration(mockVendors);

    expect(analysis.length).toBe(3); // AWS, Cloudflare, Twilio
    const awsAnalysis = analysis.find(a => a.subcontractorName.includes("AMAZON"));
    expect(awsAnalysis).toBeDefined();
    expect(awsAnalysis?.dependentVendorCount).toBe(3);
    expect(awsAnalysis?.dependencyPercentage).toBe(100.0);
    expect(awsAnalysis?.isSystemicSinglePointOfFailure).toBe(true);
  });

  it("simulates catastrophic blast radius when a major infrastructure 4th party fails", () => {
    const blast = FourthPartySupplyChainMapper.simulateBlastRadius("Amazon Web Services", mockVendors);

    expect(blast.impactedVendorCount).toBe(3);
    expect(blast.criticalVendorImpactCount).toBe(2); // Auth0 and Stripe
    expect(blast.restrictedDataExposureCount).toBe(3);
    expect(blast.blastRadiusSeverity).toBe("CATASTROPHIC");
  });

  it("correctly calculates supply chain fragility and flags unvetted flow downs", () => {
    const report = FourthPartySupplyChainMapper.generateSupplyChainAudit(mockVendors);

    expect(report.totalThirdPartyVendors).toBe(3);
    expect(report.totalUniqueFourthParties).toBe(3);
    expect(report.unvettedFlowDownCount).toBe(1); // Twilio
    expect(report.unvettedFlowDownVendors[0].subcontractorName).toBe("Twilio");
    expect(report.systemicSinglePointsOfFailure.length).toBeGreaterThanOrEqual(1);
    expect(report.fragilityIndex).toBeGreaterThanOrEqual(30);
    expect(report.auditDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
