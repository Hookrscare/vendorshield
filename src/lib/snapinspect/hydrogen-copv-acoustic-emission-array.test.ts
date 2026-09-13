import { describe, it, expect } from "vitest";
import {
  HydrogenCopvAcousticEmissionArray,
  CopvVesselProfile,
  AcousticEmissionHit
} from "./hydrogen-copv-acoustic-emission-array";

describe("HydrogenCopvAcousticEmissionArray (SNAP-79)", () => {
  const nominalVessel: CopvVesselProfile = {
    vesselSerial: "H2-COPV-TYPE4-700BAR-0081",
    nominalPressureBar: 700,
    currentTestPressureBar: 700,
    previousMaxPressureBar: 700,
    vesselLengthMeters: 2.2,
    cfarpAcousticWaveVelocityMPerSec: 3200
  };

  it("evaluates healthy vessel under nominal pressure with negligible acoustic activity", () => {
    const hits: AcousticEmissionHit[] = [
      {
        sensorId: "AE-CH1",
        arrivalTimestampMicroseconds: 100,
        peakAmplitudeDb: 42.0,
        energyCounts: 12,
        riseTimeMicroseconds: 40.0,
        durationMicroseconds: 120.0
      }
    ];

    const assessment = HydrogenCopvAcousticEmissionArray.evaluateVesselAcousticStream(
      nominalVessel,
      hits
    );

    expect(assessment.structuralSafetyStatus).toBe("HEALTHY_PRESSURE_VESSEL");
    expect(assessment.requiresImmediateEmergencyVenting).toBe(false);
    expect(assessment.detectedDamageMechanisms.fiberBreaks).toBe(0);
    expect(assessment.felicityRatio).toBeGreaterThanOrEqual(0.95);
    expect(assessment.tamperEvidentDigest).toHaveLength(64);
  });

  it("triggers critical emergency venting on detected carbon fiber breakage and low Felicity ratio", () => {
    const severeHits: AcousticEmissionHit[] = [
      {
        sensorId: "AE-CH1",
        arrivalTimestampMicroseconds: 500,
        peakAmplitudeDb: 88.5,
        energyCounts: 950,
        riseTimeMicroseconds: 12.0,
        durationMicroseconds: 350.0
      },
      {
        sensorId: "AE-CH2",
        arrivalTimestampMicroseconds: 750, // 250 microsecond delta
        peakAmplitudeDb: 82.0,
        energyCounts: 720,
        riseTimeMicroseconds: 15.0,
        durationMicroseconds: 300.0
      },
      {
        sensorId: "AE-CH1",
        arrivalTimestampMicroseconds: 1200,
        peakAmplitudeDb: 79.0,
        energyCounts: 600,
        riseTimeMicroseconds: 18.0,
        durationMicroseconds: 280.0
      }
    ];

    const assessment = HydrogenCopvAcousticEmissionArray.evaluateVesselAcousticStream(
      nominalVessel,
      severeHits
    );

    expect(assessment.structuralSafetyStatus).toBe("CRITICAL_FIBER_RUPTURE_IMMEDIATE_DEPRESSURIZE");
    expect(assessment.requiresImmediateEmergencyVenting).toBe(true);
    expect(assessment.detectedDamageMechanisms.fiberBreaks).toBeGreaterThanOrEqual(2);
    expect(assessment.estimatedCriticalDefectPositionMeters).toBeGreaterThan(0);
  });

  it("identifies moderate micro-cracking and delamination requiring monitoring", () => {
    const moderateHits: AcousticEmissionHit[] = Array.from({ length: 25 }, (_, i) => ({
      sensorId: `AE-CH${(i % 4) + 1}`,
      arrivalTimestampMicroseconds: i * 200,
      peakAmplitudeDb: 48.0,
      energyCounts: 45,
      riseTimeMicroseconds: 35.0,
      durationMicroseconds: 150.0
    }));

    const assessment = HydrogenCopvAcousticEmissionArray.evaluateVesselAcousticStream(
      nominalVessel,
      moderateHits
    );

    expect(assessment.structuralSafetyStatus).toBe("PROGRESSIVE_MICRO_CRACKING_MONITOR");
    expect(assessment.requiresImmediateEmergencyVenting).toBe(false);
  });

  it("enforces vessel profile parameter validation", () => {
    expect(() => {
      HydrogenCopvAcousticEmissionArray.evaluateVesselAcousticStream(
        { ...nominalVessel, vesselSerial: "" },
        []
      );
    }).toThrow("Invalid vessel profile: vesselSerial, positive nominal and non-negative test pressure required.");
  });
});
