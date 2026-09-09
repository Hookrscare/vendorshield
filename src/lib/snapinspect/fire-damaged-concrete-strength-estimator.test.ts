import { describe, it, expect } from "vitest";
import {
  FireDamagedConcreteStrengthEstimator,
  ConcreteInspectionPoint
} from "./fire-damaged-concrete-strength-estimator";

describe("SNAP-41: FireDamagedConcreteStrengthEstimator", () => {
  it("computes ultrasonic pulse velocity accurately", () => {
    // 0.3 meters / 75 microseconds = 4.0 km/s
    const v = FireDamagedConcreteStrengthEstimator.computePulseVelocity(0.3, 75);
    expect(v).toBeCloseTo(4.0, 2);
  });

  it("calculates combined SonReb compressive strength", () => {
    const fc = FireDamagedConcreteStrengthEstimator.calculateSonRebStrength(4.0, 35);
    // 1.2 * 4.0^1.4 * 35^1.05 ~= 1.2 * 6.964 * 41.92 ~= 35.0 MPa
    expect(fc).toBeGreaterThan(25.0);
    expect(fc).toBeLessThan(45.0);
  });

  it("classifies sound, undamaged concrete as SOUND", () => {
    const points: ConcreteInspectionPoint[] = [
      {
        pointId: "Column-C1-North",
        transducerDistanceMeters: 0.4,
        transitTimeMicroseconds: 90, // ~4.44 km/s
        reboundNumber: 42,
        visibleSpallingSeverity: "NONE"
      },
      {
        pointId: "Column-C1-South",
        transducerDistanceMeters: 0.4,
        transitTimeMicroseconds: 95, // ~4.21 km/s
        reboundNumber: 40,
        visibleSpallingSeverity: "NONE"
      }
    ];

    const assessment = FireDamagedConcreteStrengthEstimator.assessStructuralDamage(points);
    expect(assessment.overallStructuralIntegrity).toBe("SOUND");
    expect(assessment.severelyDamagedLocations).toHaveLength(0);
    expect(assessment.averagePulseVelocityKmPerSec).toBeGreaterThan(4.0);
  });

  it("identifies calcined concrete with low velocity as CRITICAL_COLLAPSE_RISK", () => {
    const points: ConcreteInspectionPoint[] = [
      {
        pointId: "Beam-B4-Midspan",
        transducerDistanceMeters: 0.3,
        transitTimeMicroseconds: 150, // 2.0 km/s (severe thermal cracking)
        reboundNumber: 15,
        visibleSpallingSeverity: "EXPOSED_REBAR"
      },
      {
        pointId: "Beam-B4-End",
        transducerDistanceMeters: 0.3,
        transitTimeMicroseconds: 140, // 2.14 km/s
        reboundNumber: 18,
        visibleSpallingSeverity: "MODERATE_SPALLING"
      }
    ];

    const assessment = FireDamagedConcreteStrengthEstimator.assessStructuralDamage(points);
    expect(assessment.overallStructuralIntegrity).toBe("CRITICAL_COLLAPSE_RISK");
    expect(assessment.severelyDamagedLocations).toContain("Beam-B4-Midspan");
    expect(assessment.recommendedActions[0]).toContain("IMMEDIATE SHORING REQUIRED");
  });
});
