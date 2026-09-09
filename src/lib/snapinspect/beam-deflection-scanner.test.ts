/**
 * SNAP-23 Regression Test Suite: LiDAR Structural Load & Beam Deflection Scanner.
 */

import { describe, it, expect } from "vitest";
import {
  BeamDeflectionScanner,
  BeamDeflectionScanInput
} from "./beam-deflection-scanner";

describe("SNAP-23: LiDAR Structural Beam Deflection Scanner", () => {
  it("verifies PASS_WITHIN_CODE for stiff steel beam within L/360 criteria", () => {
    // 6-meter span (6000 mm). Allowable L/360 = 16.7 mm.
    // Measured mid-span sag = 8.0 mm.
    const input: BeamDeflectionScanInput = {
      beamId: "steel-beam-b1",
      material: "STRUCTURAL_STEEL_W_BEAM",
      spanLengthMm: 6000,
      standard: "FLOOR_LIVE_LOAD_L_360",
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 3000 },
        { positionMm: 1500, elevationMm: 2996 },
        { positionMm: 3000, elevationMm: 2992 }, // 8 mm sag at midspan
        { positionMm: 4500, elevationMm: 2996 },
        { positionMm: 6000, elevationMm: 3000 }
      ]
    };

    const res = BeamDeflectionScanner.analyzeBeamScan(input);
    expect(res.severity).toBe("PASS_WITHIN_CODE");
    expect(res.maxDeflectionMm).toBe(8.0);
    expect(res.allowableDeflectionMm).toBe(16.7);
    expect(res.utilizationRatio).toBeLessThan(0.85);
    expect(res.spanToDeflectionRatio).toBe(750); // L/750 > L/360
  });

  it("detects CODE_VIOLATION_EXCESSIVE_SAG and recommends shoring when sag exceeds L/240", () => {
    // 4.8-meter timber joist (4800 mm). Allowable L/240 = 20.0 mm.
    // Measured mid-span sag = 28.0 mm (UR = 1.40).
    const input: BeamDeflectionScanInput = {
      beamId: "wood-joist-j4",
      material: "DIMENSIONAL_LUMBER",
      spanLengthMm: 4800,
      standard: "TOTAL_LOAD_L_240",
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 2500 },
        { positionMm: 1200, elevationMm: 2486 },
        { positionMm: 2400, elevationMm: 2472 }, // 28 mm sag
        { positionMm: 3600, elevationMm: 2487 },
        { positionMm: 4800, elevationMm: 2500 }
      ]
    };

    const res = BeamDeflectionScanner.analyzeBeamScan(input);
    expect(res.severity).toBe("CODE_VIOLATION_EXCESSIVE_SAG");
    expect(res.maxDeflectionMm).toBe(28.0);
    expect(res.utilizationRatio).toBeGreaterThan(1.0);
    expect(res.recommendedAction).toContain("Exceeds IBC allowable deflection limit");
  });

  it("flags CRITICAL_OVERLOAD_FAILURE_RISK on severe deflection (UR > 1.5)", () => {
    // 5000 mm span. Allowable L/360 = 13.9 mm. Measured sag = 35.0 mm.
    const input: BeamDeflectionScanInput = {
      beamId: "damaged-glulam",
      material: "GLULAM_TIMBER",
      spanLengthMm: 5000,
      standard: "FLOOR_LIVE_LOAD_L_360",
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 2800 },
        { positionMm: 2500, elevationMm: 2765 }, // 35 mm sag
        { positionMm: 5000, elevationMm: 2800 }
      ]
    };

    const res = BeamDeflectionScanner.analyzeBeamScan(input);
    expect(res.severity).toBe("CRITICAL_OVERLOAD_FAILURE_RISK");
    expect(res.recommendedAction).toContain("Immediate emergency shoring required");
  });
});
