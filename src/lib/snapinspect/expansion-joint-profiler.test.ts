/**
 * Unit tests for SNAP-37: Multi-Story Building Expansion Joint Dynamic Seismic Displacement Profiler.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExpansionJointDisplacementProfiler, JointProfileInput } from "./expansion-joint-profiler";

describe("SNAP-37: ExpansionJointDisplacementProfiler", () => {
  let profiler: ExpansionJointDisplacementProfiler;

  beforeEach(() => {
    profiler = new ExpansionJointDisplacementProfiler();
  });

  it("evaluates a healthy expansion joint conforming to ASTM E1399", () => {
    const input: JointProfileInput = {
      jointId: "EJ-BAY-NORTH-04",
      nominalDesignWidthMm: 50.0,
      allowableSeismicDriftMm: 25.0,
      ambientTempC: 22.0,
      designReferenceTempC: 20.0,
      thermalExpansionCoefficient: 12e-6,
      tributaryLengthMeters: 60.0,
      measurements: [
        { stationMeter: 0.0, measuredWidthMm: 48.5, verticalShearMm: 1.2, lateralShearMm: 0.5 },
        { stationMeter: 10.0, measuredWidthMm: 49.0, verticalShearMm: 0.8, lateralShearMm: 0.2 },
        { stationMeter: 20.0, measuredWidthMm: 48.0, verticalShearMm: 1.5, lateralShearMm: 0.4 },
      ],
    };

    const res = profiler.analyzeJoint(input);
    expect(res.overallStatus).toBe("NORMAL_ARTICULATION");
    expect(res.structuralIntegrityScore).toBeGreaterThan(90);
    expect(res.anomalousStations).toHaveLength(0);
    expect(res.astmE1399Compliant).toBe(true);
    expect(res.auditDigestSha256).toHaveLength(64);
  });

  it("detects joint pinch lockup and pounding hazards", () => {
    const input: JointProfileInput = {
      jointId: "EJ-PARKING-RAMP-01",
      nominalDesignWidthMm: 50.0,
      allowableSeismicDriftMm: 25.0,
      ambientTempC: 38.0,
      designReferenceTempC: 20.0,
      thermalExpansionCoefficient: 12e-6,
      tributaryLengthMeters: 80.0,
      measurements: [
        { stationMeter: 0.0, measuredWidthMm: 40.0, verticalShearMm: 2.0, lateralShearMm: 1.0 },
        { stationMeter: 15.0, measuredWidthMm: 10.0, verticalShearMm: 3.5, lateralShearMm: 2.0 }, // <= 12.5mm -> Pounding hazard
      ],
    };

    const res = profiler.analyzeJoint(input);
    expect(res.overallStatus).toBe("CRITICAL_POUNDING_HAZARD");
    expect(res.anomalousStations.length).toBeGreaterThan(0);
    expect(res.astmE1399Compliant).toBe(false);
    expect(res.maxClosureRatioPct).toBe(80.0);
  });

  it("detects differential settlement shear across the joint boundary", () => {
    const input: JointProfileInput = {
      jointId: "EJ-FOOTING-TRANSITION",
      nominalDesignWidthMm: 50.0,
      allowableSeismicDriftMm: 25.0,
      ambientTempC: 15.0,
      designReferenceTempC: 20.0,
      thermalExpansionCoefficient: 12e-6,
      tributaryLengthMeters: 40.0,
      measurements: [
        { stationMeter: 0.0, measuredWidthMm: 52.0, verticalShearMm: 14.5, lateralShearMm: 2.0 }, // > 12mm shear
      ],
    };

    const res = profiler.analyzeJoint(input);
    expect(res.overallStatus).toBe("DIFFERENTIAL_SETTLEMENT_SHEAR");
    expect(res.maxVerticalShearMm).toBe(14.5);
    expect(res.astmE1399Compliant).toBe(false);
  });
});
