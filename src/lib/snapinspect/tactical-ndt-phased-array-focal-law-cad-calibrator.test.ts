import { describe, it, expect } from "vitest";
import {
  TacticalNdtPhasedArrayFocalLawCadCalibrator,
  PhasedArrayProbeConfig,
  MATERIAL_PRESETS,
  FocalTargetCAD,
} from "./tactical-ndt-phased-array-focal-law-cad-calibrator";

describe("SNAP-145: TacticalNdtPhasedArrayFocalLawCadCalibrator", () => {
  const standardProbe: PhasedArrayProbeConfig = {
    elementCount: 16,
    pitchMm: 0.6,
    frequencyMhz: 5.0,
    wedgeAngleDeg: 36.0,
    wedgeVelocityMPerSec: 2330, // Rexolite
    wedgeHeightAtFirstElementMm: 12.5,
  };

  it("accurately calculates 1st and 2nd critical Snell refraction angles for steel", () => {
    const carbonSteel = MATERIAL_PRESETS.CARBON_STEEL;
    const { firstCriticalAngleDeg, secondCriticalAngleDeg } =
      TacticalNdtPhasedArrayFocalLawCadCalibrator.calculateCriticalAngles(
        standardProbe.wedgeVelocityMPerSec,
        carbonSteel.longitudinalVelocityMPerSec,
        carbonSteel.shearVelocityMPerSec
      );

    // 1st critical angle: asin(2330 / 5920) ~ 23.17 deg
    expect(firstCriticalAngleDeg).toBeGreaterThan(23.0);
    expect(firstCriticalAngleDeg).toBeLessThan(23.5);

    // 2nd critical angle: asin(2330 / 3240) ~ 45.98 deg
    expect(secondCriticalAngleDeg).toBeGreaterThan(45.5);
    expect(secondCriticalAngleDeg).toBeLessThan(46.5);
  });

  it("computes compliant 45-degree shear wave focal law delays for carbon steel weld inspection", () => {
    const target: FocalTargetCAD = {
      focalDepthMm: 25.0,
      steerAngleDeg: 45.0,
      cadSurfaceNormal: [0, 0, 1],
    };

    const report = TacticalNdtPhasedArrayFocalLawCadCalibrator.computeFocalLaw(
      standardProbe,
      MATERIAL_PRESETS.CARBON_STEEL,
      target
    );

    // Snell incident angle for 45 deg shear in steel: asin((2330/3240)*sin(45)) ~ 30.56 deg
    expect(report.incidentAngleDeg).toBeGreaterThan(30.0);
    expect(report.incidentAngleDeg).toBeLessThan(31.0);

    // 30.56 deg is between 23.17 deg and 45.98 deg -> valid shear wave
    expect(report.isShearWaveInspectionValid).toBe(true);

    expect(report.elementDelays).toHaveLength(16);
    expect(report.maxDelaySpanNs).toBeGreaterThan(0);
    expect(report.asmeCalibrationAttestation).toHaveLength(64);
  });

  it("rejects probe configurations with fewer than 2 elements or invalid focal depth", () => {
    const invalidProbe: PhasedArrayProbeConfig = {
      ...standardProbe,
      elementCount: 1,
    };

    const validTarget: FocalTargetCAD = {
      focalDepthMm: 20.0,
      steerAngleDeg: 45.0,
      cadSurfaceNormal: [0, 0, 1],
    };

    expect(() =>
      TacticalNdtPhasedArrayFocalLawCadCalibrator.computeFocalLaw(
        invalidProbe,
        MATERIAL_PRESETS.CARBON_STEEL,
        validTarget
      )
    ).toThrow("Phased array probe must contain at least 2 elements");

    expect(() =>
      TacticalNdtPhasedArrayFocalLawCadCalibrator.computeFocalLaw(
        standardProbe,
        MATERIAL_PRESETS.CARBON_STEEL,
        { ...validTarget, focalDepthMm: -5.0 }
      )
    ).toThrow("Focal depth must be strictly positive");
  });
});
