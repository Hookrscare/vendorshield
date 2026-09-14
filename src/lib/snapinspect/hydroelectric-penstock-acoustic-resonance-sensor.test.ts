/**
 * SNAP-90: Hydroelectric Penstock Acoustic Resonance & Hydraulic Transient Water-Hammer Sensor Tests.
 */

import { describe, it, expect } from "vitest";
import {
  HydroelectricPenstockAcousticResonanceSensor,
  PenstockGeometry,
  WaterFlowState,
  AcousticEmissionTelemetry,
} from "./hydroelectric-penstock-acoustic-resonance-sensor";

describe("HydroelectricPenstockAcousticResonanceSensor (SNAP-90)", () => {
  const geometry: PenstockGeometry = {
    penstockId: "PENSTOCK-UNIT-3",
    lengthMeters: 650.0,
    outerDiameterMeters: 2.4,
    wallThicknessMeters: 0.028, // 28 mm steel
    steelModulusGpa: 206.0,
    steelPoissonRatio: 0.30,
    designYieldStrengthMpa: 355.0,
  };

  const normalFlow: WaterFlowState = {
    waterDensityKgM3: 1000.0,
    waterBulkModulusGpa: 2.15,
    initialFlowVelocityMps: 3.2,
    rapidClosureDurationSeconds: 8.5, // Slow controlled closure
    staticHeadMeters: 280.0, // ~2.75 MPa
  };

  const quiescentAE: AcousticEmissionTelemetry = {
    sensorRmsDb: 35.0,
    peakFrequencyKhz: 45.0,
    ringdownCountsPerSec: 12,
    cavitationEnergyMj: 0.05,
  };

  it("evaluates controlled slow valve closure with safe stress margins", () => {
    const result = HydroelectricPenstockAcousticResonanceSensor.analyzeTransient(
      geometry,
      normalFlow,
      quiescentAE
    );

    expect(result.penstockId).toBe("PENSTOCK-UNIT-3");
    expect(result.acousticWaveSpeedMps).toBeGreaterThan(950);
    expect(result.acousticWaveSpeedMps).toBeLessThan(1250);
    expect(result.isDirectWaterHammer).toBe(false);
    expect(result.severity).toBe("NORMAL");
    expect(result.governorValveDampingRecommended).toBe(false);
    expect(result.cavitationSeverity).toBe("NONE");
    expect(result.stressRatioToYieldPct).toBeLessThan(50);
  });

  it("detects critical water hammer and excessive hoop stress under rapid valve trip", () => {
    const rapidTripFlow: WaterFlowState = {
      ...normalFlow,
      rapidClosureDurationSeconds: 0.8, // Trip time < round trip reflection (~1.2 s)
      initialFlowVelocityMps: 3.8,
    };

    const result = HydroelectricPenstockAcousticResonanceSensor.analyzeTransient(
      geometry,
      rapidTripFlow,
      quiescentAE
    );

    expect(result.isDirectWaterHammer).toBe(true);
    expect(result.joukowskyPressureSurgeMpa).toBeGreaterThan(4.0);
    expect(result.severity).toBe("CRITICAL_WATER_HAMMER");
    expect(result.governorValveDampingRecommended).toBe(true);
    expect(result.recommendedMinClosureTimeSeconds).toBeGreaterThan(rapidTripFlow.rapidClosureDurationSeconds);
  });

  it("flags rupture risk when high transient pressure couples with severe cavitation ultrasonic emissions", () => {
    const dangerousFlow: WaterFlowState = {
      ...normalFlow,
      initialFlowVelocityMps: 6.2,
      rapidClosureDurationSeconds: 0.3,
      staticHeadMeters: 380.0,
    };

    const severeCavitationAE: AcousticEmissionTelemetry = {
      sensorRmsDb: 92.0,
      peakFrequencyKhz: 180.0, // High-frequency cavitation micro-jets
      ringdownCountsPerSec: 1450,
      cavitationEnergyMj: 14.8,
    };

    const result = HydroelectricPenstockAcousticResonanceSensor.analyzeTransient(
      geometry,
      dangerousFlow,
      severeCavitationAE
    );

    expect(result.cavitationSeverity).toBe("SEVERE_EROSION");
    expect(result.severity).toBe("RUPTURE_RISK");
    expect(result.governorValveDampingRecommended).toBe(true);
  });
});
