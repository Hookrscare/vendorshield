/**
 * QA-149: Multi-Jurisdiction Cross-Border Data Transfer Risk Assessor Regression Tests.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  CrossBorderTransferRiskAssessor,
  CrossBorderTransferSpec,
} from "./cross-border-transfer-risk-assessor";

describe("QA-149: CrossBorderTransferRiskAssessor", () => {
  const assessor = new CrossBorderTransferRiskAssessor();

  it("authorizes intra-EEA data transfers with low risk score", () => {
    const spec: CrossBorderTransferSpec = {
      transferId: "TRANS-001",
      vendorId: "VEND-EU-DATACENTER",
      vendorName: "Hetzner Online GmbH",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "EU_EEA",
      legalBasis: "ADEQUACY_DECISION_ARTICLE_45",
      sensitivity: "PII_STANDARD",
      dpfCertified: false,
      safeguards: [
        {
          code: "TLS_1_3",
          description: "Encrypted in transit",
          category: "ENCRYPTION_IN_TRANSIT",
          verified: true,
          mitigationFactor: 1.0,
        },
      ],
    };

    const res = assessor.assessTransfer(spec);
    expect(res.approvalStatus).toBe("AUTHORIZED");
    expect(res.riskTier).toBe("LOW");
    expect(res.compositeRiskScore).toBeLessThan(25);
    expect(res.auditDigest).toHaveLength(64);
  });

  it("grants conditional approval for US transfer under EU-US DPF with verified encryption", () => {
    const spec: CrossBorderTransferSpec = {
      transferId: "TRANS-002",
      vendorId: "VEND-US-AWS",
      vendorName: "Amazon Web Services Inc",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "UNITED_STATES",
      legalBasis: "DATA_PRIVACY_FRAMEWORK_DPF",
      sensitivity: "CONFIDENTIAL_BUSINESS_DATA",
      dpfCertified: true,
      safeguards: [
        {
          code: "BYOK_HSM",
          description: "KMS Client-Held Customer Managed Key",
          category: "ENCRYPTION_AT_REST_BYOK",
          verified: true,
          mitigationFactor: 1.0,
        },
        {
          code: "TLS_1_3",
          description: "TLS 1.3 in transit",
          category: "ENCRYPTION_IN_TRANSIT",
          verified: true,
          mitigationFactor: 1.0,
        },
      ],
    };

    const res = assessor.assessTransfer(spec);
    expect(res.riskTier).toBe("LOW");
    expect(res.approvalStatus).toBe("AUTHORIZED");
    expect(res.safeguardMitigationScore).toBe(50);
  });

  it("prohibits unmitigated transfer of sensitive health data to restricted third country", () => {
    const spec: CrossBorderTransferSpec = {
      transferId: "TRANS-003",
      vendorId: "VEND-UNREGULATED",
      vendorName: "Offshore Analytics Ltd",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "RESTRICTED_THIRD_COUNTRY",
      legalBasis: "ARTICLE_49_DEROGATION",
      sensitivity: "SPECIAL_CATEGORY_SENSITIVE_HEALTH_FINANCIAL",
      dpfCertified: false,
      safeguards: [],
    };

    const res = assessor.assessTransfer(spec);
    expect(res.approvalStatus).toBe("PROHIBITED");
    expect(res.riskTier).toBe("CRITICAL");
    expect(res.compositeRiskScore).toBeGreaterThanOrEqual(75);
    expect(res.mandatoryActions.some((a) => a.includes("Halt data export"))).toBe(true);
  });

  it("correctly identifies invalid adequacy claim for non-adequate destination", () => {
    const spec: CrossBorderTransferSpec = {
      transferId: "TRANS-004",
      vendorId: "VEND-AU-HOSTING",
      vendorName: "Sydney Cloud Host",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "AUSTRALIA_PRIVACY_ACT",
      legalBasis: "ADEQUACY_DECISION_ARTICLE_45",
      sensitivity: "PII_STANDARD",
      dpfCertified: false,
      safeguards: [],
    };

    const res = assessor.assessTransfer(spec);
    expect(res.approvalStatus).toBe("PROHIBITED");
    expect(res.mandatoryActions.some((a) => a.includes("Invalid legal basis"))).toBe(true);
  });

  it("calculates aggregate portfolio transfer statistics", () => {
    const transfers: CrossBorderTransferSpec[] = [
      {
        transferId: "T1",
        vendorId: "V1",
        vendorName: "EU Cloud",
        sourceJurisdiction: "EU_EEA",
        destinationJurisdiction: "EU_EEA",
        legalBasis: "ADEQUACY_DECISION_ARTICLE_45",
        sensitivity: "PII_STANDARD",
        dpfCertified: false,
        safeguards: [{ code: "S1", description: "TLS", category: "ENCRYPTION_IN_TRANSIT", verified: true, mitigationFactor: 1.0 }],
      },
      {
        transferId: "T2",
        vendorId: "V2",
        vendorName: "Restricted Ops",
        sourceJurisdiction: "EU_EEA",
        destinationJurisdiction: "RESTRICTED_THIRD_COUNTRY",
        legalBasis: "STANDARD_CONTRACTUAL_CLAUSES_SCC",
        sensitivity: "SPECIAL_CATEGORY_SENSITIVE_HEALTH_FINANCIAL",
        dpfCertified: false,
        safeguards: [],
      },
    ];

    const batch = assessor.batchEvaluateTransfers(transfers);
    expect(batch.totalEvaluated).toBe(2);
    expect(batch.authorizedCount).toBe(1);
    expect(batch.prohibitedCount).toBe(1);
    expect(batch.averageRiskScore).toBeGreaterThan(0);
  });
});
