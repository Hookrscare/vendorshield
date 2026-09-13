import { describe, it, expect } from "vitest";
import {
  LiquefiedCo2WellboreMicroannulusSensor,
  CcsWellboreIntegrityProfile,
  WellboreAcousticProbeReading
} from "./liquefied-co2-wellbore-microannulus-sensor";

describe("LiquefiedCo2WellboreMicroannulusSensor", () => {
  it("evaluates a pristine CCS wellbore with high acoustic bond index and zero breach risk", () => {
    const probes: WellboreAcousticProbeReading[] = [
      { depthMeters: 1800, measuredAcousticImpedanceMRayl: 8.1, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 4, casingResonanceAmplitudeMv: 4.0, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 },
      { depthMeters: 1850, measuredAcousticImpedanceMRayl: 8.3, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 5, casingResonanceAmplitudeMv: 4.5, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 },
      { depthMeters: 1900, measuredAcousticImpedanceMRayl: 8.0, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 6, casingResonanceAmplitudeMv: 5.0, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 }
    ];

    const profile: CcsWellboreIntegrityProfile = {
      wellboreId: "INJ-WELL-NORTH-SEA-04",
      injectionReservoirName: "Utsira Sandstone Formation",
      cumulativeInjectedMetricTonsCO2: 1250000,
      probes
    };

    const report = LiquefiedCo2WellboreMicroannulusSensor.evaluateWellboreIntegrity(profile);
    expect(report.overallAcousticBondIndex).toBeGreaterThan(0.95);
    expect(report.criticalLeakPathDetected).toBe(false);
    expect(report.zoneEvaluations.every(z => z.containmentIntegrityStatus === "SECURE")).toBe(true);
    expect(report.remediationRecommendation).toContain("NOMINAL");
    expect(report.integrityHash).toHaveLength(64);
  });

  it("detects thermal contraction microannulus and fluid channel breach risk", () => {
    const probes: WellboreAcousticProbeReading[] = [
      { depthMeters: 2100, measuredAcousticImpedanceMRayl: 7.9, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 8, casingResonanceAmplitudeMv: 5.0, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 },
      // Severe fluid channel at 2150m where scCO2 eroded cement bond
      { depthMeters: 2150, measuredAcousticImpedanceMRayl: 1.2, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 85, casingResonanceAmplitudeMv: 68.0, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 },
      { depthMeters: 2200, measuredAcousticImpedanceMRayl: 6.5, casingWallThicknessMm: 11.2, apparentMicroannulusApertureMicrons: 32, casingResonanceAmplitudeMv: 25.0, freePipeAmplitudeMv: 85.0, goodBondAmplitudeMv: 3.0 }
    ];

    const profile: CcsWellboreIntegrityProfile = {
      wellboreId: "INJ-WELL-PERMIAN-09",
      injectionReservoirName: "Ellenburger Dolomite",
      cumulativeInjectedMetricTonsCO2: 450000,
      probes
    };

    const report = LiquefiedCo2WellboreMicroannulusSensor.evaluateWellboreIntegrity(profile);
    expect(report.criticalLeakPathDetected).toBe(true);
    expect(report.maximumMicroannulusMicrons).toBe(85);
    expect(report.remediationRecommendation).toContain("URGENT");
    expect(report.zoneEvaluations.some(z => z.cementDebondingSeverity === "CO2_FLUID_CHANNEL")).toBe(true);
  });

  it("validates input profile contracts", () => {
    expect(() => {
      LiquefiedCo2WellboreMicroannulusSensor.evaluateWellboreIntegrity({
        wellboreId: "",
        injectionReservoirName: "",
        cumulativeInjectedMetricTonsCO2: 0,
        probes: []
      });
    }).toThrow();
  });
});
