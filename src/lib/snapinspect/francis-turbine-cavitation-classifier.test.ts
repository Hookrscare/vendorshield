import { describe, it, expect } from 'vitest';
import {
  FrancisTurbineCavitationClassifier,
  TurbineOperatingConditions,
  UltrasonicAeTelemetry
} from './francis-turbine-cavitation-classifier';

describe('SNAP-69: Hydroelectric Francis Turbine Cavitation AE Classifier', () => {
  const normalConditions: TurbineOperatingConditions = {
    turbineId: 'UNIT-FRANCIS-03',
    rpm: 300, // 5 Hz
    netHeadMeters: 140.0,
    dischargeFlowM3PerSec: 90.0,
    tailwaterElevationMeters: 210.0,
    plantThomaCavitationFactor: 0.16
  };

  it('classifies benign operating regime with low AE emissions', () => {
    const baselineAe: UltrasonicAeTelemetry = {
      acousticEnergyDbAe: 32.0,
      burstCountsPerSecond: 25.0, // 5 bursts per revolution
      peakFrequencyKhz: 60.0,
      draftTubeVortexRopePressureBar: 0.05
    };

    const diag = FrancisTurbineCavitationClassifier.diagnoseCavitation(normalConditions, baselineAe);

    expect(diag.cavitationRegime).toBe('NO_CAVITATION');
    expect(diag.metalLossRiskRateGramsPerHour).toBe(0.0);
    expect(diag.recommendedMitigation).toContain('operating within hydrodynamic cavitation safety envelope');
  });

  it('detects severe erosive blade pitting and calculates metal loss rate', () => {
    const destructiveAe: UltrasonicAeTelemetry = {
      acousticEnergyDbAe: 72.0,
      burstCountsPerSecond: 1200.0, // 240 bursts per revolution
      peakFrequencyKhz: 145.0,
      draftTubeVortexRopePressureBar: 0.10
    };

    const diag = FrancisTurbineCavitationClassifier.diagnoseCavitation(normalConditions, destructiveAe);

    expect(diag.cavitationRegime).toBe('EROSIVE_BLADE_PITTING');
    expect(diag.metalLossRiskRateGramsPerHour).toBeGreaterThan(10.0);
    expect(diag.recommendedMitigation).toContain('CRITICAL: Severe blade erosion pitting in progress');
  });

  it('flags draft tube vortex rope surge instability', () => {
    const surgingAe: UltrasonicAeTelemetry = {
      acousticEnergyDbAe: 50.0,
      burstCountsPerSecond: 100.0,
      peakFrequencyKhz: 80.0,
      draftTubeVortexRopePressureBar: 0.65 // > 0.45 bar pulsation
    };

    const diag = FrancisTurbineCavitationClassifier.diagnoseCavitation(normalConditions, surgingAe);

    expect(diag.cavitationRegime).toBe('DRAFT_TUBE_SURGE_ROPE');
    expect(diag.recommendedMitigation).toContain('aeration valve');
  });
});
