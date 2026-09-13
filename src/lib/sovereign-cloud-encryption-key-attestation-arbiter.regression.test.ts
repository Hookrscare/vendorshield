import { describe, it, expect } from "vitest";
import {
  SovereignCloudEncryptionKeyAttestationArbiter,
  HsmKeyAttestationCertificate,
  KeyReleaseRequest,
  CustodianSignature
} from "./sovereign-cloud-encryption-key-attestation-arbiter";

describe("SovereignCloudEncryptionKeyAttestationArbiter", () => {
  const custodians = ["custodian_eu_1", "custodian_eu_2", "custodian_eu_3"];
  const arbiter = new SovereignCloudEncryptionKeyAttestationArbiter(custodians, 2, 3);

  const certEu: HsmKeyAttestationCertificate = {
    keyId: "key-hsm-secnumcloud-01",
    hsmProvider: "GCP_CLOUD_EKM",
    region: "europe-west9-paris",
    jurisdiction: "EU_SECNUMCLOUD",
    fipsLevel: 3,
    attestationCertFingerprint: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  };

  const request: KeyReleaseRequest = {
    requestId: "req-sovereign-decrypt-101",
    keyId: "key-hsm-secnumcloud-01",
    requesterService: "billing-pipeline-worker",
    targetDataJurisdiction: "EU_SECNUMCLOUD",
    purpose: "GDPR Art 28 Data Processor Verification"
  };

  it("authorizes key release when quorum M-of-N is satisfied and jurisdiction matches", () => {
    const signatures: CustodianSignature[] = [
      { custodianId: "custodian_eu_1", signatureHex: "a".repeat(64), timestampIso: new Date().toISOString() },
      { custodianId: "custodian_eu_2", signatureHex: "b".repeat(64), timestampIso: new Date().toISOString() }
    ];

    const result = arbiter.evaluateKeyRelease(certEu, request, signatures);
    expect(result.isAuthorized).toBe(true);
    expect(result.status).toBe("AUTHORIZED");
    expect(result.verifiedCustodiansCount).toBe(2);
    expect(result.auditAttestationDigest).toHaveLength(64);
  });

  it("rejects release when quorum is deficient (only 1 valid custodian signature)", () => {
    const signatures: CustodianSignature[] = [
      { custodianId: "custodian_eu_1", signatureHex: "a".repeat(64), timestampIso: new Date().toISOString() },
      { custodianId: "unauthorized_actor", signatureHex: "c".repeat(64), timestampIso: new Date().toISOString() }
    ];

    const result = arbiter.evaluateKeyRelease(certEu, request, signatures);
    expect(result.isAuthorized).toBe(false);
    expect(result.status).toBe("QUORUM_DEFICIENT");
    expect(result.verifiedCustodiansCount).toBe(1);
  });

  it("rejects release when jurisdiction mismatches", () => {
    const certUs: HsmKeyAttestationCertificate = {
      ...certEu,
      jurisdiction: "US_FEDRAMP_HIGH",
      region: "us-gov-west-1"
    };

    const signatures: CustodianSignature[] = [
      { custodianId: "custodian_eu_1", signatureHex: "a".repeat(64), timestampIso: new Date().toISOString() },
      { custodianId: "custodian_eu_2", signatureHex: "b".repeat(64), timestampIso: new Date().toISOString() }
    ];

    const result = arbiter.evaluateKeyRelease(certUs, request, signatures);
    expect(result.isAuthorized).toBe(false);
    expect(result.status).toBe("JURISDICTION_MISMATCH");
  });
});
