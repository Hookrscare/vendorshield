import { describe, it, expect } from "vitest";
import {
  LidarDeviationHeatmapEngine,
  DesignPlane,
  Point3D
} from "./lidar-deviation-heatmap";

describe("SNAP-27: Automated As-Built vs Design LiDAR Point Cloud Deviation Heatmap", () => {
  const horizontalFloorPlane: DesignPlane = {
    id: "PLANE-FLR-01",
    name: "Level 2 Concrete Slab",
    // Normal pointing straight up along Z axis: [0, 0, 1]
    normal: [0, 0, 1],
    // D = 0 implies floor surface is at Z = 0
    d: 0,
    bounds: {
      minX: 0,
      minY: 0,
      minZ: -0.5,
      maxX: 10,
      maxY: 10,
      maxZ: 0.5
    },
    toleranceMm: 5.0 // ±5mm allowable tolerance
  };

  it("calculates deviations and accurately classifies in-tolerance points", () => {
    const points: Point3D[] = [
      { x: 1.0, y: 1.0, z: 0.002 },  // +2mm: within 5mm tolerance
      { x: 2.0, y: 2.0, z: -0.003 }, // -3mm: within 5mm tolerance
      { x: 3.0, y: 3.0, z: 0.0 }     // 0mm: exact match
    ];

    const report = LidarDeviationHeatmapEngine.analyzeDeviation(points, horizontalFloorPlane);

    expect(report.totalPointsEvaluated).toBe(3);
    expect(report.inToleranceCount).toBe(3);
    expect(report.outOfToleranceCount).toBe(0);
    expect(report.inTolerancePercentage).toBe(100);
    expect(report.points[0].classification).toBe("IN_TOLERANCE");
    expect(report.points[0].colorHex).toBe("#22C55E");
  });

  it("identifies positive protrusions, negative depressions, and critical defects", () => {
    const points: Point3D[] = [
      { x: 1.0, y: 1.0, z: 0.008 },   // +8mm: positive protrusion (> 5mm)
      { x: 2.0, y: 2.0, z: -0.009 },  // -9mm: negative depression (< -5mm)
      { x: 3.0, y: 3.0, z: 0.020 }    // +20mm: critical defect (> 2.5x 5mm = 12.5mm)
    ];

    const report = LidarDeviationHeatmapEngine.analyzeDeviation(points, horizontalFloorPlane);

    expect(report.inToleranceCount).toBe(0);
    expect(report.outOfToleranceCount).toBe(3);
    expect(report.points[0].classification).toBe("POSITIVE_PROTRUSION");
    expect(report.points[1].classification).toBe("NEGATIVE_DEPRESSION");
    expect(report.points[2].classification).toBe("CRITICAL_DEFECT");
    expect(report.maxProtrusionMm).toBe(20);
    expect(report.maxDepressionMm).toBe(-9);
    expect(report.rmseMm).toBeGreaterThan(10);
  });

  it("aggregates spatial grid cells and flags rework required zones", () => {
    const points: Point3D[] = [
      // Cluster in cell (2, 2) with high elevation (+15mm)
      { x: 2.1, y: 2.1, z: 0.015 },
      { x: 2.2, y: 2.2, z: 0.016 },
      // Cluster in cell (5, 5) with compliant elevation (+1mm)
      { x: 5.1, y: 5.1, z: 0.001 },
      { x: 5.2, y: 5.2, z: 0.002 }
    ];

    const report = LidarDeviationHeatmapEngine.analyzeDeviation(points, horizontalFloorPlane, 1.0);

    expect(report.gridCells.length).toBe(2);
    const reworkCell = report.gridCells.find(c => c.cellX === 2 && c.cellY === 2);
    const compliantCell = report.gridCells.find(c => c.cellX === 5 && c.cellY === 5);

    expect(reworkCell?.isReworkRequired).toBe(true);
    expect(compliantCell?.isReworkRequired).toBe(false);
    expect(report.reworkRequiredZonesCount).toBe(1);
  });
});
