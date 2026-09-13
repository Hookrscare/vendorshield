/**
 * Unit Test Suite for SNAP-54: Tunnel & Underground Excavation Convergence Laser Profiler & Shotcrete Thickness Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  TunnelConvergenceShotcreteProfiler,
  type ShotcreteScanAnalysisRequest
} from "./tunnel-convergence-shotcrete-profiler";

describe("SNAP-54: Tunnel Convergence & Shotcrete Profiler", () => {
  it("evaluates a stable tunnel section meeting minimum 200mm shotcrete thickness specifications", () => {
    // Design outer excavation radius = 5.0m, Inner finished profile radius = 4.75m -> 250mm thickness
    const radialProfile = [
      { angleDegrees: 0, measuredRadiusMeters: 4.75 },
      { angleDegrees: 90, measuredRadiusMeters: 4.74 },
      { angleDegrees: 180, measuredRadiusMeters: 4.75 },
      { angleDegrees: 270, measuredRadiusMeters: 4.76 }
    ];

    const request: ShotcreteScanAnalysisRequest = {
      tunnelChainageStation: "STA 14+200",
      designRadiusMeters: 5.00,
      minSpecifiedThicknessMm: 200,
      radialProfile,
      convergenceTargets: [
        {
          targetId: "PAIR-CROWN-INVERT",
          baselineDistanceMeters: 9.50,
          currentDistanceMeters: 9.495, // 5mm displacement over 10 days = 0.5 mm/day
          daysElapsed: 10
        }
      ]
    };

    const res = TunnelConvergenceShotcreteProfiler.analyzeCrossSection(request);

    expect(res.chainageStation).toBe("STA 14+200");
    expect(res.structuralIntegrityVerdict).toBe("STABLE_WITHIN_TOLERANCE");
    expect(res.meanEstimatedThicknessMm).toBeGreaterThanOrEqual(240);
    expect(res.defects).toHaveLength(0);
    expect(res.maxConvergenceRateMmPerDay).toBe(0.5);
    expect(res.tamperProofHash).toHaveLength(64);
  });

  it("detects severe underbreak intrusion where shotcrete thickness fails specifications", () => {
    // Crown at 90 deg has intrusion reaching 4.95m (only 50mm thickness vs 200mm required)
    const radialProfile = [
      { angleDegrees: 0, measuredRadiusMeters: 4.75 },
      { angleDegrees: 90, measuredRadiusMeters: 4.95 },
      { angleDegrees: 180, measuredRadiusMeters: 4.75 },
      { angleDegrees: 270, measuredRadiusMeters: 4.75 }
    ];

    const request: ShotcreteScanAnalysisRequest = {
      tunnelChainageStation: "STA 18+050",
      designRadiusMeters: 5.00,
      minSpecifiedThicknessMm: 200,
      radialProfile
    };

    const res = TunnelConvergenceShotcreteProfiler.analyzeCrossSection(request);

    expect(res.structuralIntegrityVerdict).toBe("UNSAFE_UNDERBREAK_DEFECT");
    expect(res.defects.length).toBeGreaterThan(0);
    expect(res.defects[0].severity).toBe("CRITICAL");
  });

  it("throws error when fewer than 4 radial points are provided", () => {
    expect(() => {
      TunnelConvergenceShotcreteProfiler.analyzeCrossSection({
        tunnelChainageStation: "STA 0+000",
        designRadiusMeters: 5.0,
        minSpecifiedThicknessMm: 150,
        radialProfile: [{ angleDegrees: 0, measuredRadiusMeters: 4.8 }]
      });
    }).toThrow("Tunnel scan requires at least 4 radial profile measurement points.");
  });
});
