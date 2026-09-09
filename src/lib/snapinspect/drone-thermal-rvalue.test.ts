import { describe, it, expect } from "vitest";
import {
  DroneThermalRValueEstimator,
  DroneRadiometricInput,
} from "./drone-thermal-rvalue";

describe("SNAP-21: Drone Thermal Envelope Insulation R-Value Degradation Estimator", () => {
  it("calculates accurate heat transfer coefficients and conversions between RSI and Imperial R-value", () => {
    const hc = DroneThermalRValueEstimator.calculateConvectiveCoeff(2.5);
    // hc = 5.7 + 3.8 * 2.5 = 15.2
    expect(hc).toBe(15.2);

    const hr = DroneThermalRValueEstimator.calculateRadiativeCoeff(5.0, 0.0, 0.9);
    expect(hr).toBeGreaterThan(4.0);
    expect(hr).toBeLessThan(6.0);

    const imperial = DroneThermalRValueEstimator.rsiToImperial(2.0);
    expect(imperial).toBe(11.36);

    const rsi = DroneThermalRValueEstimator.imperialToRsi(11.36);
    expect(rsi).toBeCloseTo(2.0, 1);
  });

  it("calculates dew point accurately using Magnus-Tetens formula", () => {
    const dp = DroneThermalRValueEstimator.calculateDewPoint(20.0, 50.0);
    // At 20°C and 50% RH, dew point is approximately 9.3°C
    expect(dp).toBeGreaterThan(8.5);
    expect(dp).toBeLessThan(10.5);
  });

  it("identifies critical insulation degradation and moisture risk on saturated roof", () => {
    const saturatedRoofInput: DroneRadiometricInput = {
      componentType: "COMMERCIAL_FLAT_ROOF",
      nominalDesignRValueImperial: 30.0,
      surfaceTempCelsius: 12.0, // High surface loss during cold weather
      ambientOutdoorTempCelsius: 0.0,
      interiorTempCelsius: 21.0,
      windSpeedMetersPerSec: 3.0,
      surfaceEmissivity: 0.92,
      relativeHumidityPct: 80.0,
    };

    const assessment = DroneThermalRValueEstimator.assessEnvelopeDegradation(saturatedRoofInput);

    expect(assessment.componentType).toBe("COMMERCIAL_FLAT_ROOF");
    expect(assessment.nominalRValueImperial).toBe(30.0);
    expect(assessment.degradationPct).toBeGreaterThan(50);
    expect(assessment.severity).toBe("CRITICAL");
    expect(assessment.moistureIntrusionRisk).toBe(true);
    expect(assessment.remediationRecommendation).toContain("URGENT: Probable wet insulation");
    expect(assessment.estimatedAnnualEnergyLossKwhPerSqMeter).toBeGreaterThan(50);
  });

  it("detects healthy building envelope with negligible degradation", () => {
    // High insulation where exterior surface temp is very close to ambient outdoor temp
    const wellInsulatedWall: DroneRadiometricInput = {
      componentType: "EXTERIOR_WALL_WOOD_FRAME",
      nominalDesignRValueImperial: 20.0,
      surfaceTempCelsius: 0.3, // 0.3°C delta for R-20 wall
      ambientOutdoorTempCelsius: 0.0,
      interiorTempCelsius: 20.0,
      windSpeedMetersPerSec: 1.5,
      surfaceEmissivity: 0.90,
      relativeHumidityPct: 40.0,
    };

    const assessment = DroneThermalRValueEstimator.assessEnvelopeDegradation(wellInsulatedWall);

    expect(assessment.severity).toBe("NEGLIGIBLE");
    expect(assessment.degradationPct).toBeLessThan(15);
    expect(assessment.remediationRecommendation).toContain("within acceptable operating tolerance");
  });
});
