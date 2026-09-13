import { describe, it, expect } from 'vitest';
import {
  NuclearDryCaskHeliumLeakResonator,
  CanisterCavitySpec,
  AcousticResonanceTelemetry,
} from './nuclear-dry-cask-helium-leak-resonator';

describe('SNAP-64: NuclearDryCaskHeliumLeakResonator Tests', () => {
  const resonator = new NuclearDryCaskHeliumLeakResonator();

  const standardCanister: CanisterCavitySpec = {
    canisterId: 'MPC-68-UNIT-04',
    cavityLengthMeters: 4.8, // 4.8m tall spent fuel canister
    nominalHeliumPressureAtm: 5.0,
    cavityTemperatureKelvin: 400.0,
    minSafePressureAtm: 3.0,
  };

  it('validates intact containment with pure helium high acoustic velocity', () => {
    // Pure helium speed of sound at 400K:
    // c = sqrt(1.667 * 8.314 * 400 / 0.004003) = sqrt(5544.7 / 0.004003) = 1176.9 m/s
    // f0 = c / (2 * 4.8) = 1176.9 / 9.6 = 122.6 Hz
    const telemetry: AcousticResonanceTelemetry = {
      measuredFundamentalFrequencyHz: 122.6,
      resonanceQualityFactorQ: 1050,
      ambientNoiseFloorDb: 42.0,
    };

    const res = resonator.evaluateCanisterResonance(standardCanister, telemetry);
    expect(res.isContainmentIntact).toBe(true);
    expect(res.alertLevel).toBe('NOMINAL_SEALED');
    expect(res.estimatedHeliumPurityPct).toBeGreaterThan(99.0);
    expect(res.estimatedInternalPressureAtm).toBeGreaterThanOrEqual(5.0);
  });

  it('detects critical containment breach when air ingress drops acoustic frequency', () => {
    // If air ingresses, c drops to ~400 m/s -> f0 drops to ~42 Hz
    const leakTelemetry: AcousticResonanceTelemetry = {
      measuredFundamentalFrequencyHz: 42.0,
      resonanceQualityFactorQ: 350, // Severe viscous damping
      ambientNoiseFloorDb: 45.0,
    };

    const res = resonator.evaluateCanisterResonance(standardCanister, leakTelemetry);
    expect(res.isContainmentIntact).toBe(false);
    expect(res.alertLevel).toBe('CRITICAL_LEAK_AIR_INGRESS');
    expect(res.estimatedHeliumPurityPct).toBeLessThan(20.0);
    expect(res.findings[0]).toContain('CRITICAL: Helium concentration fell');
  });

  it('rejects invalid non-positive canister dimensions', () => {
    const invalidCanister: CanisterCavitySpec = {
      canisterId: 'MPC-INVALID',
      cavityLengthMeters: -1.0,
      nominalHeliumPressureAtm: 5.0,
      cavityTemperatureKelvin: 400.0,
      minSafePressureAtm: 3.0,
    };

    const telemetry: AcousticResonanceTelemetry = {
      measuredFundamentalFrequencyHz: 100.0,
      resonanceQualityFactorQ: 1000,
      ambientNoiseFloorDb: 40.0,
    };

    expect(() => resonator.evaluateCanisterResonance(invalidCanister, telemetry)).toThrow(
      'Canister dimensions and temperature must be positive'
    );
  });
});
