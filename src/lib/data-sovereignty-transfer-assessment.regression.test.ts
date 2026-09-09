import { describe, it, expect } from "vitest";
import {
  DataSovereigntyAssessmentEngine,
  CrossBorderTransferRequest
} from "./data-sovereignty-transfer-assessment";

describe("QA-138: Multi-Region Data Sovereignty Cross-Border Transfer Assessment Exporter", () => {
  it("evaluates compliant intra-EEA / Adequacy transfers", () => {
    const req: CrossBorderTransferRequest = {
      transferId: "TRANS-001",
      tenantId: "tenant-berlin-01",
      vendorId: "v-switzerland-host",
      vendorName: "Alpine Cloud AG",
      originJurisdiction: "EU_EEA",
      destinationJurisdiction: "SWITZERLAND",
      dataCategories: ["PII", "FINANCIAL"],
      transferMechanism: "ADEQUACY_DECISION",
      supplementaryMeasures: [
        { id: "m1", name: "TLS 1.3 in transit", type: "TECHNICAL", isImplemented: true, effectivenessWeight: 0.20 }
      ]
    };

    const report = DataSovereigntyAssessmentEngine.evaluateTransfer(req);
    expect(report.surveillanceRiskTier).toBe("LOW");
    expect(report.verdict).toBe("AUTHORIZED_COMPLIANT");
    expect(report.mitigatedRiskScore).toBeLessThanOrEqual(30);
    expect(report.auditSealSha256).toHaveLength(64);
  });

  it("evaluates US transfer requiring DPF and technical supplementary measures", () => {
    const unmitigatedReq: CrossBorderTransferRequest = {
      transferId: "TRANS-002",
      tenantId: "tenant-paris-02",
      vendorId: "v-us-analytics",
      vendorName: "DataMetrics Inc",
      originJurisdiction: "EU_EEA",
      destinationJurisdiction: "UNITED_STATES",
      dataCategories: ["PII", "USAGE_LOGS"],
      transferMechanism: "STANDARD_CONTRACTUAL_CLAUSES_MODULE_2_C2P",
      supplementaryMeasures: [],
      dpfCertified: false
    };

    const unmitigatedReport = DataSovereigntyAssessmentEngine.evaluateTransfer(unmitigatedReq);
    expect(unmitigatedReport.surveillanceRiskTier).toBe("HIGH");
    expect(unmitigatedReport.verdict).toBe("CONDITIONAL_REMEDIATION_REQUIRED");
    expect(unmitigatedReport.recommendedActions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Zero-Knowledge"),
        expect.stringContaining("Tokenization")
      ])
    );

    // Now test with DPF certification and Zero-Knowledge encryption
    const mitigatedReq: CrossBorderTransferRequest = {
      ...unmitigatedReq,
      dpfCertified: true,
      supplementaryMeasures: [
        { id: "m2", name: "Zero-Knowledge Encryption", type: "TECHNICAL", isImplemented: true, effectivenessWeight: 0.40 },
        { id: "m3", name: "Tokenization", type: "TECHNICAL", isImplemented: true, effectivenessWeight: 0.25 }
      ]
    };

    const mitigatedReport = DataSovereigntyAssessmentEngine.evaluateTransfer(mitigatedReq);
    expect(mitigatedReport.verdict).toBe("AUTHORIZED_COMPLIANT");
    expect(mitigatedReport.mitigatedRiskScore).toBeLessThanOrEqual(30);
  });

  it("prohibits high surveillance jurisdictions without sovereign enclaves", () => {
    const req: CrossBorderTransferRequest = {
      transferId: "TRANS-003",
      tenantId: "tenant-eu-defense",
      vendorId: "v-host-ru",
      vendorName: "ThirdParty Server Ru",
      originJurisdiction: "EU_EEA",
      destinationJurisdiction: "RUSSIA",
      dataCategories: ["PII", "CONFIDENTIAL_DOCS"],
      transferMechanism: "EXPLICIT_CONSENT_DEROGATION_ART_49",
      supplementaryMeasures: [
        { id: "m1", name: "Basic AES-128", type: "TECHNICAL", isImplemented: true, effectivenessWeight: 0.10 }
      ]
    };

    const report = DataSovereigntyAssessmentEngine.evaluateTransfer(req);
    expect(report.surveillanceRiskTier).toBe("CRITICAL_UNMITIGATED");
    expect(report.verdict).toBe("PROHIBITED_HIGH_SURVEILLANCE_RISK");
    expect(report.recommendedActions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Cease cross-border transfers immediately")
      ])
    );
  });
});
