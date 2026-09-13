import { describe, it, expect } from 'vitest';
import {
  NuclearCaskHeliumResonator,
  CaskGeometry,
  AcousticCavitySounding
} from './nuclear-cask-helium-resonator';

describe('SNAP-64: Nuclear Spent Fuel Dry Cask Storage Canister Helium Leak Resonator', () => {
  const cask: CaskGeometry = {
    caskId: 'MPC-68-SNF-042',
    cavityLengthMeters: 4.5,
    nominalHeliumPressureBar: 5.0,
    internalTempKelvin: 350.0 // ~ 77 C
  };

  it('validates sound speed in pure helium and intact canister acoustic frequency', () => {
    const c_he = NuclearCaskHeliumResonator.calculateSpeedOfSound(1.0, 350.0);
    expect(c_he).toBeGreaterThan(1000);
    expect(c_he).toBeLessThan(1200);

    const f_he = NuclearCaskHeliumResonator.calculateStandingWaveFrequency(c_he, 4.5);
    expect(f_he).toBeGreaterThan(115);
    expect(f_he).toBeLessThan(135);

    const intactSounding: AcousticCavitySounding = {
      fundamentalFrequencyHz: f_he,
      measuredQFactor: 85.0,
      shellAcousticEmissionDb: 12.0
    };

    const assessment = NuclearCaskHeliumResonator.evaluateCask(cask, intactSounding);
    expect(assessment.confinementIntegrityStatus).toBe('COMPLIANT');
    expect(assessment.estimatedHeliumPurityPercent).toBeGreaterThanOrEqual(99.0);
    expect(assessment.nrcPart72Violation).toBe(false);
  });

  it('detects severe frequency drop from air ingress and triggers NRC 10 CFR Part 72 violation alert', () => {
    // Air speed of sound is ~ 375 m/s at 350K -> resonance drops to ~ 41.6 Hz
    const leakSounding: AcousticCavitySounding = {
      fundamentalFrequencyHz: 45.0,
      measuredQFactor: 22.0,
      shellAcousticEmissionDb: 38.0
    };

    const assessment = NuclearCaskHeliumResonator.evaluateCask(cask, leakSounding);
    expect(assessment.confinementIntegrityStatus).toBe('CRITICAL_LEAK_AIR_INGRESS');
    expect(assessment.estimatedHeliumPurityPercent).toBeLessThan(20.0);
    expect(assessment.nrcPart72Violation).toBe(true);
    expect(assessment.recommendedAction).toContain('MANDATORY ISFSI ALERT');
  });
});
