import { describe, it, expect } from "vitest";
import {
  VendorZtnaSessionRevocationEngine,
  VendorSessionTelemetry,
} from "./vendor-ztna-session-revocation-engine";

describe("QA-174: Enterprise Vendor ZTNA Session Revocation Engine Regression Suite", () => {
  const baseTelemetry: VendorSessionTelemetry = {
    sessionId: "sess_vdr_9918",
    tenantId: "tenant_acme_corp",
    vendorId: "vdr_datadog",
    userId: "usr_integrator_01",
    sessionStartTimeIso: "2026-09-13T10:00:00.000Z",
    lastActiveTimeIso: "2026-09-13T10:15:00.000Z",
    currentGeo: { latitude: 37.7749, longitude: -122.4194, countryCode: "US" }, // San Francisco
    clientIp: "198.51.100.42",
    userAgent: "Mozilla/5.0 VendorAgent/1.0",
    privilegeEscalationAttempted: false,
    knownCompromisedCredentialSignal: false,
  };

  it("maintains session for normal, low-risk single-location vendor usage", () => {
    const result = VendorZtnaSessionRevocationEngine.evaluateSession(baseTelemetry);

    expect(result.action).toBe("MAINTAIN");
    expect(result.riskScore).toBeLessThan(0.30);
    expect(result.riskFactors).toHaveLength(0);
    expect(result.backchannelLogoutToken).toBeUndefined();
    expect(result.auditHashSha256).toHaveLength(64);
  });

  it("triggers instant revocation and dispatches backchannel logout on impossible travel velocity", () => {
    // Session moved from SF to London (8,600 km) in 15 minutes (~34,400 km/h)
    const impossibleTravelTelemetry: VendorSessionTelemetry = {
      ...baseTelemetry,
      previousGeo: { latitude: 37.7749, longitude: -122.4194, countryCode: "US" },
      previousActiveTimeIso: "2026-09-13T10:00:00.000Z",
      currentGeo: { latitude: 51.5074, longitude: -0.1278, countryCode: "GB" }, // London
      lastActiveTimeIso: "2026-09-13T10:15:00.000Z",
    };

    const result = VendorZtnaSessionRevocationEngine.evaluateSession(impossibleTravelTelemetry);

    expect(result.action).toBe("REVOKE_IMMEDIATE");
    expect(result.riskScore).toBeGreaterThanOrEqual(0.90);
    expect(result.calculatedTravelVelocityKmH).toBeGreaterThan(800.0);
    expect(result.riskFactors.some((f) => f.includes("IMPOSSIBLE_TRAVEL"))).toBe(true);
    expect(result.backchannelLogoutToken).toBeDefined();
    expect(result.backchannelLogoutToken?.split(".")).toHaveLength(3);
  });

  it("triggers immediate revocation on compromised credential signal or unauthorized privilege escalation", () => {
    const compromisedTelemetry: VendorSessionTelemetry = {
      ...baseTelemetry,
      knownCompromisedCredentialSignal: true,
      privilegeEscalationAttempted: true,
    };

    const result = VendorZtnaSessionRevocationEngine.evaluateSession(compromisedTelemetry);

    expect(result.action).toBe("REVOKE_IMMEDIATE");
    expect(result.riskScore).toBe(1.0);
    expect(result.riskFactors).toContain("KNOWN_COMPROMISED_CREDENTIAL_FLAGGED");
    expect(result.riskFactors).toContain("UNAUTHORIZED_PRIVILEGE_ESCALATION_DETECTED");
  });

  it("calculates accurate Haversine surface distance across hemispheres", () => {
    // New York (40.7128, -74.0060) to London (51.5074, -0.1278) ~ 5570 km
    const dist = VendorZtnaSessionRevocationEngine.calculateHaversineDistanceKm(
      40.7128,
      -74.006,
      51.5074,
      -0.1278
    );
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(5650);
  });
});
