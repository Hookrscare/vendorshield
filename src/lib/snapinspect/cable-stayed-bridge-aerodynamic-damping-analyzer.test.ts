/**
 * src/lib/snapinspect/cable-stayed-bridge-aerodynamic-damping-analyzer.test.ts
 * Unit tests for SNAP-66 cable-stayed bridge aerodynamic damping analyzer.
 */

import { describe, it, expect } from "vitest";
import {
  CableStayedBridgeAerodynamicDampingAnalyzer,
  StayCableParameters,
  WindExcitationConditions,
} from "./cable-stayed-bridge-aerodynamic-damping-analyzer";

describe("SNAP-66: CableStayedBridgeAerodynamicDampingAnalyzer", () => {
  it("calculates fundamental transverse natural frequencies accurately", () => {
    const analyzer = new CableStayedBridgeAerodynamicDampingAnalyzer();
    // 200m cable, T = 4,000,000 N, m = 64 kg/m -> wave speed = sqrt(4e6 / 64) = 250 m/s
    // f1 = 250 / (2 * 200) = 0.625 Hz
    const cable: StayCableParameters = {
      cableId: "STAY-MAIN-04E",
      spanLengthMeters: 200.0,
      tensionNewtons: 4_000_000.0,
      massPerUnitLengthKgM: 64.0,
      outerDiameterMeters: 0.18,
      structuralDampingRatio: 0.004,
      hasSurfaceHelicalRib: true,
    };
    const wind: WindExcitationConditions = {
      windVelocityMps: 12.0,
      windIncidenceAngleDeg: 15.0,
      airDensityKgM3: 1.225,
      isPrecipitating: false,
    };

    const res = analyzer.analyzeCableStay(cable, wind);

    expect(res.mode1NaturalFrequencyHz).toBeCloseTo(0.625, 3);
    expect(res.mode2NaturalFrequencyHz).toBeCloseTo(1.250, 3);
    expect(res.mode3NaturalFrequencyHz).toBeCloseTo(1.875, 3);
    expect(res.isVivSuppressed).toBe(true);
    expect(res.isRwivRiskHigh).toBe(false);
    expect(res.auditHash).toHaveLength(64);
  });

  it("detects rain-wind-induced vibration risk when smooth cable encounters precipitation", () => {
    const analyzer = new CableStayedBridgeAerodynamicDampingAnalyzer();
    // Low damping cable without surface ribs in rain
    const cable: StayCableParameters = {
      cableId: "STAY-UNPROTECTED-01W",
      spanLengthMeters: 180.0,
      tensionNewtons: 3_000_000.0,
      massPerUnitLengthKgM: 50.0,
      outerDiameterMeters: 0.22,
      structuralDampingRatio: 0.002,
      hasSurfaceHelicalRib: false, // Smooth surface enables water rivulets
    };
    const wind: WindExcitationConditions = {
      windVelocityMps: 11.5,
      windIncidenceAngleDeg: 35.0,
      airDensityKgM3: 1.225,
      isPrecipitating: true,
    };

    const res = analyzer.analyzeCableStay(cable, wind);

    expect(res.isRwivRiskHigh).toBe(true);
    expect(res.isGallopingUnstable).toBe(true);
    expect(res.requiredAuxiliaryDamperRatio).toBeGreaterThan(0.005);
  });
});
