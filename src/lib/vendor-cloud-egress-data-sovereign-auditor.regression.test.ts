import { describe, it, expect } from "vitest";
import {
  VendorCloudEgressDataSovereignAuditor,
  EgressFlow,
  SovereignAuditResult
} from "./vendor-cloud-egress-data-sovereign-auditor";

describe("QA-181: Multi-Region Vendor Cloud Egress Data Sovereign Boundary Auditor", () => {
  it("approves fully compliant EU-to-US DPF certified encrypted egress", () => {
    const flows: EgressFlow[] = [
      {
        flowId: "flow_eu_us_01",
        sourceRegion: "eu-west-1",
        destinationRegion: "us-east-1",
        sourceJurisdiction: "EU_EEA",
        destinationJurisdiction: "EU_US_DPF_CERTIFIED",
        dataClassification: "PII",
        transferMechanism: "EU_US_DATA_PRIVACY_FRAMEWORK",
        isTls13OrMtls: true,
        fieldLevelEncryptionEnabled: true,
        estimatedMonthlyGb: 120.0
      },
      {
        flowId: "flow_eu_intra_02",
        sourceRegion: "eu-west-1",
        destinationRegion: "eu-central-1",
        sourceJurisdiction: "EU_EEA",
        destinationJurisdiction: "EU_EEA",
        dataClassification: "FINANCIAL_PAYMENT",
        transferMechanism: "INTRA_REGION",
        isTls13OrMtls: true,
        fieldLevelEncryptionEnabled: true,
        estimatedMonthlyGb: 500.0
      }
    ];

    const res: SovereignAuditResult = VendorCloudEgressDataSovereignAuditor.auditEgressFlows("vendor_cloudcorp", flows);
    expect(res.compliantFlowsCount).toBe(2);
    expect(res.violations).toHaveLength(0);
    expect(res.complianceScore).toBe(100);
    expect(res.isTransferQuarantined).toBe(false);
    expect(res.auditHash).toHaveLength(64);
  });

  it("detects unencrypted egress and illegal transfer to non-adequate jurisdiction without SCC", () => {
    const flows: EgressFlow[] = [
      {
        flowId: "flow_rogue_01",
        sourceRegion: "eu-central-1",
        destinationRegion: "ap-southeast-1",
        sourceJurisdiction: "EU_EEA",
        destinationJurisdiction: "INADEQUATE_REQUIRES_SCC_TIA",
        dataClassification: "PROTECTED_HEALTH_PHI",
        transferMechanism: "UNPROTECTED_DIRECT_EGRESS", // Illegal transfer
        isTls13OrMtls: false,                         // Insecure transit
        fieldLevelEncryptionEnabled: false,
        estimatedMonthlyGb: 45.0
      }
    ];

    const res = VendorCloudEgressDataSovereignAuditor.auditEgressFlows("vendor_unregulated", flows);
    expect(res.compliantFlowsCount).toBe(0);
    expect(res.isTransferQuarantined).toBe(true);
    expect(res.complianceScore).toBeLessThan(40);
    expect(res.violations.some(v => v.violationCode === "UNENCRYPTED_EGRESS_TRANSIT")).toBe(true);
    expect(res.violations.some(v => v.violationCode === "ILLEGAL_CROSS_BORDER_TRANSFER")).toBe(true);
  });
});
