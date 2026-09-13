import { describe, it, expect } from "vitest";
import {
  SubseaFlowlineMultiphaseSlugVibrationTracker,
  SubseaSlugTelemetryBurst,
} from "./subsea-flowline-multiphase-slug-vibration-tracker";

describe("SNAP-85: SubseaFlowlineMultiphaseSlugVibrationTracker", () => {
  it("evaluates safe stable stratified flowline operation", () => {
    const burst: SubseaSlugTelemetryBurst = {
      flowlineId: "FL-DEEP-04",
      kilometerPointKp: 14.5,
      waterDepthMeters: 1850.0,
      slugFrequencyHz: 0.2,
      triaxialAccelerationRmsG: 0.15,
      acousticWaveguideEnergyDb: 35.0,
      dynamicBendingStressMpa: 12.0,
      continuousOperatingHours: 500,
    };

    const result = SubseaFlowlineMultiphaseSlugVibrationTracker.evaluateSlugVibration(burst);
    expect(result.sluggingRegime).toBe("STABLE_ANNULAR_STRATIFIED");
    expect(result.flowlineIntegrityStatus).toBe("SAFE");
    expect(result.estimatedRemainingFatigueHours).toBeGreaterThan(10000);
    expect(result.cadVectorCoordinate.xKp).toBe(14.5);
    expect(result.cadVectorCoordinate.zDepth).toBe(1850.0);
    expect(result.inspectionDigest).toHaveLength(64);
  });

  it("detects severe slugging and flags imminent fatigue damage", () => {
    const burst: SubseaSlugTelemetryBurst = {
      flowlineId: "FL-RISER-BASE-01",
      kilometerPointKp: 2.1,
      waterDepthMeters: 2200.0,
      slugFrequencyHz: 1.5,
      triaxialAccelerationRmsG: 2.4, // Severe vibration
      acousticWaveguideEnergyDb: 78.0,
      dynamicBendingStressMpa: 110.0, // High dynamic bending stress
      continuousOperatingHours: 2000,
    };

    const result = SubseaFlowlineMultiphaseSlugVibrationTracker.evaluateSlugVibration(burst);
    expect(result.sluggingRegime).toBe("SEVERE_HYDRODYNAMIC_SLUGGING");
    expect(result.flowlineIntegrityStatus).toBe("CRITICAL_FATIGUE_IMMINENT");
    expect(result.slugMitigationRecommendation).toContain("choke throttling required");
  });

  it("handles intermittent slug transition regime", () => {
    const burst: SubseaSlugTelemetryBurst = {
      flowlineId: "FL-WEST-10",
      kilometerPointKp: 8.0,
      waterDepthMeters: 1400.0,
      slugFrequencyHz: 0.5,
      triaxialAccelerationRmsG: 0.6,
      acousticWaveguideEnergyDb: 52.0,
      dynamicBendingStressMpa: 45.0,
      continuousOperatingHours: 100,
    };

    const result = SubseaFlowlineMultiphaseSlugVibrationTracker.evaluateSlugVibration(burst);
    expect(result.sluggingRegime).toBe("INTERMITTENT_SLUG_TRANSITION");
    expect(result.flowlineIntegrityStatus).toBe("ELEVATED_VIBRATION_WATCH");
  });

  it("validates burst parameter invariants", () => {
    expect(() => {
      SubseaFlowlineMultiphaseSlugVibrationTracker.evaluateSlugVibration({
        flowlineId: "",
        kilometerPointKp: 0,
        waterDepthMeters: 1000,
        slugFrequencyHz: 1,
        triaxialAccelerationRmsG: 1,
        acousticWaveguideEnergyDb: 10,
        dynamicBendingStressMpa: 10,
        continuousOperatingHours: 1,
      });
    }).toThrow();
  });
});
