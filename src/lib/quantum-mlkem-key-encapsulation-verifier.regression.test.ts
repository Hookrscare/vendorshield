/**
 * src/lib/quantum-mlkem-key-encapsulation-verifier.regression.test.ts
 * Regression tests for QA-184: NIST FIPS 203 ML-KEM Key Encapsulation Exchange Verifier.
 */

import { describe, it, expect } from "vitest";
import {
  QuantumMlkemKeyEncapsulationVerifier,
  MLKEM_SPECS,
  type MlkemParameterSet,
} from "./quantum-mlkem-key-encapsulation-verifier";

describe("QA-184: Quantum-Resistant ML-KEM Key Encapsulation Exchange Verifier", () => {
  const paramSets: MlkemParameterSet[] = ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"];

  paramSets.forEach((paramSet) => {
    it(`should successfully verify standard ${paramSet} exchange and derive shared secret`, () => {
      const fixture = QuantumMlkemKeyEncapsulationVerifier.generateMockFixture(paramSet);
      const spec = MLKEM_SPECS[paramSet];

      const res = QuantumMlkemKeyEncapsulationVerifier.verifyExchange({
        vendorId: "vnd_enterprise_aws_kms",
        subprocessorId: "sub_openai_enterprise",
        sessionId: `sess_pqc_${paramSet.toLowerCase()}_001`,
        parameterSet: paramSet,
        publicKeyHex: fixture.publicKeyHex,
        ciphertextHex: fixture.ciphertextHex,
      });

      expect(res.verified).toBe(true);
      expect(res.parameterSet).toBe(paramSet);
      expect(res.securityCategory).toBe(spec.securityCategory);
      expect(res.sharedSecretDerivedHex).toHaveLength(64); // 32 bytes in hex
      expect(res.attestationDigestHex).toHaveLength(64);
      expect(res.implicitRejectionTriggered).toBe(false);
      expect(res.complianceCert.standard).toBe("NIST FIPS 203 (ML-KEM)");
      expect(res.complianceCert.fedrampPqcStatus).toBe("COMPLIANT");
    });
  });

  it("should fail validation and trigger implicit rejection on malformed public key geometry", () => {
    const fixture = QuantumMlkemKeyEncapsulationVerifier.generateMockFixture("ML-KEM-768");
    // Corrupt public key length
    const truncatedPk = fixture.publicKeyHex.slice(0, 100);

    const res = QuantumMlkemKeyEncapsulationVerifier.verifyExchange({
      vendorId: "vnd_acme_corp",
      subprocessorId: "sub_cloud_eu",
      sessionId: "sess_pqc_tamper_02",
      parameterSet: "ML-KEM-768",
      publicKeyHex: truncatedPk,
      ciphertextHex: fixture.ciphertextHex,
    });

    expect(res.verified).toBe(false);
    expect(res.implicitRejectionTriggered).toBe(true);
    expect(res.errors).toBeDefined();
    expect(res.errors?.[0]).toContain("Invalid public key length for ML-KEM-768");
    expect(res.attestationDigestHex).toBe("");
  });

  it("should match when expected shared secret matches derived shared secret", () => {
    const fixture = QuantumMlkemKeyEncapsulationVerifier.generateMockFixture("ML-KEM-512");
    // First run to get expected secret
    const initial = QuantumMlkemKeyEncapsulationVerifier.verifyExchange({
      vendorId: "vnd_primary",
      subprocessorId: "sub_secondary",
      sessionId: "sess_match_01",
      parameterSet: "ML-KEM-512",
      publicKeyHex: fixture.publicKeyHex,
      ciphertextHex: fixture.ciphertextHex,
    });

    const validated = QuantumMlkemKeyEncapsulationVerifier.verifyExchange(
      {
        vendorId: "vnd_primary",
        subprocessorId: "sub_secondary",
        sessionId: "sess_match_01",
        parameterSet: "ML-KEM-512",
        publicKeyHex: fixture.publicKeyHex,
        ciphertextHex: fixture.ciphertextHex,
      },
      initial.sharedSecretDerivedHex
    );

    expect(validated.verified).toBe(true);
    expect(validated.implicitRejectionTriggered).toBe(false);
  });

  it("should flag implicit rejection when expected shared secret diverges", () => {
    const fixture = QuantumMlkemKeyEncapsulationVerifier.generateMockFixture("ML-KEM-512");
    const fakeSecretHex = "00".repeat(32);

    const res = QuantumMlkemKeyEncapsulationVerifier.verifyExchange(
      {
        vendorId: "vnd_primary",
        subprocessorId: "sub_secondary",
        sessionId: "sess_mismatch_02",
        parameterSet: "ML-KEM-512",
        publicKeyHex: fixture.publicKeyHex,
        ciphertextHex: fixture.ciphertextHex,
      },
      fakeSecretHex
    );

    expect(res.verified).toBe(false);
    expect(res.implicitRejectionTriggered).toBe(true);
  });
});
