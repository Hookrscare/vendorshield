import { describe, it, expect } from "vitest";
import {
  SuperconductingMaglevGuidewayLevitationGapLaserProfiler,
  MaglevGuidewaySpec,
  LaserGapMeasurementPoint
} from "./superconducting-maglev-guideway-levitation-gap-laser-profiler";

describe("SNAP-73: SuperconductingMaglevGuidewayLevitationGapLaserProfiler Tests", () => {
  const edsSpec: MaglevGuidewaySpec = {
    guidewayType: "EDS_SUPERCONDUCTING",
    nominalLevitationGapMm: 100.0,
    allowableGapToleranceMm: 10.0,
    maxStatorStepMisalignmentMm: 1.5,
    speedKmh: 505.0
  };

  it("confirms safe high-speed operation on nominal superconducting guideway", () => {
    const measurements: LaserGapMeasurementPoint[] = [
      { chainageKm: 42.000, measuredLeftGapMm: 100.2, measuredRightGapMm: 99.8, statorStepJumpMm: 0.3 },
      { chainageKm: 42.050, measuredLeftGapMm: 101.0, measuredRightGapMm: 100.5, statorStepJumpMm: 0.4 },
      { chainageKm: 42.100, measuredLeftGapMm: 99.5, measuredRightGapMm: 100.1, statorStepJumpMm: 0.5 }
    ];

    const res = SuperconductingMaglevGuidewayLevitationGapLaserProfiler.profileGuideway(edsSpec, measurements);

    expect(res.isSafeForHighSpeedOperation).toBe(true);
    expect(res.alerts).toHaveLength(0);
    expect(res.meanLeftGapMm).toBeCloseTo(100.23, 1);
    expect(res.rmsRoughnessMm).toBeLessThan(1.0);
    expect(res.totalInspectedDistanceKm).toBeCloseTo(0.1, 2);
    expect(res.inspectionDigest).toHaveLength(64);
  });

  it("flags critical trip alert on severe levitation gap collapse", () => {
    const measurements: LaserGapMeasurementPoint[] = [
      { chainageKm: 50.000, measuredLeftGapMm: 100.0, measuredRightGapMm: 100.0, statorStepJumpMm: 0.2 },
      { chainageKm: 50.020, measuredLeftGapMm: 65.0, measuredRightGapMm: 98.0, statorStepJumpMm: 0.3 } // < 70 mm critical collapse
    ];

    const res = SuperconductingMaglevGuidewayLevitationGapLaserProfiler.profileGuideway(edsSpec, measurements);

    expect(res.isSafeForHighSpeedOperation).toBe(false);
    const critical = res.alerts.find((a) => a.severity === "CRITICAL_TRIP");
    expect(critical).toBeDefined();
    expect(critical?.anomalyType).toBe("LEVITATION_GAP_COLLAPSE");
  });

  it("identifies stator step jump misalignment between modular slabs", () => {
    const measurements: LaserGapMeasurementPoint[] = [
      { chainageKm: 60.100, measuredLeftGapMm: 100.0, measuredRightGapMm: 100.0, statorStepJumpMm: 2.8 } // > 1.5 mm
    ];

    const res = SuperconductingMaglevGuidewayLevitationGapLaserProfiler.profileGuideway(edsSpec, measurements);

    const stepAlert = res.alerts.find((a) => a.anomalyType === "STATOR_STEP_MISALIGNMENT");
    expect(stepAlert).toBeDefined();
    expect(stepAlert?.severity).toBe("CRITICAL_TRIP");
  });

  it("throws error on empty measurements", () => {
    expect(() =>
      SuperconductingMaglevGuidewayLevitationGapLaserProfiler.profileGuideway(edsSpec, [])
    ).toThrow("Guideway laser measurements cannot be empty.");
  });
});
