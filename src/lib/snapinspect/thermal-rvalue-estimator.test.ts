import { describe, it, expect } from "vitest";
import {
  ThermalRValueEstimator,
  ThermalTelemetrySample,
  imperialRToMetricRsi,
  classifySeverity,
  estimateDegradation
} from "./thermal-rvalue-estimator";

describe("SNAP-21: ThermalRValueEstimator Suite", () => {
  it("converts Imperial R-values to Metric RSI accurately", () => {
    expect(imperialRToMetricRsi(30.0)).toBeCloseTo(5.283, 2);
    expect(imperialRToMetricRsi(19.0)).toBeCloseTo(3.346, 2);
    expect(imperialRToMetricRsi(13.0)).toBeCloseTo(2.289, 2);
  });

  it("classifies degradation severity tiers correctly", () => {
    expect(classifySeverity(5.0)).toBe("NOMINAL");
    expect(classifySeverity(15.0)).toBe("MILD");
    expect(classifySeverity(30.0)).toBe("MODERATE");
    expect(classifySeverity(50.0)).toBe("SEVERE");
    expect(classifySeverity(75.0)).toBe("CRITICAL");
  });

  it("evaluates nominal roof insulation accurately", () => {
    const sample: ThermalTelemetrySample = {
      sampleId: "s-01",
      sectionType: "PITCHED_ATTIC",
      designedRValueImperial: 38.0,
      indoorAirTempF: 70.0,
      outdoorAirTempF: 20.0,
      measuredExteriorSurfaceTempF: 20.2, // Very low heat flux
      surfaceAreaSqFt: 2500,
      localDegreeDays: 5000,
      energyCostPerKwh: 0.16
    };

    const res = estimateDegradation(sample);
    expect(res.designedRValueImperial).toBe(38.0);
    expect(res.measuredRValueImperial).toBeGreaterThanOrEqual(35.0);
    expect(res.severity).toBe("NOMINAL");
    expect(res.rValueDegradationPct).toBeLessThan(10.0);
    expect(res.remediationRecommendation).toContain("No immediate envelope action required");
  });

  it("diagnoses critical moisture intrusion and computes energy loss cost on flat commercial roof", () => {
    const sample: ThermalTelemetrySample = {
      sampleId: "s-02",
      sectionType: "FLAT_COMMERCIAL_ROOF",
      designedRValueImperial: 30.0,
      indoorAirTempF: 72.0,
      outdoorAirTempF: 25.0,
      measuredExteriorSurfaceTempF: 35.0, // Significant thermal leakage (10°F above ambient)
      surfaceAreaSqFt: 10000,
      localDegreeDays: 5500,
      energyCostPerKwh: 0.18
    };

    const res = estimateDegradation(sample);
    expect(res.severity).toBe("CRITICAL");
    expect(res.rValueDegradationPct).toBeGreaterThanOrEqual(65.0);
    expect(res.suspectedAnomalyCauses.some(c => c.includes("saturated moisture"))).toBe(true);
    expect(res.annualEnergyCostUsd).toBeGreaterThan(500.0);
    expect(res.remediationRecommendation).toContain("IMMEDIATE REPAIR");
  });

  it("throws error if temperature differential is under 5°F", () => {
    const sample: ThermalTelemetrySample = {
      sampleId: "s-invalid",
      sectionType: "EXTERIOR_FACADE_WALL",
      designedRValueImperial: 20.0,
      indoorAirTempF: 70.0,
      outdoorAirTempF: 68.0, // Only 2°F difference
      measuredExteriorSurfaceTempF: 68.5,
      surfaceAreaSqFt: 1500,
      localDegreeDays: 4000,
      energyCostPerKwh: 0.15
    };

    expect(() => estimateDegradation(sample)).toThrow(
      /Delta-T between indoor and outdoor air must be at least 5.0°F/
    );
  });
});
