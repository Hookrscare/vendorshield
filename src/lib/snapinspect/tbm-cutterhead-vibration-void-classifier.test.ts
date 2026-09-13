import { describe, it, expect } from "vitest";
import {
  TbmCutterheadVibrationVoidClassifier,
  TbmExcavationTelemetry,
} from "./tbm-cutterhead-vibration-void-classifier";

describe("SNAP-86: TbmCutterheadVibrationVoidClassifier", () => {
  const nominalTelemetry: TbmExcavationTelemetry = {
    tbmId: "TBM-HERRENKNECHT-S842",
    chainageMeter: 1250.4,
    cutterheadRpm: 2.8,
    thrustForceMegaNewtons: 22.0,
    torqueMegaNewtonMeters: 5.5,
    vibrationRmsAccelerationG: 1.8,
  };

  it("classifies smooth excavation in homogeneous rock as NOMINAL_STRATA", () => {
    const result = TbmCutterheadVibrationVoidClassifier.evaluateTunnelFace(nominalTelemetry);
    expect(result.geologicalHazardLevel).toBe("NOMINAL_STRATA");
    expect(result.stopExcavationRecommended).toBe(false);
    expect(result.cutterDiscWearIndex).toBeLessThan(0.4);
    expect(result.attestationToken).toHaveLength(64);
  });

  it("detects water-bearing void ahead of face and recommends halting excavation", () => {
    const voidTelemetry: TbmExcavationTelemetry = {
      ...nominalTelemetry,
      lookAheadRadarVoidDistanceMeters: 3.2, // 3.2m ahead
      lookAheadRadarPermittivityContrast: 6.5, // high contrast (water)
    };

    const result = TbmCutterheadVibrationVoidClassifier.evaluateTunnelFace(voidTelemetry);
    expect(result.geologicalHazardLevel).toBe("WATER_BEARING_VOID_CRITICAL");
    expect(result.stopExcavationRecommended).toBe(true);
    expect(result.recommendationNote).toContain("HALT TBM ADVANCE");
  });

  it("detects severe boulder impact vibrations", () => {
    const boulderTelemetry: TbmExcavationTelemetry = {
      ...nominalTelemetry,
      vibrationRmsAccelerationG: 7.4, // violent shock
    };

    const result = TbmCutterheadVibrationVoidClassifier.evaluateTunnelFace(boulderTelemetry);
    expect(result.geologicalHazardLevel).toBe("BOULDER_IMPACT_WARNING");
    expect(result.stopExcavationRecommended).toBe(false);
    expect(result.recommendationNote).toContain("Reduce RPM by 35%");
  });

  it("validates boundary inputs", () => {
    expect(() => {
      TbmCutterheadVibrationVoidClassifier.evaluateTunnelFace({
        ...nominalTelemetry,
        tbmId: "",
      });
    }).toThrow();

    expect(() => {
      TbmCutterheadVibrationVoidClassifier.evaluateTunnelFace({
        ...nominalTelemetry,
        cutterheadRpm: 0,
      });
    }).toThrow();
  });
});
