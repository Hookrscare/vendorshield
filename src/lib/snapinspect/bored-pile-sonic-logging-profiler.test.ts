/**
 * Unit Test Suite for SNAP-53: Deep Foundation Bored Pile Sonic Logging Integrity Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  BoredPileSonicLoggingProfiler,
  TubePairProfile
} from "./bored-pile-sonic-logging-profiler";

describe("SNAP-53: Deep Foundation Bored Pile Sonic Logging Integrity Profiler", () => {
  it("evaluates a pristine concrete shaft with satisfactory rating and ASTM D6760 compliance", () => {
    // 0.3m spacing, 4000 m/s nominal -> FAT = 0.3 / 4000 = 75 microseconds
    const profile1: TubePairProfile = {
      tubePairId: "T1-T2",
      transmitterTubeId: "T1",
      receiverTubeId: "T2",
      tubeSpacingMeters: 0.3,
      readings: [
        { depthMeters: 1.0, firstArrivalTimeMicroseconds: 75.0, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 500, baselineAmplitudeMv: 500 },
        { depthMeters: 2.0, firstArrivalTimeMicroseconds: 75.2, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 495, baselineAmplitudeMv: 500 },
        { depthMeters: 3.0, firstArrivalTimeMicroseconds: 74.8, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 510, baselineAmplitudeMv: 500 }
      ]
    };

    const res = BoredPileSonicLoggingProfiler.profileShaft("PILE-SHAFT-101", 15.0, 4000, [profile1]);
    expect(res.overallRating).toBe("SATISFACTORY");
    expect(res.integrityScore).toBe(100);
    expect(res.totalDefectIntervals).toHaveLength(0);
    expect(res.conformsToAstmD6760).toBe(true);
    expect(res.sha256AuditStamp).toHaveLength(64);
  });

  it("detects velocity reduction and amplitude loss anomaly at necking or void zone", () => {
    // Reading at depth 5.0m has FAT delay to 105 microseconds (28.5% drop in velocity)
    const profile1: TubePairProfile = {
      tubePairId: "T1-T2",
      transmitterTubeId: "T1",
      receiverTubeId: "T2",
      tubeSpacingMeters: 0.3,
      readings: [
        { depthMeters: 4.0, firstArrivalTimeMicroseconds: 75.0, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 500, baselineAmplitudeMv: 500 },
        { depthMeters: 5.0, firstArrivalTimeMicroseconds: 105.0, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 80, baselineAmplitudeMv: 500 }, // Defect
        { depthMeters: 6.0, firstArrivalTimeMicroseconds: 75.0, baselineFatMicroseconds: 75.0, receivedSignalAmplitudeMv: 500, baselineAmplitudeMv: 500 }
      ]
    };

    const res = BoredPileSonicLoggingProfiler.profileShaft("PILE-SHAFT-202", 20.0, 4000, [profile1]);
    expect(res.overallRating).toBe("DEFECT");
    expect(res.conformsToAstmD6760).toBe(false);
    expect(res.totalDefectIntervals.length).toBeGreaterThan(0);
    expect(res.totalDefectIntervals[0].startDepthMeters).toBe(5.0);
    expect(res.totalDefectIntervals[0].rating).toBe("DEFECT");
    expect(res.totalDefectIntervals[0].affectedTubePairs).toContain("T1-T2");
  });
});
