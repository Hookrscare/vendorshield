import { describe, it, expect } from "vitest";
import {
  GprBallastVoidSettlementDetector,
  GprScanTrace
} from "./gpr-ballast-void-settlement-detector";

describe("GprBallastVoidSettlementDetector (SNAP-80)", () => {
  it("detects healthy compacted ballast bed with perfect score", () => {
    const traces: GprScanTrace[] = [
      {
        chainageMeters: 100.5,
        twoWayTravelTimeNs: 6.5,
        peakReflectedAmplitudeMv: 120,
        phaseInversion: false,
        ballastRelativePermittivity: 3.5
      },
      {
        chainageMeters: 101.0,
        twoWayTravelTimeNs: 6.4,
        peakReflectedAmplitudeMv: 110,
        phaseInversion: false,
        ballastRelativePermittivity: 3.6
      }
    ];

    const report = GprBallastVoidSettlementDetector.analyzeTrackBed(traces);

    expect(report.totalScansEvaluated).toBe(2);
    expect(report.voidCount).toBe(0);
    expect(report.fouledBedCount).toBe(0);
    expect(report.trackQualityScore).toBe(100);
    expect(report.anomalies.length).toBe(0);
    expect(report.inspectionHash).toBeDefined();
  });

  it("identifies critical sub-surface void with phase inversion and triggers undercutting action", () => {
    const traces: GprScanTrace[] = [
      {
        chainageMeters: 105.2,
        twoWayTravelTimeNs: 4.0, // shallow depth < 400 mm
        peakReflectedAmplitudeMv: 750, // high reflection
        phaseInversion: true,
        ballastRelativePermittivity: 3.8
      }
    ];

    const report = GprBallastVoidSettlementDetector.analyzeTrackBed(traces);

    expect(report.voidCount).toBe(1);
    expect(report.anomalies[0].anomalyType).toBe("SUB_SURFACE_VOID");
    expect(report.anomalies[0].severity).toBe("CRITICAL");
    expect(report.anomalies[0].recommendedAction).toBe("FULL_BALLAST_UNDERCUTTING_AND_RENEWAL");
    expect(report.trackQualityScore).toBe(85);
  });

  it("detects water fouling and slurry intrusion from high permittivity", () => {
    const traces: GprScanTrace[] = [
      {
        chainageMeters: 120.0,
        twoWayTravelTimeNs: 8.0,
        peakReflectedAmplitudeMv: 200,
        phaseInversion: false,
        ballastRelativePermittivity: 18.0 // saturated mud / slurry
      }
    ];

    const report = GprBallastVoidSettlementDetector.analyzeTrackBed(traces);

    expect(report.fouledBedCount).toBe(1);
    expect(report.anomalies[0].anomalyType).toBe("BALLAST_FOULING_WET_SLURRY");
    expect(report.anomalies[0].severity).toBe("CRITICAL");
  });

  it("throws on invalid travel time", () => {
    expect(() =>
      GprBallastVoidSettlementDetector.analyzeTrackBed([
        {
          chainageMeters: 100,
          twoWayTravelTimeNs: -2,
          peakReflectedAmplitudeMv: 100,
          phaseInversion: false,
          ballastRelativePermittivity: 3.5
        }
      ])
    ).toThrow("twoWayTravelTimeNs must be positive.");
  });
});
