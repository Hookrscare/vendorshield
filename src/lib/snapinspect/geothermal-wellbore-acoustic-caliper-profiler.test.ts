import { describe, it, expect } from "vitest";
import {
  GeothermalWellboreAcousticCaliperProfiler,
  GeothermalWellboreTelemetry,
} from "./geothermal-wellbore-acoustic-caliper-profiler";

describe("SNAP-89: GeothermalWellboreAcousticCaliperProfiler", () => {
  it("evaluates intact geothermal wellbore casing with high bond index and normal status", () => {
    // 4 echo times yielding ~12.0 mm thickness (5900 m/s * 4.07 us / 2000 = ~12.0 mm)
    const telemetry: GeothermalWellboreTelemetry = {
      wellId: "GEO-WELL-SALTON-09",
      depthMeters: 2850,
      bottomHoleTemperatureCelsius: 220,
      casingNominalOuterDiameterMm: 244.5,
      casingNominalWallThicknessMm: 12.0,
      steelAcousticVelocityMPerSec: 5900,
      echoTransitTimeMicroseconds: [4.07, 4.06, 4.08, 4.07],
      cblAcousticAttenuationDbPerMeter: 36.0,
      mudAcousticImpedanceMrayl: 1.6,
      formationBondQualityRatio: 0.95,
    };

    const evaluation = GeothermalWellboreAcousticCaliperProfiler.evaluateWellboreIntegrity(telemetry);

    expect(evaluation.wellId).toBe("GEO-WELL-SALTON-09");
    expect(evaluation.measuredAverageWallThicknessMm).toBeCloseTo(12.0, 1);
    expect(evaluation.wallThinningPercentage).toBeLessThan(5.0);
    expect(evaluation.cementBondIndex).toBeGreaterThan(0.9);
    expect(evaluation.cementChannelingRisk).toBe("NONE");
    expect(evaluation.remedialSqueezeCementingRequired).toBe(false);
    expect(evaluation.recommendedIntervention).toBe("NORMAL_OPERATION");
    expect(evaluation.auditDigest).toHaveLength(64);
  });

  it("detects severe cement de-bonding and steam channeling requiring remedial squeeze cementing", () => {
    // Thinning wall with poor acoustic attenuation
    const telemetry: GeothermalWellboreTelemetry = {
      wellId: "GEO-WELL-KRAFLA-14",
      depthMeters: 3100,
      bottomHoleTemperatureCelsius: 290,
      casingNominalOuterDiameterMm: 244.5,
      casingNominalWallThicknessMm: 12.0,
      steelAcousticVelocityMPerSec: 5900,
      echoTransitTimeMicroseconds: [3.10, 3.15, 3.20, 3.12], // ~9.2 mm thickness
      cblAcousticAttenuationDbPerMeter: 10.0, // poor attenuation, high transmission in free casing
      mudAcousticImpedanceMrayl: 1.5,
      formationBondQualityRatio: 0.4,
    };

    const evaluation = GeothermalWellboreAcousticCaliperProfiler.evaluateWellboreIntegrity(telemetry);

    expect(evaluation.wallThinningPercentage).toBeGreaterThan(20.0);
    expect(evaluation.cementBondIndex).toBeLessThan(0.45);
    expect(evaluation.cementChannelingRisk).toBe("CRITICAL_STEAM_CHANNEL");
    expect(evaluation.remedialSqueezeCementingRequired).toBe(true);
    expect(evaluation.recommendedIntervention).toBe("REMEDIAL_SQUEEZE_CEMENTING_PACKER");
    expect(evaluation.burstPressureDeratingFactor).toBeLessThan(0.8);
  });

  it("throws validation error for invalid sensor telemetry inputs", () => {
    expect(() => {
      GeothermalWellboreAcousticCaliperProfiler.evaluateWellboreIntegrity({
        wellId: "",
        depthMeters: 100,
        bottomHoleTemperatureCelsius: 150,
        casingNominalOuterDiameterMm: 244.5,
        casingNominalWallThicknessMm: 12.0,
        steelAcousticVelocityMPerSec: 5900,
        echoTransitTimeMicroseconds: [4.0],
        cblAcousticAttenuationDbPerMeter: 30,
        mudAcousticImpedanceMrayl: 1.5,
        formationBondQualityRatio: 0.8,
      });
    }).toThrow("wellId is required.");

    expect(() => {
      GeothermalWellboreAcousticCaliperProfiler.evaluateWellboreIntegrity({
        wellId: "WELL-01",
        depthMeters: 100,
        bottomHoleTemperatureCelsius: 150,
        casingNominalOuterDiameterMm: 244.5,
        casingNominalWallThicknessMm: 12.0,
        steelAcousticVelocityMPerSec: 5900,
        echoTransitTimeMicroseconds: [4.0, 4.0], // less than 4 readings
        cblAcousticAttenuationDbPerMeter: 30,
        mudAcousticImpedanceMrayl: 1.5,
        formationBondQualityRatio: 0.8,
      });
    }).toThrow("at least 4 azimuthal acoustic sensor readings");
  });
});
