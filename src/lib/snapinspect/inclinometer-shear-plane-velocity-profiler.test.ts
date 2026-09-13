/**
 * Unit Test Suite for SNAP-55: Retaining Wall Deep Inclinometer Shear Plane Displacement Velocity Profiler
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  InclinometerShearPlaneVelocityProfiler,
  BoreholeShearPlaneSpec,
  InclinometerEpochSurvey
} from "./inclinometer-shear-plane-velocity-profiler";

describe("SNAP-55: Retaining Wall Deep Inclinometer Shear Plane Displacement Velocity Profiler", () => {
  const spec: BoreholeShearPlaneSpec = {
    boreholeId: "BH-INCL-04",
    wallId: "RW-NORTH-SEGMENT-B",
    wallHeightMeters: 8.5,
    criticalVelocityMmPerDay: 1.5,
    criticalShearGradientMmPerM: 0.6
  };

  const epoch0: InclinometerEpochSurvey = {
    epochId: "EP-0",
    surveyTimestampIso: "2026-09-01T00:00:00Z",
    readings: [
      { depthMeters: 1.0, cumulativeDisplacementMm: 0.0 },
      { depthMeters: 2.0, cumulativeDisplacementMm: 0.0 },
      { depthMeters: 3.0, cumulativeDisplacementMm: 0.0 },
      { depthMeters: 4.0, cumulativeDisplacementMm: 0.0 },
      { depthMeters: 5.0, cumulativeDisplacementMm: 0.0 },
      { depthMeters: 6.0, cumulativeDisplacementMm: 0.0 }
    ]
  };

  it("identifies stable conditions when movement velocity is negligible", () => {
    const epoch1: InclinometerEpochSurvey = {
      epochId: "EP-1",
      surveyTimestampIso: "2026-09-10T00:00:00Z", // 9 days
      readings: [
        { depthMeters: 1.0, cumulativeDisplacementMm: 0.5 },
        { depthMeters: 2.0, cumulativeDisplacementMm: 0.4 },
        { depthMeters: 3.0, cumulativeDisplacementMm: 0.3 },
        { depthMeters: 4.0, cumulativeDisplacementMm: 0.2 },
        { depthMeters: 5.0, cumulativeDisplacementMm: 0.1 },
        { depthMeters: 6.0, cumulativeDisplacementMm: 0.0 }
      ]
    };

    const report = InclinometerShearPlaneVelocityProfiler.analyzeVelocityProfile(spec, epoch0, epoch1);
    expect(report.hazardLevel).toBe("STABLE_SUB_THRESHOLD");
    expect(report.maxDisplacementVelocityMmPerDay).toBeLessThan(0.1);
    expect(report.shearPlanesDetected.length).toBe(0);
    expect(report.auditDigest).toBeDefined();
  });

  it("detects localized shear plane rupture when velocity gradient concentrates at specific depth", () => {
    const epoch1: InclinometerEpochSurvey = {
      epochId: "EP-1",
      surveyTimestampIso: "2026-09-06T00:00:00Z", // 5 days
      readings: [
        { depthMeters: 1.0, cumulativeDisplacementMm: 8.5 },
        { depthMeters: 2.0, cumulativeDisplacementMm: 8.0 },
        { depthMeters: 3.0, cumulativeDisplacementMm: 7.8 },
        { depthMeters: 4.0, cumulativeDisplacementMm: 1.0 }, // Huge jump between 3m and 4m
        { depthMeters: 5.0, cumulativeDisplacementMm: 0.2 },
        { depthMeters: 6.0, cumulativeDisplacementMm: 0.0 }
      ]
    };

    const report = InclinometerShearPlaneVelocityProfiler.analyzeVelocityProfile(spec, epoch0, epoch1);
    expect(report.hazardLevel).toBe("LOCALIZED_SHEAR_RUPTURE_WARNING");
    expect(report.shearPlanesDetected.length).toBeGreaterThan(0);
    const plane = report.shearPlanesDetected[0];
    expect(plane.depthStartM).toBe(3.0);
    expect(plane.depthEndM).toBe(4.0);
    expect(plane.peakShearStrainGradient).toBeGreaterThan(spec.criticalShearGradientMmPerM);
  });

  it("projects time-to-rupture and triggers critical hazard alert under accelerating creep", () => {
    const epochMinus1: InclinometerEpochSurvey = {
      epochId: "EP-MINUS1",
      surveyTimestampIso: "2026-08-25T00:00:00Z",
      readings: [
        { depthMeters: 1.0, cumulativeDisplacementMm: -0.5 },
        { depthMeters: 2.0, cumulativeDisplacementMm: -0.5 },
        { depthMeters: 3.0, cumulativeDisplacementMm: -0.5 },
        { depthMeters: 4.0, cumulativeDisplacementMm: -0.1 },
        { depthMeters: 5.0, cumulativeDisplacementMm: 0.0 },
        { depthMeters: 6.0, cumulativeDisplacementMm: 0.0 }
      ]
    };

    // Rapid acceleration between Sept 1 and Sept 5 (4 days, 20mm displacement)
    const epoch1: InclinometerEpochSurvey = {
      epochId: "EP-1",
      surveyTimestampIso: "2026-09-05T00:00:00Z",
      readings: [
        { depthMeters: 1.0, cumulativeDisplacementMm: 20.0 },
        { depthMeters: 2.0, cumulativeDisplacementMm: 19.5 },
        { depthMeters: 3.0, cumulativeDisplacementMm: 18.0 },
        { depthMeters: 4.0, cumulativeDisplacementMm: 2.0 },
        { depthMeters: 5.0, cumulativeDisplacementMm: 0.5 },
        { depthMeters: 6.0, cumulativeDisplacementMm: 0.0 }
      ]
    };

    const report = InclinometerShearPlaneVelocityProfiler.analyzeVelocityProfile(spec, epoch0, epoch1, epochMinus1);
    expect(report.hazardLevel).toBe("IMMINENT_SLOPE_COLLAPSE_CRITICAL");
    expect(report.maxDisplacementVelocityMmPerDay).toBeGreaterThan(spec.criticalVelocityMmPerDay * 2.0);
    expect(report.accelerationMmPerDaySq).toBeGreaterThan(0);
    expect(report.projectedTimeToRuptureDays).toBeDefined();
    expect(report.engineeringRecommendations).toContain("URGENT: Evacuate perimeter zone below retaining wall structure.");
  });

  it("throws descriptive error when timestamps are chronological inversion", () => {
    const invalidEpoch: InclinometerEpochSurvey = {
      epochId: "EP-INVALID",
      surveyTimestampIso: "2026-08-01T00:00:00Z",
      readings: []
    };

    expect(() => {
      InclinometerShearPlaneVelocityProfiler.analyzeVelocityProfile(spec, epoch0, invalidEpoch);
    }).toThrow("Current epoch survey timestamp must be strictly after baseline epoch.");
  });
});
