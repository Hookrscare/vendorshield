import { describe, it, expect } from "vitest";
import {
  DeepwaterBopShearRamFatigueProfiler,
  BopShearRamActuationEvent
} from "./deepwater-bop-shear-ram-fatigue-profiler";

describe("DeepwaterBopShearRamFatigueProfiler (SNAP-81)", () => {
  it("verifies operational status on compliant rapid subsea closure without galling", () => {
    const event: BopShearRamActuationEvent = {
      actuationId: "BOP-ACT-001",
      waterDepthMeters: 2200,
      closingPressurePsi: 3500,
      closureTimeSeconds: 18.5, // Well under 30s limit
      pipeShearedOdInches: 5.0,
      acousticEmissionEnergyJoules: 120.0, // Low AE energy
      priorCumulativeCycles: 15
    };

    const assessment = DeepwaterBopShearRamFatigueProfiler.profileActuation(event);

    expect(assessment.isApi53CompliantClosure).toBe(true);
    expect(assessment.gallingDetected).toBe(false);
    expect(assessment.status).toBe("OPERATIONAL");
    expect(assessment.remainingUsefulCycles).toBeGreaterThan(150);
    expect(assessment.telemetrySignature).toBeDefined();
  });

  it("detects acoustic emission galling spike and recommends inspection", () => {
    const event: BopShearRamActuationEvent = {
      actuationId: "BOP-ACT-002",
      waterDepthMeters: 1800,
      closingPressurePsi: 4200,
      closureTimeSeconds: 22.0,
      pipeShearedOdInches: 6.625,
      acousticEmissionEnergyJoules: 580.0, // High AE energy exceeds threshold
      priorCumulativeCycles: 40
    };

    const assessment = DeepwaterBopShearRamFatigueProfiler.profileActuation(event);

    expect(assessment.gallingDetected).toBe(true);
    expect(assessment.status).toBe("INSPECTION_RECOMMENDED");
    expect(assessment.incrementalFatigueDamage).toBeGreaterThan(0.01);
  });

  it("triggers critical maintenance if API 53 closure time exceeds 30 seconds", () => {
    const event: BopShearRamActuationEvent = {
      actuationId: "BOP-ACT-003",
      waterDepthMeters: 2500,
      closingPressurePsi: 2800,
      closureTimeSeconds: 34.2, // Exceeds 30s!
      pipeShearedOdInches: 5.0,
      acousticEmissionEnergyJoules: 200.0,
      priorCumulativeCycles: 20
    };

    const assessment = DeepwaterBopShearRamFatigueProfiler.profileActuation(event);

    expect(assessment.isApi53CompliantClosure).toBe(false);
    expect(assessment.status).toBe("CRITICAL_MAINTENANCE_REQUIRED");
  });

  it("throws on invalid pressure or non-positive closure time", () => {
    expect(() =>
      DeepwaterBopShearRamFatigueProfiler.profileActuation({
        actuationId: "BOP-ERR",
        waterDepthMeters: 1000,
        closingPressurePsi: 500, // Too low
        closureTimeSeconds: 15,
        pipeShearedOdInches: 5,
        acousticEmissionEnergyJoules: 100,
        priorCumulativeCycles: 0
      })
    ).toThrow("Invalid actuation parameters");
  });
});
