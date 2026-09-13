import { describe, it, expect } from "vitest";
import {
  LidarPlanarFlatnessToleranceScorer,
  Point3D,
  PlanarToleranceConfig,
} from "./lidar-planar-flatness-tolerance-scorer";

describe("SNAP-77: LidarPlanarFlatnessToleranceScorer", () => {
  const config: PlanarToleranceConfig = {
    maxAllowableRmsdMm: 3.0,
    maxPeakDeviationMm: 5.0,
    targetNormal: [0, 0, 1],
  };

  it("evaluates a planar floor slab within ASTM high-precision tolerances", () => {
    // Generate a 10x10 grid on z = 0.0 with minor sub-millimeter noise
    const points: Point3D[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const noiseM = ((x * 7 + y * 13) % 5 - 2) * 0.0003; // +/- 0.6 mm
        points.push({ x: x * 0.5, y: y * 0.5, z: noiseM });
      }
    }

    const res = LidarPlanarFlatnessToleranceScorer.evaluatePlanarTolerance(
      "slab-sector-4a",
      points,
      config
    );

    expect(res.surfaceId).toBe("slab-sector-4a");
    expect(res.pointsEvaluated).toBe(100);
    expect(res.isWithinTolerance).toBe(true);
    expect(res.rmsdDeviationMm).toBeLessThan(2.0);
    expect(res.peakDeviationMm).toBeLessThan(4.0);
    expect(res.flatnessGrade).toBe("SPECIFICATION_COMPLIANT_PREMIUM");
    expect(res.bestFitNormal[2]).toBeCloseTo(1.0, 2);
    expect(res.telemetryHash).toHaveLength(64);
  });

  it("flags defective floor slab with localized buckling beyond tolerance", () => {
    const points: Point3D[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        points.push({ x: x * 0.5, y: y * 0.5, z: 0.0 });
      }
    }
    // Inject severe 8.5 mm localized deflection bump at point (5, 5)
    points[55] = { x: 2.5, y: 2.5, z: 0.0085 };

    const res = LidarPlanarFlatnessToleranceScorer.evaluatePlanarTolerance(
      "slab-buckled-sector",
      points,
      config
    );

    expect(res.isWithinTolerance).toBe(false);
    expect(res.peakDeviationMm).toBeGreaterThanOrEqual(7.0);
    expect(res.outOfTolerancePointsCount).toBeGreaterThanOrEqual(1);
    expect(res.flatnessGrade).toBe("REMEDIATION_REQUIRED_DEFECTIVE");
  });

  it("throws validation errors on invalid input", () => {
    expect(() =>
      LidarPlanarFlatnessToleranceScorer.evaluatePlanarTolerance("", [], config)
    ).toThrow("surfaceId must be provided.");

    expect(() =>
      LidarPlanarFlatnessToleranceScorer.evaluatePlanarTolerance("surf-1", [{ x: 0, y: 0, z: 0 }], config)
    ).toThrow("At least 3 points are required to define a plane.");
  });
});
