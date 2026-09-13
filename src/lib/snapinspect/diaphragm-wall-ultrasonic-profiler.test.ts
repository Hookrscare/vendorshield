/**
 * Unit Test Suite for SNAP-60: Deep Foundation Diaphragm Wall Slurry Trench Ultrasonic Hydrophone Verticality Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  DiaphragmWallUltrasonicProfiler,
  type DiaphragmWallSurveyRequest
} from "./diaphragm-wall-ultrasonic-profiler";

describe("SNAP-60: Diaphragm Wall Ultrasonic Profiler", () => {
  it("verifies compliant verticality for plumb trench (< 0.50% deviation)", () => {
    // Perfectly centered 1.0m wide trench (roundtrip echo time for 0.5m radius = (0.5 * 2) / 1450 = 689.65 microsec)
    const request: DiaphragmWallSurveyRequest = {
      panelId: "PANEL-METRO-STATION-P12",
      nominalThicknessMeters: 1.0,
      soundings: [
        { depthMeters: 10.0, echoTimeMicrosecXPos: 690, echoTimeMicrosecXNeg: 690, echoTimeMicrosecYPos: 1380, echoTimeMicrosecYNeg: 1380 },
        { depthMeters: 25.0, echoTimeMicrosecXPos: 695, echoTimeMicrosecXNeg: 685, echoTimeMicrosecYPos: 1382, echoTimeMicrosecYNeg: 1378 },
        { depthMeters: 50.0, echoTimeMicrosecXPos: 700, echoTimeMicrosecXNeg: 680, echoTimeMicrosecYPos: 1385, echoTimeMicrosecYNeg: 1375 }
      ]
    };

    const res = DiaphragmWallUltrasonicProfiler.analyzeTrench(request);

    expect(res.isWithinTolerance).toBe(true);
    expect(res.verdict).toBe("COMPLIANT_PLUMB_EXCAVATION");
    expect(res.totalDepthMeters).toBe(50.0);
    expect(res.maxVerticalityDeviationPercent).toBeLessThan(0.30);
    expect(res.surveyDigest).toHaveLength(64);
  });

  it("flags trench requiring repair when verticality exceeds tolerance", () => {
    const request: DiaphragmWallSurveyRequest = {
      panelId: "PANEL-SLANTED-P09",
      nominalThicknessMeters: 1.0,
      verticalityTolerancePercent: 0.50,
      soundings: [
        { depthMeters: 10.0, echoTimeMicrosecXPos: 690, echoTimeMicrosecXNeg: 690, echoTimeMicrosecYPos: 1380, echoTimeMicrosecYNeg: 1380 },
        { depthMeters: 20.0, echoTimeMicrosecXPos: 900, echoTimeMicrosecXNeg: 480, echoTimeMicrosecYPos: 1380, echoTimeMicrosecYNeg: 1380 }, // Large drift
        { depthMeters: 30.0, echoTimeMicrosecXPos: 1100, echoTimeMicrosecXNeg: 280, echoTimeMicrosecYPos: 1380, echoTimeMicrosecYNeg: 1380 } // Drifting heavily
      ]
    };

    const res = DiaphragmWallUltrasonicProfiler.analyzeTrench(request);

    expect(res.isWithinTolerance).toBe(false);
    expect(res.verdict).toBe("VERTICALITY_EXCEEDED_REPAIR_REQUIRED");
    expect(res.maxVerticalityDeviationPercent).toBeGreaterThan(0.50);
  });

  it("rejects insufficient soundings", () => {
    expect(() => {
      DiaphragmWallUltrasonicProfiler.analyzeTrench({
        panelId: "FAIL",
        nominalThicknessMeters: 1.0,
        soundings: [{ depthMeters: 5, echoTimeMicrosecXPos: 690, echoTimeMicrosecXNeg: 690, echoTimeMicrosecYPos: 690, echoTimeMicrosecYNeg: 690 }]
      });
    }).toThrow("requires at least 3 depth sounding levels");
  });
});
