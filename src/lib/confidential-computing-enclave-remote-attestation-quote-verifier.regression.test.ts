import { describe, it, expect } from "vitest";
import {
  ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier,
  EnclaveRemoteQuote,
  QuoteVerificationPolicy
} from "./confidential-computing-enclave-remote-attestation-quote-verifier";

describe("ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier (QA-189)", () => {
  const now = 1757800000;

  const validQuote: EnclaveRemoteQuote = {
    quoteId: "QUOTE-TDX-2026-9901",
    enclaveInstanceId: "tee-worker-prod-04",
    header: {
      version: 4,
      attestationKeyType: "ECDSA_P256",
      teeType: "TDX",
      vendorId: "INTEL_TCB_V4"
    },
    mrenclave: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    mrsigner: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    reportDataHex: "a1b2c3d4e5f60718293a4b5c6d7e8f00112233445566778899aabbccddeeff00",
    tcb: {
      isvsvn: 5,
      cpusvn: "0a01040810204080",
      pceSvn: 12,
      minAcceptableIsvSvn: 3,
      minAcceptablePceSvn: 10
    },
    certificateChainValid: true,
    hardwareSignatureHex: "3045022100e4b8a1c92b8d00923058209357022039845729384729384729384729384729",
    quoteEpochSeconds: now - 30
  };

  const policy: QuoteVerificationPolicy = {
    expectedMrEnclave: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    expectedMrSigner: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    expectedReportDataHash: "a1b2c3d4e5f60718293a4b5c6d7e8f00112233445566778899aabbccddeeff00",
    maxFreshnessSeconds: 120
  };

  it("successfully attests valid hardware enclave quote with pristine TCB", () => {
    const result = ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier.verifyQuote(
      validQuote,
      policy,
      now
    );

    expect(result.isEnclaveTrusted).toBe(true);
    expect(result.tcbStatus).toBe("TCB_UP_TO_DATE");
    expect(result.freshnessValid).toBe(true);
    expect(result.reportDataBound).toBe(true);
    expect(result.measurementMatched).toBe(true);
    expect(result.certificateRevocationChecked).toBe(true);
    expect(result.verificationDigest).toHaveLength(64);
  });

  it("rejects quote with expired freshness or invalid certificate chain", () => {
    const staleQuote: EnclaveRemoteQuote = {
      ...validQuote,
      certificateChainValid: false,
      quoteEpochSeconds: now - 500
    };

    const result = ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier.verifyQuote(
      staleQuote,
      policy,
      now
    );

    expect(result.isEnclaveTrusted).toBe(false);
    expect(result.freshnessValid).toBe(false);
    expect(result.certificateRevocationChecked).toBe(false);
    expect(result.tcbStatus).toBe("TCB_OUT_OF_DATE_REVOKED");
    expect(result.evaluationErrors.length).toBeGreaterThanOrEqual(2);
  });

  it("detects mismatched code measurement MREnclave tampering", () => {
    const tamperedQuote: EnclaveRemoteQuote = {
      ...validQuote,
      mrenclave: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };

    const result = ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier.verifyQuote(
      tamperedQuote,
      policy,
      now
    );

    expect(result.isEnclaveTrusted).toBe(false);
    expect(result.measurementMatched).toBe(false);
    expect(result.evaluationErrors.some(e => e.includes("MREnclave mismatch"))).toBe(true);
  });

  it("validates mandatory fields", () => {
    expect(() => {
      ConfidentialComputingEnclaveRemoteAttestationQuoteVerifier.verifyQuote(
        { ...validQuote, quoteId: "" },
        policy,
        now
      );
    }).toThrow("Invalid quote: quoteId, enclaveInstanceId, and mrenclave are required.");
  });
});
