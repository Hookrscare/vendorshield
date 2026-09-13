import { describe, it, expect } from "vitest";
import {
  ZeroTrustSessionPostureEngine,
  SessionPostureTelemetry
} from "./zero-trust-session-posture-engine";

describe("ZeroTrustSessionPostureEngine (QA-198)", () => {
  const healthyTelemetry: SessionPostureTelemetry = {
    sessionId: "sess_zt_001",
    tenantId: "tenant_acme_corp",
    userId: "usr_sec_ops",
    deviceEgressIp: "198.51.100.44",
    isManagedDevice: true,
    osDiskEncrypted: true,
    edrAgentActive: true,
    mTLSCertificateValid: true,
    sessionAgeMinutes: 60,
    idleDurationMinutes: 5,
    requestedActionSensitivity: "READ"
  };

  it("permits access for fully compliant, healthy corporate endpoint", () => {
    const res = ZeroTrustSessionPostureEngine.evaluatePosture(healthyTelemetry);
    expect(res.postureScore).toBe(100);
    expect(res.accessDecision).toBe("PERMIT");
    expect(res.riskFactors).toHaveLength(0);
    expect(res.attestationToken).toHaveLength(64);
  });

  it("triggers step-up auth on unmanaged device or export sensitivity", () => {
    const res = ZeroTrustSessionPostureEngine.evaluatePosture({
      ...healthyTelemetry,
      isManagedDevice: false, // -25 => score 75
      requestedActionSensitivity: "EXPORT"
    });
    expect(res.postureScore).toBe(75);
    expect(res.accessDecision).toBe("STEP_UP_AUTH_REQUIRED");
    expect(res.riskFactors).toContain("UNMANAGED_ENDPOINT_DEVICE");
  });

  it("revokes session immediately if client mTLS certificate is invalid", () => {
    const res = ZeroTrustSessionPostureEngine.evaluatePosture({
      ...healthyTelemetry,
      mTLSCertificateValid: false
    });
    expect(res.accessDecision).toBe("SESSION_REVOKED");
    expect(res.riskFactors).toContain("MTLS_CLIENT_CERT_EXPIRED_OR_INVALID");
  });
});
