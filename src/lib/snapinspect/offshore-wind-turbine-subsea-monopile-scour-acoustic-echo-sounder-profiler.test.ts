import { describe, it, expect } from "vitest";
import {
  OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler,
  MonopileAcousticEchoSounderSurveyRequest,
  EchoSounderSounding
} from "./offshore-wind-turbine-subsea-monopile-scour-acoustic-echo-sounder-profiler";

describe("SNAP-91: Offshore Wind Turbine Subsea Monopile Scour & Acoustic Echo-Sounder Profiler", () => {
  const baseRequest: MonopileAcousticEchoSounderSurveyRequest = {
    turbineAssetId: "OWT-NORTH-SEA-TURBINE-042",
    surveyId: "SRV-ASV-2026-09-A42",
    monopileDiameterMeters: 8.0,
    baselineSeabedDepthMeters: 30.0,
    designEmbedmentDepthMeters: 35.0,
    rockArmorBackscatterThresholdDb: -20.0,
    soundings: []
  };

  it("classifies foundation as PASS_STABLE when scour is negligible and rock armor is intact", () => {
    // Generate healthy soundings across all 4 quadrants with high rock coverage (-14 to -18 dB) and depth ~ 30.0m
    const soundings: EchoSounderSounding[] = [];
    const quadrantsAzimuths = [45, 135, 225, 315];
    for (const az of quadrantsAzimuths) {
      soundings.push({
        azimuthDeg: az,
        radialDistanceMeters: 2.0,
        measuredDepthMeters: 30.2, // only 0.2m scour
        acousticBackscatterDb: -14.5
      });
      soundings.push({
        azimuthDeg: az + 20,
        radialDistanceMeters: 6.0,
        measuredDepthMeters: 30.1,
        acousticBackscatterDb: -16.0
      });
    }

    const result = OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler.processSurvey({
      ...baseRequest,
      soundings
    });

    expect(result.structuralRiskClassification).toBe("PASS_STABLE");
    expect(result.scourDepthRatio).toBeLessThan(0.35);
    expect(result.foundationStiffnessRetentionFactor).toBeGreaterThan(0.95);
    expect(result.overallRockArmorIntegrityRatio).toBe(1.0);
    expect(result.quadrantProfiles).toHaveLength(4);
    expect(result.cryptographicSurveyDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("classifies foundation as WARNING_SEDIMENT_LOSS when moderate scour develops in dominant tidal quadrant", () => {
    const soundings: EchoSounderSounding[] = [];
    // N_NE has severe current washout (scour = 3.2m -> depth = 33.2m, sand backscatter -28 dB)
    soundings.push(
      { azimuthDeg: 30, radialDistanceMeters: 3.0, measuredDepthMeters: 33.2, acousticBackscatterDb: -28.0 },
      { azimuthDeg: 60, radialDistanceMeters: 7.0, measuredDepthMeters: 32.8, acousticBackscatterDb: -27.0 }
    );
    // Other quadrants remain relatively stable with rock armor
    for (const az of [120, 150, 210, 240, 300, 330]) {
      soundings.push({
        azimuthDeg: az,
        radialDistanceMeters: 4.0,
        measuredDepthMeters: 30.5,
        acousticBackscatterDb: -18.0
      });
    }

    const result = OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler.processSurvey({
      ...baseRequest,
      soundings
    });

    expect(result.structuralRiskClassification).toBe("WARNING_SEDIMENT_LOSS");
    expect(result.maxScourDepthMeters).toBeCloseTo(3.2, 2);
    expect(result.scourDepthRatio).toBe(0.4); // 3.2 / 8.0 = 0.40 >= 0.35
    const neProfile = result.quadrantProfiles.find(q => q.quadrant === "N_NE");
    expect(neProfile?.rockArmorCoverageRatio).toBe(0.0);
  });

  it("triggers CRITICAL_FOUNDATION_UNDERMINED when scour exceeds 80% diameter and rock armor is washed out", () => {
    const soundings: EchoSounderSounding[] = [];
    // Extreme scour hole: depth reaches 37.0m (scour = 7.0m, ratio = 7/8 = 0.875)
    for (let az = 0; az < 360; az += 45) {
      soundings.push({
        azimuthDeg: az,
        radialDistanceMeters: 5.0,
        measuredDepthMeters: 37.0,
        acousticBackscatterDb: -32.0 // complete sand/silt liquefaction
      });
    }

    const result = OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler.processSurvey({
      ...baseRequest,
      soundings
    });

    expect(result.structuralRiskClassification).toBe("CRITICAL_FOUNDATION_UNDERMINED");
    expect(result.scourDepthRatio).toBeGreaterThanOrEqual(0.8);
    expect(result.recommendedIntervention).toContain("URGENT: Deploy DP2 rock-dumping vessel");
    expect(result.estimatedScourVoidVolumeM3).toBeGreaterThan(0);
    expect(result.foundationStiffnessRetentionFactor).toBeLessThan(0.75);
  });

  it("throws validation error for insufficient soundings or invalid monopile dimensions", () => {
    expect(() => {
      OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler.processSurvey({
        ...baseRequest,
        monopileDiameterMeters: 0,
        soundings: []
      });
    }).toThrow("Monopile diameter and baseline depth must be strictly positive.");

    expect(() => {
      OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler.processSurvey({
        ...baseRequest,
        soundings: [
          { azimuthDeg: 10, radialDistanceMeters: 1, measuredDepthMeters: 30, acousticBackscatterDb: -10 }
        ]
      });
    }).toThrow("Survey requires at least 8 multi-quadrant acoustic soundings.");
  });
});
