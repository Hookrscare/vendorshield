import { describe, it, expect } from "vitest";
import {
  HydroelectricPenstockAcousticResonanceSensor,
  PenstockTelemetry
} from "./hydroelectric-penstock-acoustic-resonance-sensor";

describe("SNAP-90: Hydroelectric Penstock Acoustic Resonance & Hydraulic Transient Water-Hammer Sensor", () => {
  it("evaluates nominal operating parameters during controlled valve closure", () => {
    const telemetry: PenstockTelemetry = {
      penstockId: "PENSTOCK-ALPS-01",
      penstockLengthMeters: 600.0,
      innerDiameterMeters: 2.5,
      wallThicknessMm: 32.0,
      waterAcousticWaveSpeedMps: 1200.0,
      initialFlowVelocityMps: 2.0,
      emergencyValveClosureTimeSec: 10.0, // Slow closure (10.0s > 2L/a = 1.0s)
      measuredCavitationAcousticEnergyDb: 42.0
    };

    const assessment = HydroelectricPenstockAcousticResonanceSensor.evaluatePenstockIntegrity(telemetry);

    expect(assessment.penstockId).toBe("PENSTOCK-ALPS-01");
    expect(assessment.fundamentalResonanceFreqHz).toBe(0.5); // 1200 / (4*600) = 0.5 Hz
    expect(assessment.joukowskyWaterHammerPressureBar).toBeLessThan(10.0);
    expect(assessment.transientSeverity).toBe("NOMINAL_OPERATING");
    expect(assessment.cavitationDamageRisk).toBe("LOW_NORMAL");
    expect(assessment.emergencySurgeReliefTriggered).toBe(false);
    expect(assessment.penstockSafetyCertificate).toHaveLength(64);
  });

  it("detects critical water hammer pressure and triggers emergency surge relief", () => {
    const telemetry: PenstockTelemetry = {
      penstockId: "PENSTOCK-NORWAY-HIGHHEAD",
      penstockLengthMeters: 1000.0,
      innerDiameterMeters: 3.0,
      wallThicknessMm: 30.0,
      waterAcousticWaveSpeedMps: 1250.0,
      initialFlowVelocityMps: 5.0,
      emergencyValveClosureTimeSec: 1.2, // Instantaneous closure (1.2s < 2L/a = 1.6s)
      measuredCavitationAcousticEnergyDb: 50.0
    };

    const assessment = HydroelectricPenstockAcousticResonanceSensor.evaluatePenstockIntegrity(telemetry);

    expect(assessment.joukowskyWaterHammerPressureBar).toBeGreaterThan(60.0); // Full Joukowsky surge
    expect(assessment.pipeHoopStressMpa).toBeGreaterThan(250.0);
    expect(assessment.transientSeverity).toBe("CRITICAL_WATER_HAMMER_RUPTURE_RISK");
    expect(assessment.emergencySurgeReliefTriggered).toBe(true);
  });

  it("identifies severe cavitation pitting acoustic emission and triggers mitigation", () => {
    const telemetry: PenstockTelemetry = {
      penstockId: "PENSTOCK-TURBINE-RUNNER-02",
      penstockLengthMeters: 400.0,
      innerDiameterMeters: 2.0,
      wallThicknessMm: 28.0,
      waterAcousticWaveSpeedMps: 1100.0,
      initialFlowVelocityMps: 2.5,
      emergencyValveClosureTimeSec: 6.0,
      measuredCavitationAcousticEnergyDb: 92.0 // Severe ultrasonic pitting spikes
    };

    const assessment = HydroelectricPenstockAcousticResonanceSensor.evaluatePenstockIntegrity(telemetry);

    expect(assessment.cavitationDamageRisk).toBe("SEVERE_PITTING_IMMINENT_LEAK");
    expect(assessment.emergencySurgeReliefTriggered).toBe(true);
  });
});
