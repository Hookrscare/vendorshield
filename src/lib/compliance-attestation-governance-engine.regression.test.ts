import { describe, it, expect } from "vitest";
import {
  ComplianceAttestationGovernanceEngine,
  VendorAttestationEvidence
} from "./compliance-attestation-governance-engine";

describe("ComplianceAttestationGovernanceEngine (QA-111)", () => {
  it("approves fully compliant enterprise vendor", () => {
    const evidence: VendorAttestationEvidence = {
      vendorId: "VND-ACME-CLOUD-01",
      vendorName: "Acme Cloud Infrastructure",
      soc2ReportAgeDays: 90,
      soc2ReportCleanOpinion: true,
      penTestAgeDays: 60,
      encryptionAtRestEnforced: true,
      encryptionInTransitTls13: true,
      dpaSigned: true
    };

    const result = ComplianceAttestationGovernanceEngine.evaluateVendorGovernance(evidence);

    expect(result.trustScore).toBe(100);
    expect(result.governancePosture).toBe("FULL_COMPLIANT_ENTERPRISE_READY");
    expect(result.remediationRequirements).toHaveLength(0);
    expect(result.verificationDigest).toHaveLength(64);
  });

  it("identifies high-risk non-compliant vendor with multiple remediation blockers", () => {
    const evidence: VendorAttestationEvidence = {
      vendorId: "VND-SHADOW-OPS-99",
      vendorName: "Shadow Microservice",
      soc2ReportAgeDays: 520,
      soc2ReportCleanOpinion: false,
      penTestAgeDays: 400,
      encryptionAtRestEnforced: false,
      encryptionInTransitTls13: false,
      dpaSigned: false
    };

    const result = ComplianceAttestationGovernanceEngine.evaluateVendorGovernance(evidence);

    expect(result.trustScore).toBe(0);
    expect(result.governancePosture).toBe("HIGH_RISK_GOVERNANCE_BLOCKED");
    expect(result.remediationRequirements.length).toBeGreaterThanOrEqual(4);
  });

  it("validates input sanity", () => {
    expect(() => {
      ComplianceAttestationGovernanceEngine.evaluateVendorGovernance({
        vendorId: "",
        vendorName: "Test",
        soc2ReportAgeDays: 10,
        soc2ReportCleanOpinion: true,
        penTestAgeDays: 10,
        encryptionAtRestEnforced: true,
        encryptionInTransitTls13: true,
        dpaSigned: true
      });
    }).toThrow("vendorId and vendorName must be specified.");
  });
});
