import { describe, it, expect } from "vitest";
import {
  FrancisTurbineCavitationPittingClassifier,
  FrancisTurbineOperatingConditions,
  AcousticEmissionMetrics
} from "./francis-turbine-cavitation-pitting-classifier";

describe("SNAP-69: Hydroelectric Francis Turbine Runner Cavitation Pitting Classifier", () => {
  const normalConditions: FrancisTurbineOperatingConditions = {
    turbineId: "UNIT-03-HOOVER-DAM",
    netHeadMeters: 150.0,
    flowRateM3s: 110.0,
    ratedPowerMw: 130.0,
    runnerSuctionElevationM: 1.5,
    atmosphericPressureHeadM: 10.1,
    vaporPressureHeadM: 0.24,
    criticalThomaSigma: 0.055 // High margin (NPSH = 8.36, sigma = 8.36 / 150 = 0.0557)
  };

  it("identifies healthy laminar operation when Thoma sigma margin and AE levels are nominal", () => {
    const normalAcoustic: AcousticEmissionMetrics = {
      sensorFrequencyRangeKhz: [100, 1000],
      rmsEnergy100to350KhzDb: 32.0, // Below noise floor of 38 dB
      burstRatePerSecond: 12,
      peakAmplitudeVolts: 0.05,
      sensorLocation: "DRAFT_TUBE_CONE"
    };

    const res = FrancisTurbineCavitationPittingClassifier.evaluateTurbine(normalConditions, normalAcoustic);
    expect(res.isCavitationActive).toBe(false);
    expect(res.severityGrade).toBe("NORMAL_LAMINAR_OPERATION");
    expect(res.estimatedPittingRateMmPerYear).toBe(0.0);
    expect(res.iso10816Evaluation).toBe("ZONE_A_EXCELLENT");
    expect(res.maintenanceActionRequired).toBe(false);
    expect(res.auditHash).toHaveLength(64);
  });

  it("detects severe cloud cavitation pitting under tailrace depression and high ultrasonic energy", () => {
    // Tailrace depressed or high runner elevation (Z_s = 5.2m -> NPSH = 10.1 - 0.24 - 5.2 = 4.66m)
    // sigma = 4.66 / 150 = 0.031 < critical 0.055
    const severeConditions: FrancisTurbineOperatingConditions = {
      ...normalConditions,
      runnerSuctionElevationM: 5.2
    };

    const severeAcoustic: AcousticEmissionMetrics = {
      sensorFrequencyRangeKhz: [100, 1000],
      rmsEnergy100to350KhzDb: 78.5, // Violent bubble implosion (excess = 40.5 dB)
      burstRatePerSecond: 1450,
      peakAmplitudeVolts: 4.8,
      sensorLocation: "RUNNER_CROWN"
    };

    const res = FrancisTurbineCavitationPittingClassifier.evaluateTurbine(severeConditions, severeAcoustic);
    expect(res.isCavitationActive).toBe(true);
    expect(res.severityGrade).toBe("SEVERE_CLOUD_CAVITATION_PITTING");
    expect(res.estimatedPittingRateMmPerYear).toBeGreaterThan(0.5);
    expect(res.annualMetalLossKg).toBeGreaterThan(10.0);
    expect(res.iso10816Evaluation).toBe("ZONE_D_CRITICAL_STOP");
    expect(res.maintenanceActionRequired).toBe(true);
    expect(res.recommendedActions).toEqual(
      expect.arrayContaining([expect.stringContaining("IMMEDIATE LOAD SHEDDING")])
    );
  });
});
