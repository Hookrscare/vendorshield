import { describe, it, expect } from "vitest";
import {
  TbmCutterheadVibrationFaceVoidClassifier,
  CutterheadVibrationTelemetry,
  LookAheadRadarReflection
} from "./tbm-cutterhead-vibration-geotechnical-radar";

describe("TbmCutterheadVibrationFaceVoidClassifier (SNAP-86)", () => {
  const nominalVibe: CutterheadVibrationTelemetry = {
    tbmId: "HERRENKNECHT-EPB-S842",
    chainageMeters: 1420.5,
    rotationRpm: 2.8,
    rmsVibrationVelocityMmPerSec: 6.2,
    crestFactor: 2.9,
    torqueVariancePercentage: 8.5
  };

  it("should evaluate homogeneous ground as safe and maintain nominal advance speed", () => {
    const reflections: LookAheadRadarReflection[] = [
      { distanceAheadMeters: 5.0, reflectionAmplitudeDb: -52.0, estimatedDielectricPermittivity: 6.5 },
      { distanceAheadMeters: 12.0, reflectionAmplitudeDb: -48.0, estimatedDielectricPermittivity: 6.2 }
    ];

    const res = TbmCutterheadVibrationFaceVoidClassifier.evaluateTunnelFaceConditions(nominalVibe, reflections);

    expect(res.detectedFaceHazard).toBe("HOMOGENEOUS_STABLE_GROUND_SAFE_EXCAVATION");
    expect(res.cutterheadVibrationSeverity).toBe("NORMAL_SMOOTH");
    expect(res.recommendedMaxAdvanceSpeedMmPerMin).toBe(35.0);
    expect(res.emergencyFaceGroutingRequired).toBe(false);
    expect(res.tamperEvidentDigest).toHaveLength(64);
  });

  it("should detect water-inflow karst cavity and trigger emergency face grouting", () => {
    const karstReflections: LookAheadRadarReflection[] = [
      { distanceAheadMeters: 8.4, reflectionAmplitudeDb: -18.0, estimatedDielectricPermittivity: 78.0 }
    ];

    const res = TbmCutterheadVibrationFaceVoidClassifier.evaluateTunnelFaceConditions(nominalVibe, karstReflections);

    expect(res.detectedFaceHazard).toBe("AHEAD_WATER_INFLOW_KARST_CAVITY_RISK");
    expect(res.emergencyFaceGroutingRequired).toBe(true);
    expect(res.hazardDistanceAheadMeters).toBe(8.4);
    expect(res.recommendedMaxAdvanceSpeedMmPerMin).toBe(5.0);
  });

  it("should detect mixed-face boulder impacts from cutterhead vibration chatter", () => {
    const chatteringVibe: CutterheadVibrationTelemetry = {
      ...nominalVibe,
      rmsVibrationVelocityMmPerSec: 22.4, // Extreme vibration
      crestFactor: 5.2
    };

    const res = TbmCutterheadVibrationFaceVoidClassifier.evaluateTunnelFaceConditions(chatteringVibe, []);

    expect(res.detectedFaceHazard).toBe("MIXED_FACE_BOULDER_DISC_DAMAGE_RISK");
    expect(res.cutterheadVibrationSeverity).toBe("SEVERE_DISC_IMPACT_OR_JAMMED");
    expect(res.recommendedMaxAdvanceSpeedMmPerMin).toBe(12.0);
  });

  it("should reject invalid TBM profiles", () => {
    expect(() => {
      TbmCutterheadVibrationFaceVoidClassifier.evaluateTunnelFaceConditions(
        { ...nominalVibe, rotationRpm: 0 },
        []
      );
    }).toThrow();
  });
});
