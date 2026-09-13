import { describe, it, expect } from "vitest";
import {
  CrossBorderCloudDataSovereignEgressPolicyEnforcer,
  OutboundEgressRequest,
  EgressEnforcementDecision
} from "./cross-border-cloud-data-sovereign-egress-policy-enforcer";

describe("QA-182: Cross-Border Cloud Data Sovereign Egress Policy Enforcer", () => {
  it("allows compliant EU-to-US DPF encrypted egress with audit logging", () => {
    const req: OutboundEgressRequest = {
      requestId: "req_sovereign_01",
      sourceCloudRegion: "eu-central-1",
      destinationCloudRegion: "us-east-1",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "EU_US_DPF",
      hasExecutedSccAndTia: true,
      dataSensitivity: "CONFIDENTIAL_PII",
      tlsVersion: "TLS_1_3",
      isKmsEnvelopeEncrypted: true,
      payloadSizeBytes: 45000
    };

    const res: EgressEnforcementDecision = CrossBorderCloudDataSovereignEgressPolicyEnforcer.enforceEgressPolicy(req);
    expect(res.isCompliant).toBe(true);
    expect(res.action).toBe("ALLOW_WITH_AUDIT_LOG");
    expect(res.blockReasonCode).toBeNull();
    expect(res.auditHash).toHaveLength(64);
  });

  it("blocks insecure plaintext egress of sensitive data", () => {
    const req: OutboundEgressRequest = {
      requestId: "req_insecure_02",
      sourceCloudRegion: "eu-west-1",
      destinationCloudRegion: "eu-central-1",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "EU_EEA",
      hasExecutedSccAndTia: false,
      dataSensitivity: "CONFIDENTIAL_PII",
      tlsVersion: "PLAINTEXT_INSECURE", // Insecure!
      isKmsEnvelopeEncrypted: false,
      payloadSizeBytes: 12000
    };

    const res = CrossBorderCloudDataSovereignEgressPolicyEnforcer.enforceEgressPolicy(req);
    expect(res.isCompliant).toBe(false);
    expect(res.action).toBe("BLOCK_AND_QUARANTINE");
    expect(res.blockReasonCode).toBe("ERR_INSECURE_PLAINTEXT_TRANSIT");
  });

  it("blocks cross-border transfer to non-adequate third country without SCC and TIA", () => {
    const req: OutboundEgressRequest = {
      requestId: "req_schrems_03",
      sourceCloudRegion: "eu-west-1",
      destinationCloudRegion: "ap-southeast-1",
      sourceJurisdiction: "EU_EEA",
      destinationJurisdiction: "THIRD_COUNTRY_INADEQUATE",
      hasExecutedSccAndTia: false, // Violation
      dataSensitivity: "CONFIDENTIAL_PII",
      tlsVersion: "TLS_1_3",
      isKmsEnvelopeEncrypted: true,
      payloadSizeBytes: 8500
    };

    const res = CrossBorderCloudDataSovereignEgressPolicyEnforcer.enforceEgressPolicy(req);
    expect(res.isCompliant).toBe(false);
    expect(res.action).toBe("BLOCK_AND_QUARANTINE");
    expect(res.blockReasonCode).toBe("ERR_ILLEGAL_TRANSFER_NO_SCC_TIA");
  });
});
