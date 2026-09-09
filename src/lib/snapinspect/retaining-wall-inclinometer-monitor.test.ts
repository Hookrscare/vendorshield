/**
 * SNAP-43: Retaining Wall Inclinometer Monitor Unit Tests.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  RetainingWallInclinometerMonitor,
  RetainingWallStructureSpec,
  InclinometerDepthReading,
} from "./retaining-wall-inclinometer-monitor";

describe("SNAP-43: RetainingWallInclinometerMonitor", () => {
  const wallSpec: RetainingWallStructureSpec = {
    wallId: "WALL-NORTH-EXCAVATION",
    wallHeightMeters: 12.0,
    wallType: "SOLDIER_PILE_LAGGING",
    retainedSoilType: "GRANULAR_SAND",
    designMaxDeflectionMm: 25.0, // 25mm allowable deflection
  };

  it("analyzes stable retaining wall within allowable deflection limits", () => {
    // 4 readings at depths 12m, 8m, 4m, 0m (top)
    const readings: InclinometerDepthReading[] = [
      { depthMeters: 12.0, readingA0Mm: 0.1, readingA180Mm: -0.1 },
      { depthMeters: 8.0, readingA0Mm: 1.0, readingA180Mm: -1.0 },
      { depthMeters: 4.0, readingA0Mm: 2.5, readingA180Mm: -2.5 },
      { depthMeters: 0.0, readingA0Mm: 4.0, readingA180Mm: -4.0 },
    ];

    const res = RetainingWallInclinometerMonitor.analyzeInclinometerProfile(wallSpec, readings);
    expect(res.stabilityTier).toBe("STABLE");
    expect(res.maxCumulativeDeflectionMm).toBeLessThan(10.0);
    expect(res.estimatedFactorOfSafety).toBeGreaterThan(1.4);
    expect(res.auditDigest).toHaveLength(64);
  });

  it("triggers critical slope failure alert when cumulative deflection breaches design limit", () => {
    const readings: InclinometerDepthReading[] = [
      { depthMeters: 12.0, readingA0Mm: 2.0, readingA180Mm: -2.0 },
      { depthMeters: 8.0, readingA0Mm: 10.0, readingA180Mm: -10.0 },
      { depthMeters: 4.0, readingA0Mm: 15.0, readingA180Mm: -15.0 }, // Cumulative > 27mm
      { depthMeters: 0.0, readingA0Mm: 5.0, readingA180Mm: -5.0 },
    ];

    const res = RetainingWallInclinometerMonitor.analyzeInclinometerProfile(wallSpec, readings);
    expect(res.stabilityTier).toBe("CRITICAL_SLOPE_FAILURE");
    expect(res.maxCumulativeDeflectionMm).toBeGreaterThanOrEqual(25.0);
    expect(res.actionItems.some((a) => a.includes("Evacuate excavation"))).toBe(true);
    expect(res.actionItems.some((a) => a.includes("tieback re-tensioning"))).toBe(true);
  });

  it("calculates probe sensor checksum error correctly", () => {
    const readings: InclinometerDepthReading[] = [
      { depthMeters: 5.0, readingA0Mm: 1.2, readingA180Mm: -1.0 }, // Checksum diff = 0.2
      { depthMeters: 0.0, readingA0Mm: 2.3, readingA180Mm: -2.1 }, // Checksum diff = 0.2
    ];

    const res = RetainingWallInclinometerMonitor.analyzeInclinometerProfile(wallSpec, readings);
    expect(res.probeChecksumErrorMm).toBe(0.2);
  });

  it("throws an error when readings array is empty", () => {
    expect(() =>
      RetainingWallInclinometerMonitor.analyzeInclinometerProfile(wallSpec, [])
    ).toThrow();
  });
});
