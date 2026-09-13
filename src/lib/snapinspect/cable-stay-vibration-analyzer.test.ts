import { describe, it, expect } from 'vitest';
import {
  CableStayVibrationAnalyzer,
  CableStayProperties,
  StayVibrationTelemetry
} from './cable-stay-vibration-analyzer';

describe('SNAP-66: Cable-Stayed Bridge Stay Vibration & Aerodynamic Damping Analyzer', () => {
  const stayProps: CableStayProperties = {
    stayId: 'STAY-N-14',
    lengthMeters: 160.0,
    massPerUnitLengthKgPerM: 52.0,
    outerDiameterMeters: 0.22,
    nominalDesignTensionKn: 4200.0
  };

  it('estimates cable tension from harmonic frequencies and verifies stable damped behavior', () => {
    // Delta_f = sqrt(4200000 / 52) / (2 * 160) = 284.28 / 320 = ~ 0.888 Hz
    const telemetry: StayVibrationTelemetry = {
      modalFrequenciesHz: [0.89, 1.78, 2.67, 3.56],
      amplitudeDecayEnvelope: [100.0, 85.0, 72.25, 61.4, 52.2], // Good decay: delta ~ 0.1625, zeta ~ 0.0258
      ambientWindSpeedMPerSec: 14.0
    };

    const report = CableStayVibrationAnalyzer.evaluateStay(stayProps, telemetry);

    expect(report.estimatedTensionKn).toBeGreaterThan(4100);
    expect(report.estimatedTensionKn).toBeLessThan(4300);
    expect(report.scrutonNumber).toBeGreaterThan(15.0);
    expect(report.aerodynamicVibrationRisk).toBe('STABLE');
  });

  it('detects low damping Scruton number < 10 and mandates damper retrofit', () => {
    // Very poor decay (lightly damped stay): amplitude hardly drops
    const lightlyDampedTelemetry: StayVibrationTelemetry = {
      modalFrequenciesHz: [0.89, 1.78, 2.67],
      amplitudeDecayEnvelope: [100.0, 99.5, 99.0, 98.5], // Log dec ~ 0.005, zeta ~ 0.0008
      ambientWindSpeedMPerSec: 22.0
    };

    const report = CableStayVibrationAnalyzer.evaluateStay(stayProps, lightlyDampedTelemetry);

    expect(report.scrutonNumber).toBeLessThan(10.0);
    expect(report.aerodynamicVibrationRisk).toBe('CRITICAL_RAIN_WIND_INSTABILITY');
    expect(report.recommendedIntervention).toContain('MANDATORY INTERVENTION');
  });
});
