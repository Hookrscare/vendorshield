/**
 * Unit Test Suite for SNAP-55: Retaining Wall Deep Inclinometer Shear Plane Displacement Velocity Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  RetainingWallInclinometerShearProfiler,
  type InclinometerSurveyRequest
} from "./retaining-wall-inclinometer-shear-profiler";

describe("SNAP-55: Inclinometer Shear Plane Profiler", () => {
  it("evaluates a stable retaining wall with elastic displacement under 1.5mm/month", () => {
    const request: InclinometerSurveyRequest = {
      inclinometerId: "INC-DIAPHRAGM-01",
      wallHeightMeters: 12.0,
      daysBetweenSurveys: 30,
      baselineReadings: [
        { depthMeters: 12.0, lateralDeviationMm: 0.0 },
        { depthMeters: 6.0, lateralDeviationMm: 0.1 },
        { depthMeters: 0.0, lateralDeviationMm: 0.2 }
      ],
      currentReadings: [
        { depthMeters: 12.0, lateralDeviationMm: 0.0 },
        { depthMeters: 6.0, lateralDeviationMm: 0.3 },
        { depthMeters: 0.0, lateralDeviationMm: 0.8 }
      ]
    };

    const res = RetainingWallInclinometerShearProfiler.analyzeSurvey(request);

    expect(res.inclinometerId).toBe("INC-DIAPHRAGM-01");
    expect(res.stabilityVerdict).toBe("STABLE_ELASTIC");
    expect(res.maxDisplacementRateMmPerMonth).toBeLessThan(1.5);
    expect(res.geotechnicalRiskHash).toHaveLength(64);
  });

  it("detects active shear failure plane with rapid displacement exceeding 5.0mm/month", () => {
    const request: InclinometerSurveyRequest = {
      inclinometerId: "INC-SOLDIER-PILE-09",
      wallHeightMeters: 15.0,
      daysBetweenSurveys: 14,
      baselineReadings: [
        { depthMeters: 15.0, lateralDeviationMm: 0.0 },
        { depthMeters: 8.0, lateralDeviationMm: 0.2 },
        { depthMeters: 0.0, lateralDeviationMm: 0.5 }
      ],
      currentReadings: [
        { depthMeters: 15.0, lateralDeviationMm: 0.0 },
        { depthMeters: 8.0, lateralDeviationMm: 6.5 }, // Large localized slip at 8m
        { depthMeters: 0.0, lateralDeviationMm: 12.0 }
      ]
    };

    const res = RetainingWallInclinometerShearProfiler.analyzeSurvey(request);

    expect(res.stabilityVerdict).toBe("ACTIVE_SHEAR_FAILURE_PLANE");
    expect(res.criticalShearPlaneDepthMeters).toBe(8.0);
    expect(res.maxDisplacementRateMmPerMonth).toBeGreaterThan(5.0);
  });

  it("rejects invalid survey requests with insufficient readings", () => {
    expect(() => {
      RetainingWallInclinometerShearProfiler.analyzeSurvey({
        inclinometerId: "FAIL",
        wallHeightMeters: 10.0,
        daysBetweenSurveys: 30,
        baselineReadings: [],
        currentReadings: [{ depthMeters: 0.0, lateralDeviationMm: 1.0 }]
      });
    }).toThrow("requires at least 3 depth interval readings.");
  });
});
