import { describe, it, expect } from "vitest";
import {
  DroneThermalEnvelopeRValueEngine,
  BuildingEnvelopeThermalParams,
  EnvironmentalConditions
} from "./drone-thermal-envelope-rvalue-engine";

describe("DroneThermalEnvelopeRValueEngine (SNAP-74)", () => {
  const wallParams: BuildingEnvelopeThermalParams = {
    zoneId: "NORTH-FACADE-ZONE-04",
    designNominalRValueSi: 3.50, // ~ R-20 US
    surfaceEmissivity: 0.90,
    convectiveHeatTransferCoeff: 12.0
  };

  it("detects pristine envelope insulation with minimal degradation", () => {
    const env: EnvironmentalConditions = {
      interiorTempCelsius: 22.0,
      exteriorAmbientTempCelsius: 0.0,
      exteriorSurfaceRadiometricTempCelsius: 0.35 // Surface only 0.35 C above ambient -> low heat loss
    };

    const res = DroneThermalEnvelopeRValueEngine.evaluateZoneRValue(wallParams, env);

    expect(res.envelopeThermalHealthTier).toBe("PRISTINE_INSULATION_CONTINUITY");
    expect(res.rValueDegradationPercent).toBeLessThan(15.0);
    expect(res.requiresImmediateIntervention).toBe(false);
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("flags severe moisture intrusion or missing insulation when wall emits high surface heat", () => {
    const env: EnvironmentalConditions = {
      interiorTempCelsius: 22.0,
      exteriorAmbientTempCelsius: 0.0,
      exteriorSurfaceRadiometricTempCelsius: 12.0 // Heavy heat leak -> warm exterior wall
    };

    const res = DroneThermalEnvelopeRValueEngine.evaluateZoneRValue(wallParams, env);

    expect(res.envelopeThermalHealthTier).toBe("SEVERE_MOISTURE_INTRUSION_OR_MISSING_INSULATION");
    expect(res.rValueDegradationPercent).toBeGreaterThanOrEqual(40.0);
    expect(res.requiresImmediateIntervention).toBe(true);
  });

  it("rejects invalid temperature gradients where interior is colder than exterior ambient", () => {
    expect(() => {
      DroneThermalEnvelopeRValueEngine.evaluateZoneRValue(wallParams, {
        interiorTempCelsius: 10.0,
        exteriorAmbientTempCelsius: 25.0,
        exteriorSurfaceRadiometricTempCelsius: 20.0
      });
    }).toThrow("Interior temperature must be greater than exterior ambient for heat loss audit.");
  });
});
