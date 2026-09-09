/**
 * Unit tests for SNAP-34: Multi-Spectral Thermal Drone Building Envelope Insulation Loss Heatmap.
 */

import { describe, it, expect } from "vitest";
import {
  BuildingEnvelopeThermalLossProfiler,
  FacadeSurfaceSample,
  BuildingEnvelopeThermalParams,
} from "./building-envelope-thermal-loss";

describe("SNAP-34: BuildingEnvelopeThermalLossProfiler", () => {
  const standardParams: BuildingEnvelopeThermalParams = {
    indoorTempC: 21.0,
    outdoorTempC: 1.0, // 20°C delta T (winter heating condition)
    heatingDegreeDays: 3200,
    energyCostPerKwh: 0.15,
    designedRValueImperial: 20.0,
  };

  it("evaluates healthy insulated facade points with low degradation", () => {
    // Indoor = 21, outdoor = 1. A well-insulated wall interior/exterior surface has small Tx
    const samples: FacadeSurfaceSample[] = [
      { sampleId: "s-01", gridCoordinateX: 0, gridCoordinateY: 0, surfaceTempC: 20.2 },
      { sampleId: "s-02", gridCoordinateX: 1, gridCoordinateY: 0, surfaceTempC: 20.0 },
    ];

    const report = BuildingEnvelopeThermalLossProfiler.analyzeEnvelope("insp-healthy-01", samples, standardParams);

    expect(report.totalSamplesEvaluated).toBe(2);
    expect(report.criticalAnomaliesCount).toBe(0);
    expect(report.overallAverageRValueImperial).toBeGreaterThan(15.0);
    expect(report.diagnoses[0].anomalyType).toBe("ACCEPTABLE_INSULATION");
    expect(report.auditHashSha256).toHaveLength(64);
  });

  it("detects thermal bridging and severe insulation voids", () => {
    // Cold spots on interior or warm leaks on exterior drone thermal view
    const samples: FacadeSurfaceSample[] = [
      { sampleId: "s-bridge", gridCoordinateX: 2, gridCoordinateY: 1, surfaceTempC: 19.5 }, // Moderate bridge (50.8% degradation)
      { sampleId: "s-void", gridCoordinateX: 3, gridCoordinateY: 1, surfaceTempC: 8.0 },    // Severe void (94.3% degradation)
    ];

    const report = BuildingEnvelopeThermalLossProfiler.analyzeEnvelope("insp-bridge-01", samples, standardParams);

    expect(report.criticalAnomaliesCount).toBe(2);
    expect(report.diagnoses.some((d) => d.anomalyType === "INSULATION_VOID")).toBe(true);
    expect(report.diagnoses.some((d) => d.anomalyType === "THERMAL_BRIDGE_STRUCTURAL")).toBe(true);
    expect(report.totalEstimatedAnnualCostPerM2).toBeGreaterThan(5.0);
  });

  it("rejects evaluation when indoor/outdoor Delta-T is below ISO 6781-3 threshold", () => {
    const lowDeltaParams: BuildingEnvelopeThermalParams = {
      ...standardParams,
      indoorTempC: 20.0,
      outdoorTempC: 18.5, // only 1.5°C delta T
    };

    const samples: FacadeSurfaceSample[] = [
      { sampleId: "s-01", gridCoordinateX: 0, gridCoordinateY: 0, surfaceTempC: 19.0 },
    ];

    expect(() =>
      BuildingEnvelopeThermalLossProfiler.analyzeEnvelope("insp-fail-delta", samples, lowDeltaParams)
    ).toThrowError(/Minimum 3.0°C required by ISO 6781-3/);
  });
});
