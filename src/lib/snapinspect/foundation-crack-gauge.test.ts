/**
 * SNAP-19 Regression Test Suite: Foundation Structural Crack Width & Settlement Displacement Gauge.
 */

import { describe, it, expect } from "vitest";
import { FoundationCrackGauge, CrackMeasurement } from "./foundation-crack-gauge";

describe("SNAP-19: Foundation Crack Gauge", () => {
  it("classifies hairline shrinkage cracks as Category 1 non-structural", () => {
    const crack: CrackMeasurement = {
      id: "crk-001",
      locationLabel: "North Basement Wall",
      widthMm: 0.6,
      lengthMeters: 1.2,
      orientation: "VERTICAL",
      substrate: "POURED_CONCRETE",
      measuredAtIso: "2026-09-08T10:00:00Z",
      hasWaterIntrusion: false,
      hasShearDisplacement: false
    };

    const res = FoundationCrackGauge.evaluateMeasurement(crack);
    expect(res.damageCategory).toBe("CATEGORY_1_VERY_SLIGHT");
    expect(res.isStructuralConcern).toBe(false);
    expect(res.actionPriority).toBe("ROUTINE_MONITORING");
  });

  it("flags wide diagonal fractures with shear displacement as structural concern", () => {
    const crack: CrackMeasurement = {
      id: "crk-002",
      locationLabel: "Southwest Foundation Corner",
      widthMm: 12.0,
      lengthMeters: 3.5,
      orientation: "DIAGONAL",
      substrate: "CONCRETE_BLOCK_CMU",
      measuredAtIso: "2026-09-08T10:00:00Z",
      hasWaterIntrusion: true,
      hasShearDisplacement: true
    };

    const res = FoundationCrackGauge.evaluateMeasurement(crack);
    expect(res.damageCategory).toBe("CATEGORY_3_MODERATE");
    expect(res.isStructuralConcern).toBe(true);
    expect(res.actionPriority).toBe("STRUCTURAL_ENGINEER_REVIEW");
    expect(res.recommendedRemediation).toContain("Waterproofing membrane");
  });

  it("calculates active progressive settlement displacement velocity across inspections", () => {
    const baseline: CrackMeasurement = {
      id: "crk-003",
      locationLabel: "East Wall Step Crack",
      widthMm: 2.0,
      lengthMeters: 1.5,
      orientation: "STAIR_STEP",
      substrate: "BRICK_MASONRY",
      measuredAtIso: "2026-01-01T00:00:00Z",
      hasWaterIntrusion: false,
      hasShearDisplacement: false
    };

    const followUp: CrackMeasurement = {
      ...baseline,
      widthMm: 4.5,
      measuredAtIso: "2026-07-01T00:00:00Z" // 6 months later, grew by 2.5 mm -> ~0.42 mm/mo
    };

    const trend = FoundationCrackGauge.calculateProgressiveRate(baseline, followUp);
    expect(trend.velocityMmPerMonth).toBeGreaterThan(0.3);
    expect(trend.isProgressiveActiveSettlement).toBe(true);
    expect(trend.warningText).toContain("Active settlement detected");
  });
});
