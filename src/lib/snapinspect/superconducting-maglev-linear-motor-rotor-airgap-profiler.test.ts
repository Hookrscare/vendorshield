import { describe, it, expect } from "vitest";
import {
  SuperconductingMaglevLinearMotorRotorAirgapProfiler,
  LinearMotorSpec,
  BogieAirgapTelemetryPoint
} from "./superconducting-maglev-linear-motor-rotor-airgap-profiler";

describe("SuperconductingMaglevLinearMotorRotorAirgapProfiler", () => {
  const limSpec: LinearMotorSpec = {
    motorType: "LINEAR_INDUCTION_MOTOR_LIM",
    nominalAirgapMm: 15.0,
    minSafetyAirgapMm: 8.0,
    maxThrustAirgapMm: 28.0,
    vehicleSpeedKmh: 450.0
  };

  it("profiles nominal dynamic airgap telemetry with zero emergency trips", () => {
    const telemetry: BogieAirgapTelemetryPoint[] = [
      { timestampMs: 100, chainageKm: 12.0, forwardBogieAirgapMm: 15.2, midBogieAirgapMm: 15.0, aftBogieAirgapMm: 14.8, rollAngleDeg: 0.1 },
      { timestampMs: 200, chainageKm: 12.05, forwardBogieAirgapMm: 15.5, midBogieAirgapMm: 15.1, aftBogieAirgapMm: 14.9, rollAngleDeg: 0.2 },
      { timestampMs: 300, chainageKm: 12.10, forwardBogieAirgapMm: 14.9, midBogieAirgapMm: 15.0, aftBogieAirgapMm: 15.2, rollAngleDeg: -0.1 }
    ];

    const result = SuperconductingMaglevLinearMotorRotorAirgapProfiler.profileAirgapTelemetry(
      limSpec,
      telemetry
    );

    expect(result.totalTelemetrySamples).toBe(3);
    expect(result.isAirgapIntegrityCompliant).toBe(true);
    expect(result.minObservedAirgapMm).toBeGreaterThanOrEqual(8.0);
    expect(result.alerts).toHaveLength(0);
    expect(result.telemetryDigest).toHaveLength(64);
  });

  it("triggers emergency interlock trip when rotor airgap collapses below safety floor", () => {
    const telemetry: BogieAirgapTelemetryPoint[] = [
      { timestampMs: 100, chainageKm: 15.0, forwardBogieAirgapMm: 14.0, midBogieAirgapMm: 13.5, aftBogieAirgapMm: 13.0, rollAngleDeg: 0.5 },
      { timestampMs: 200, chainageKm: 15.05, forwardBogieAirgapMm: 7.2, midBogieAirgapMm: 8.5, aftBogieAirgapMm: 9.0, rollAngleDeg: 1.8 }
    ];

    const result = SuperconductingMaglevLinearMotorRotorAirgapProfiler.profileAirgapTelemetry(
      limSpec,
      telemetry
    );

    expect(result.isAirgapIntegrityCompliant).toBe(false);
    expect(result.alerts.some(a => a.severity === "EMERGENCY_INTERLOCK_TRIP")).toBe(true);
    expect(result.alerts.some(a => a.anomalyType === "ROTOR_AIRGAP_PINCH_COLLAPSE")).toBe(true);
  });

  it("detects thrust decoupling expansion when airgap opens beyond max limit", () => {
    const telemetry: BogieAirgapTelemetryPoint[] = [
      { timestampMs: 100, chainageKm: 20.0, forwardBogieAirgapMm: 30.5, midBogieAirgapMm: 29.0, aftBogieAirgapMm: 28.5, rollAngleDeg: -0.2 }
    ];

    const result = SuperconductingMaglevLinearMotorRotorAirgapProfiler.profileAirgapTelemetry(
      limSpec,
      telemetry
    );

    expect(result.alerts.some(a => a.anomalyType === "THRUST_DECOUPLING_EXPANSION")).toBe(true);
  });

  it("throws error on empty telemetry", () => {
    expect(() =>
      SuperconductingMaglevLinearMotorRotorAirgapProfiler.profileAirgapTelemetry(limSpec, [])
    ).toThrow(/cannot be empty/);
  });
});
