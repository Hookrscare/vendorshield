import { describe, it, expect } from "vitest";
import {
  ZeroTrustSessionPostureReAttestor,
  DeviceTelemetry,
  NetworkContext
} from "./zero-trust-session-posture-re-attestor";

describe("ZeroTrustSessionPostureReAttestor (QA-198)", () => {
  const secretKey = "enterprise_zt_attestation_hmac_secret_key_999";

  const cleanDevice: DeviceTelemetry = {
    deviceId: "DEV-MACBOOK-PRO-01",
    osName: "macOS",
    osVersion: "15.4",
    isEdrAgentActive: true,
    isDiskEncrypted: true,
    isJailbrokenOrRooted: false,
    isSecureEnclavePresent: true
  };

  const cleanNetwork: NetworkContext = {
    ipAddress: "198.51.100.42",
    countryCode: "US",
    asn: 15169,
    isTorOrVpnExitNode: false,
    tlsJa4Fingerprint: "t13d1516h2_8daaf6152771_b18509e421b4",
    geoVelocityKmPerHour: 45.0
  };

  it("should validate a compliant low-risk enterprise session", () => {
    const res = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(
      "SESS-1001",
      "TENANT-GLOBEX",
      "USR-ALICE",
      cleanDevice,
      cleanNetwork,
      secretKey
    );

    expect(res.attestationStatus).toBe("VALID");
    expect(res.currentRiskScore).toBe(0);
    expect(res.requiredAction).toBe("NONE");
    expect(res.anomalyFlags).toHaveLength(0);
    expect(res.attestationDigest).toHaveLength(64);
  });

  it("should trigger stepped-up auth when EDR is inactive or anonymizing VPN is detected", () => {
    const degradedNetwork: NetworkContext = {
      ...cleanNetwork,
      isTorOrVpnExitNode: true
    };

    const res = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(
      "SESS-1002",
      "TENANT-GLOBEX",
      "USR-BOB",
      cleanDevice,
      degradedNetwork,
      secretKey
    );

    expect(res.attestationStatus).toBe("STEPPED_UP_AUTH_REQUIRED");
    expect(res.requiredAction).toBe("WEBAUTHN_FIDO2_CHALLENGE");
    expect(res.currentRiskScore).toBe(30);
    expect(res.anomalyFlags).toContain("HIGH_ANONYMIZING_PROXY_OR_TOR_DETECTED");
  });

  it("should revoke session immediately upon jailbreak or physically impossible geo-velocity", () => {
    const compromisedDevice: DeviceTelemetry = {
      ...cleanDevice,
      isJailbrokenOrRooted: true
    };
    const impossibleTravelNetwork: NetworkContext = {
      ...cleanNetwork,
      geoVelocityKmPerHour: 3400.0 // Supersonic travel anomaly
    };

    const res = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(
      "SESS-1003",
      "TENANT-GLOBEX",
      "USR-ATTACKER",
      compromisedDevice,
      impossibleTravelNetwork,
      secretKey
    );

    expect(res.attestationStatus).toBe("SESSION_REVOKED_COMPROMISED");
    expect(res.requiredAction).toBe("TERMINATE_AND_LOCK_ACCOUNT");
    expect(res.currentRiskScore).toBe(100);
    expect(res.anomalyFlags).toContain("CRITICAL_DEVICE_JAILBROKEN_OR_ROOTED");
  });
});
