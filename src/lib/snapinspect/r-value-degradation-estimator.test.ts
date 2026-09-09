/**
 * SNAP-21 Regression Test Suite: Drone Thermal Envelope Insulation R-Value Degradation Estimator.
 */

import { describe, it, expect } from "vitest";
import { RValueDegradationEstimator, ThermalEnvelopeInspection } from "./r-value-degradation-estimator";

describe("SNAP-21: Drone Thermal Envelope R-Value Degradation Estimator", () => {
  it("verifies optimal retention for well-insulated dry attic assembly", () => {
    const inspection: ThermalEnvelopeInspection = {
      assemblyId: "attic-zone-1",
      assemblyType: "ATTIC_BLOWN_FIBERGLASS",
      areaSquareFeet: 2500,
      nominalDesignRValue: 38,
      indoorTempF: 70,
      outdoorTempF: 20, // Delta-T 50 degF
      surfaceTempF: 20.9, // Delta-T surface 0.9 degF -> small heat flux ~1.31
      moistureSaturationRatio: 0.0
    };

    const res = RValueDegradationEstimator.evaluateAssembly(inspection);
    expect(res.thermalHealthRating).toBe("OPTIMAL_RETENTION");
    expect(res.effectiveMeasuredRValue).toBeGreaterThanOrEqual(35);
    expect(res.degradationPercentage).toBeLessThan(15);
    expect(res.annualCostPenaltyUsd).toBeLessThan(50);
  });

  it("detects severe insulation collapse and energy loss in moisture-compromised roof polyiso", () => {
    const inspection: ThermalEnvelopeInspection = {
      assemblyId: "roof-polyiso-leak",
      assemblyType: "ROOF_POLYISO_BOARD",
      areaSquareFeet: 1200,
      nominalDesignRValue: 30,
      indoorTempF: 72,
      outdoorTempF: 25,
      surfaceTempF: 35, // significant heat escaping through wet deck
      moistureSaturationRatio: 0.45 // 45% moisture saturation
    };

    const res = RValueDegradationEstimator.evaluateAssembly(inspection);
    expect(res.thermalHealthRating).toBe("SEVERE_INSULATION_COLLAPSE");
    expect(res.effectiveMeasuredRValue).toBeLessThan(10);
    expect(res.degradationPercentage).toBeGreaterThan(65);
    expect(res.annualCostPenaltyUsd).toBeGreaterThan(100);
    expect(res.recommendedAction).toContain("Immediate core sampling");
  });

  it("throws error when ambient Delta-T is too low for reliable thermography", () => {
    const inspection: ThermalEnvelopeInspection = {
      assemblyId: "mild-day",
      assemblyType: "EXTERIOR_WALL_BATT",
      areaSquareFeet: 500,
      nominalDesignRValue: 15,
      indoorTempF: 70,
      outdoorTempF: 68, // only 2 degF delta
      surfaceTempF: 68.5,
      moistureSaturationRatio: 0.0
    };

    expect(() => RValueDegradationEstimator.evaluateAssembly(inspection)).toThrow(
      "Delta-T between indoor and outdoor must be >= 5.0 degF"
    );
  });
});
