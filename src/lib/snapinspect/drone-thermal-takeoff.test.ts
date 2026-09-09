import { describe, it, expect } from "vitest";
import {
  DroneThermalTakeoffCalculator,
  ThermalAnomalyPolygon,
  Point2D,
} from "./drone-thermal-takeoff";

describe("SNAP-29: DroneThermalTakeoffCalculator", () => {
  it("calculates polygon area using Shoelace formula correctly", () => {
    const squareVertices: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const area = DroneThermalTakeoffCalculator.calculatePolygonArea(squareVertices);
    expect(area).toBe(100);

    const triangleVertices: Point2D[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 8 },
    ];
    const triArea = DroneThermalTakeoffCalculator.calculatePolygonArea(triangleVertices);
    expect(triArea).toBe(24);
  });

  it("throws error when polygon has fewer than 3 vertices", () => {
    const invalidVertices: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(() =>
      DroneThermalTakeoffCalculator.calculatePolygonArea(invalidVertices)
    ).toThrow("A polygon must have at least 3 vertices.");
  });

  it("evaluates single critical moisture anomaly polygon accurately", () => {
    const anomaly: ThermalAnomalyPolygon = {
      polygonId: "POLY-ZONE-A1",
      roofZone: "Zone A - North Deck",
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      measuredDeltaTempC: 3.2,
      insulationType: "POLYISOCYANURATE_ISO",
      insulationThicknessInches: 2.0,
      estimatedSaturationPercent: 65,
    };

    const takeoff = DroneThermalTakeoffCalculator.evaluateAnomaly(anomaly);
    expect(takeoff.polygonId).toBe("POLY-ZONE-A1");
    expect(takeoff.areaSqMeters).toBe(100);
    expect(takeoff.areaSqFeet).toBeCloseTo(1076.4, 1);
    expect(takeoff.anomalySeverity).toBe("CRITICAL_SATURATION");
    expect(takeoff.totalSaturatedWeightLbs).toBeGreaterThan(takeoff.dryInsulationWeightLbs);
    expect(takeoff.recommendedCoreSamplesCount).toBeGreaterThanOrEqual(2);
  });

  it("classifies moderate moisture and thermal bridge anomalies", () => {
    const moderateAnomaly: ThermalAnomalyPolygon = {
      polygonId: "POLY-MOD",
      roofZone: "Zone B",
      vertices: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
        { x: 0, y: 5 },
      ],
      measuredDeltaTempC: 1.5,
      insulationType: "EXPANDED_POLYSTYRENE_EPS",
      insulationThicknessInches: 1.5,
      estimatedSaturationPercent: 25,
    };
    const modTakeoff = DroneThermalTakeoffCalculator.evaluateAnomaly(moderateAnomaly);
    expect(modTakeoff.anomalySeverity).toBe("MODERATE_MOISTURE");

    const bridgeAnomaly: ThermalAnomalyPolygon = {
      polygonId: "POLY-BRIDGE",
      roofZone: "Zone C",
      vertices: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ],
      measuredDeltaTempC: 0.5,
      insulationType: "MINERAL_WOOL",
      insulationThicknessInches: 3.0,
      estimatedSaturationPercent: 5,
    };
    const bridgeTakeoff = DroneThermalTakeoffCalculator.evaluateAnomaly(bridgeAnomaly);
    expect(bridgeTakeoff.anomalySeverity).toBe("SUSPECTED_THERMAL_BRIDGE");
  });

  it("calculates comprehensive roof takeoff summary with cryptographic checksum", () => {
    const totalRoofAreaSqFeet = 20000;
    const anomalies: ThermalAnomalyPolygon[] = [
      {
        polygonId: "P-1",
        roofZone: "Section 1",
        vertices: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        measuredDeltaTempC: 3.5,
        insulationType: "POLYISOCYANURATE_ISO",
        insulationThicknessInches: 2.5,
        estimatedSaturationPercent: 80,
      },
      {
        polygonId: "P-2",
        roofZone: "Section 2",
        vertices: [
          { x: 15, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 8 },
          { x: 15, y: 8 },
        ],
        measuredDeltaTempC: 1.8,
        insulationType: "EXTRUDED_POLYSTYRENE_XPS",
        insulationThicknessInches: 2.0,
        estimatedSaturationPercent: 30,
      },
    ];

    const summary = DroneThermalTakeoffCalculator.calculateRoofTakeoff(
      totalRoofAreaSqFeet,
      anomalies
    );

    expect(summary.roofAreaAssessedSqFeet).toBe(20000);
    expect(summary.breakdown.length).toBe(2);
    expect(summary.percentageRoofDeckCompromised).toBeGreaterThan(0);
    expect(summary.totalSaturatedTearOffWeightTons).toBeGreaterThan(0);
    expect(summary.totalRecommendedCoreCuts).toBeGreaterThanOrEqual(2);
    expect(summary.calculationChecksum).toMatch(/^ROOF-TAKEOFF-[0-9A-F]+$/);
  });

  it("throws error for invalid total roof area in roof takeoff calculation", () => {
    expect(() =>
      DroneThermalTakeoffCalculator.calculateRoofTakeoff(0, [])
    ).toThrow("Total roof area must be greater than zero.");
  });
});
