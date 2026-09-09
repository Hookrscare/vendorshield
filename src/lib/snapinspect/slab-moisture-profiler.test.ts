import { describe, it, expect } from "vitest";
import {
  SlabMoistureProfiler,
  ConcreteSlabSpec,
  ProbeSensorReading
} from "./slab-moisture-profiler";

describe("SNAP-31: SlabMoistureProfiler Vitest Suite", () => {
  it("calculates ASTM F2170 probe depth correctly for on-grade and elevated decks", () => {
    // 5-inch slab on grade: 40% = 2.0 inches
    expect(SlabMoistureProfiler.calculateRequiredProbeDepth(5.0, "SINGLE_SIDE_ON_GRADE")).toBe(2.0);
    // 6-inch elevated slab: 20% = 1.2 inches
    expect(SlabMoistureProfiler.calculateRequiredProbeDepth(6.0, "TWO_SIDE_ELEVATED_DECK")).toBe(1.2);
  });

  it("evaluates acceptable profile for LVT within tolerance", () => {
    const slab: ConcreteSlabSpec = {
      slabThicknessInches: 5.0,
      exposure: "SINGLE_SIDE_ON_GRADE",
      slabAgeDays: 120,
      targetFlooring: "LUXURY_VINYL_PLANK_LVT",
      ambientTempFahrenheit: 72,
      ambientRhPercent: 45
    };

    const probes: ProbeSensorReading[] = [
      { sensorId: "p-top", depthInches: 0.5, temperatureFahrenheit: 71, relativeHumidityPercent: 74.0 },
      { sensorId: "p-core", depthInches: 2.0, temperatureFahrenheit: 70, relativeHumidityPercent: 82.5 }
    ];

    const result = SlabMoistureProfiler.evaluateMoistureProfile(slab, probes);

    expect(result.recommendedProbeDepthInches).toBe(2.0);
    expect(result.coreRelativeHumidityPercent).toBe(82.5);
    expect(result.verticalMoistureGradientPercent).toBe(8.5);
    expect(result.complianceStatus).toBe("ACCEPTABLE_FOR_INSTALL");
    expect(result.daysToTargetProjection).toBe(0);
  });

  it("flags moisture mitigation requirement when RH exceeds hardwood tolerance", () => {
    const slab: ConcreteSlabSpec = {
      slabThicknessInches: 4.0,
      exposure: "SINGLE_SIDE_ON_GRADE",
      slabAgeDays: 60,
      targetFlooring: "HARDWOOD_ENGINEERED", // max 75%
      ambientTempFahrenheit: 68,
      ambientRhPercent: 55
    };

    const probes: ProbeSensorReading[] = [
      { sensorId: "p-core", depthInches: 1.6, temperatureFahrenheit: 68, relativeHumidityPercent: 88.0 }
    ];

    const result = SlabMoistureProfiler.evaluateMoistureProfile(slab, probes);

    expect(result.complianceStatus).toBe("MOISTURE_BARRIER_REQUIRED");
    expect(result.adhesiveToleranceLimitRh).toBe(75.0);
    expect(result.daysToTargetProjection).toBeGreaterThan(0);
    expect(result.remediationPlan[0]).toContain("ASTM F3010");
  });
});
