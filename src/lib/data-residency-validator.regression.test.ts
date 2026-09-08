import { describe, it, expect } from "vitest";
import {
  DataResidencyValidator,
  DataResidencyPolicy,
  SubProcessorLocation
} from "./data-residency-validator";

describe("QA-129: DataResidencyValidator Regression Suite", () => {
  const strictEuPolicy: DataResidencyPolicy = {
    policyId: "POL-EU-STRICT-01",
    allowedJurisdictions: ["EU_EEA"],
    allowTransfersOutsideEU: false,
    requireSccIfTransferred: true,
    blockHighRiskThirdCountries: true
  };

  const hybridEuUsPolicy: DataResidencyPolicy = {
    policyId: "POL-EU-US-HYBRID-02",
    allowedJurisdictions: ["EU_EEA", "US"],
    allowTransfersOutsideEU: true,
    requireSccIfTransferred: true,
    blockHighRiskThirdCountries: true
  };

  const euVendor: SubProcessorLocation = {
    vendorId: "vnd_aws_fra",
    vendorName: "AWS Frankfurt Storage",
    cloudProvider: "AWS",
    regionCode: "eu-central-1",
    jurisdiction: "EU_EEA",
    hasStandardContractualClauses: true,
    hasDataTransferImpactAssessment: true,
    certifiedEuUsDataPrivacyFramework: false
  };

  const usCertifiedVendor: SubProcessorLocation = {
    vendorId: "vnd_stripe_us",
    vendorName: "Stripe US Processing",
    cloudProvider: "AWS",
    regionCode: "us-east-1",
    jurisdiction: "US",
    hasStandardContractualClauses: true,
    hasDataTransferImpactAssessment: true,
    certifiedEuUsDataPrivacyFramework: true
  };

  const uncertifiedUsVendor: SubProcessorLocation = {
    vendorId: "vnd_legacy_analytics",
    vendorName: "Legacy Cloud Analytics",
    cloudProvider: "GCP",
    regionCode: "us-central1",
    jurisdiction: "US",
    hasStandardContractualClauses: false,
    hasDataTransferImpactAssessment: false,
    certifiedEuUsDataPrivacyFramework: false
  };

  it("passes domestic EU processing under strict EU policy", () => {
    const res = DataResidencyValidator.validateLocation(euVendor, strictEuPolicy);
    expect(res.isCompliant).toBe(true);
    expect(res.status).toBe("COMPLIANT_DOMESTIC");
    expect(res.violationReasons.length).toBe(0);
  });

  it("fails US processor under strict EU zero-transfer policy", () => {
    const res = DataResidencyValidator.validateLocation(usCertifiedVendor, strictEuPolicy);
    expect(res.isCompliant).toBe(false);
    expect(res.status).toBe("UNAUTHORIZED_TRANSFER_RESTRICTION");
    expect(res.violationReasons.length).toBeGreaterThan(0);
  });

  it("passes EU-US DPF certified vendor under hybrid policy", () => {
    const res = DataResidencyValidator.validateLocation(usCertifiedVendor, hybridEuUsPolicy);
    expect(res.isCompliant).toBe(true);
    expect(res.status).toBe("COMPLIANT_ADEQUACY_DECISION");
  });

  it("detects critical non-compliance when US vendor lacks safeguards", () => {
    const res = DataResidencyValidator.validateLocation(uncertifiedUsVendor, hybridEuUsPolicy);
    expect(res.isCompliant).toBe(false);
    expect(res.remediationGuidance).toBeDefined();
  });

  it("generates cryptographic audit digest report across vendor portfolio", () => {
    const report = DataResidencyValidator.generateAuditReport(
      [euVendor, usCertifiedVendor],
      hybridEuUsPolicy
    );

    expect(report.totalSubProcessors).toBe(2);
    expect(report.compliantCount).toBe(2);
    expect(report.violationsCount).toBe(0);
    expect(report.complianceDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
