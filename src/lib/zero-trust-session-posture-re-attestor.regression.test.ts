import { describe, it, expect } from "vitest";
import {
  ZeroTrustSessionPostureReAttestor,
  SessionPostureInput,
} from "./zero-trust-session-posture-re-attestor";

describe("QA-198: ZeroTrustSessionPostureReAttestor", () => {
  const healthyInput: SessionPostureInput = {
    sessionId: "sess_xyz123",
    userId: "usr_alice",
    device: {
      deviceId: "dev_macbook_01",
      edrAgentHealthy: true,
      diskEncryptionActive: true,
      osPatchDaysBehind: 5,
    },
    currentGeo: {
      latitude: 40.7128,
      longitude: -74.006,
      timestampEpochMs: 1700000000000,
    },
    sessionAgeMinutes: 45,
    privilegeLevel: "STANDARD",
  };

  it("evaluates a pristine device and session posture as HEALTHY", () => {
    const result = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(healthyInput);
    expect(result.postureStatus).toBe("HEALTHY");
    expect(result.cumulativeRiskScore).toBe(0);
    expect(result.requiresWebAuthnChallenge).toBe(false);
    expect(result.isSessionTerminated).toBe(false);
    expect(result.postureAttestationToken).toHaveLength(64);
  });

  it("triggers STEPPED_UP_AUTH_REQUIRED when EDR agent is unhealthy", () => {
    const degradedInput: SessionPostureInput = {
      ...healthyInput,
      device: {
        ...healthyInput.device,
        edrAgentHealthy: false, // +45 risk
      },
    };

    const result = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(degradedInput);
    expect(result.postureStatus).toBe("STEPPED_UP_AUTH_REQUIRED");
    expect(result.cumulativeRiskScore).toBe(45);
    expect(result.requiresWebAuthnChallenge).toBe(true);
    expect(result.isSessionTerminated).toBe(false);
  });

  it("triggers IMMEDIATE_REVOCATION_REQUIRED upon impossible travel anomaly", () => {
    // NYC to London in 30 minutes (> 11,000 km/h)
    const impossibleTravelInput: SessionPostureInput = {
      ...healthyInput,
      previousGeo: {
        latitude: 40.7128,
        longitude: -74.006, // NYC
        timestampEpochMs: 1700000000000,
      },
      currentGeo: {
        latitude: 51.5074,
        longitude: -0.1278, // London
        timestampEpochMs: 1700000000000 + 30 * 60 * 1000, // 30 mins later
      },
      device: {
        ...healthyInput.device,
        diskEncryptionActive: false, // +25 risk
      },
    };

    const result = ZeroTrustSessionPostureReAttestor.evaluateSessionPosture(impossibleTravelInput);
    expect(result.postureStatus).toBe("IMMEDIATE_REVOCATION_REQUIRED");
    expect(result.cumulativeRiskScore).toBeGreaterThanOrEqual(75);
    expect(result.isSessionTerminated).toBe(true);
    expect(result.riskFactors.some((r) => r.startsWith("IMPOSSIBLE_TRAVEL"))).toBe(true);
  });

  it("validates input boundaries", () => {
    expect(() => {
      ZeroTrustSessionPostureReAttestor.evaluateSessionPosture({
        ...healthyInput,
        sessionId: "",
      });
    }).toThrow();

    expect(() => {
      ZeroTrustSessionPostureReAttestor.evaluateSessionPosture({
        ...healthyInput,
        sessionAgeMinutes: -10,
      });
    }).toThrow();
  });
});
