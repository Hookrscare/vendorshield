import { describe, it, expect } from "vitest";
import {
  EphemeralCredentialJitRevocationAttestor,
  EphemeralSessionPayload,
} from "./ephemeral-credential-jit-revocation-attestor";

describe("QA-197: EphemeralCredentialJitRevocationAttestor", () => {
  it("attests compliant short-lived session with hardware MFA", () => {
    const session: EphemeralSessionPayload = {
      vendorId: "VEND-SNOWFLAKE",
      sessionId: "STS-9912",
      idpProvider: "AWS_STS",
      issuedAtEpochMs: 1700000000000,
      expiresAtEpochMs: 1700000900000, // 900s (15 min)
      revocationConfirmedAtEpochMs: 1700000800000,
      mfaEnforced: true,
      hasHardwareTokenBinding: true,
    };

    const result = EphemeralCredentialJitRevocationAttestor.attestSession(session);
    expect(result.complianceStatus).toBe("COMPLIANT");
    expect(result.sessionDurationSeconds).toBe(900);
    expect(result.isJitRevoked).toBe(true);
    expect(result.complianceScore).toBe(100);
    expect(result.attestationDigest).toHaveLength(64);
  });

  it("flags session exceeding allowable TTL threshold", () => {
    const session: EphemeralSessionPayload = {
      vendorId: "VEND-DATADOG",
      sessionId: "GCP-1144",
      idpProvider: "GCP_WORKLOAD_IDENTITY",
      issuedAtEpochMs: 1700000000000,
      expiresAtEpochMs: 1700007200000, // 7200s (2 hrs > 3600s max)
      mfaEnforced: true,
      hasHardwareTokenBinding: false,
    };

    const result = EphemeralCredentialJitRevocationAttestor.attestSession(session);
    expect(result.complianceStatus).toBe("LIFESPAN_EXCEEDED");
    expect(result.complianceScore).toBeLessThan(50);
    expect(result.recommendedAction).toContain("exceeds SOC 2");
  });

  it("flags long-lived token as static credential masquerading", () => {
    const session: EphemeralSessionPayload = {
      vendorId: "VEND-SHADOW-TOOL",
      sessionId: "ENTRA-9999",
      idpProvider: "AZURE_ENTRA_JIT",
      issuedAtEpochMs: 1700000000000,
      expiresAtEpochMs: 1700259200000, // 3 days
      mfaEnforced: false,
      hasHardwareTokenBinding: false,
    };

    const result = EphemeralCredentialJitRevocationAttestor.attestSession(session);
    expect(result.complianceStatus).toBe("STATIC_KEY_SUSPECTED");
    expect(result.complianceScore).toBe(10);
    expect(result.recommendedAction).toContain("static API key");
  });

  it("throws error for invalid input timestamps", () => {
    expect(() => {
      EphemeralCredentialJitRevocationAttestor.attestSession({
        vendorId: "V1",
        sessionId: "S1",
        idpProvider: "AWS_STS",
        issuedAtEpochMs: 1700000000000,
        expiresAtEpochMs: 1600000000000, // Inverted
        mfaEnforced: true,
        hasHardwareTokenBinding: false,
      });
    }).toThrow();
  });
});
