import { describe, it, expect } from 'vitest';
import {
  WindPitchBearingFlawDetector,
  PitchBearingSpec,
  UltrasonicEchoScan
} from './wind-pitch-bearing-flaw-detector';

describe('SNAP-72: Wind Turbine Pitch Bearing Ultrasonic Flaw Detector', () => {
  const spec: PitchBearingSpec = {
    turbineId: 'VESTAS-V164-08',
    bladeNumber: 2,
    bearingOuterDiameterMm: 3200,
    caseHardenedDepthMm: 5.0,
    peakHertzianShearDepthMm: 2.4 // Max shear stress at 2.4mm
  };

  it('verifies defect-free bearing raceway with low acoustic echo', () => {
    // Very faint echo (-20 dB)
    const scan: UltrasonicEchoScan = {
      probeAngleDegrees: 45,
      shearWaveVelocityMPerSec: 3240,
      echoTimeOfFlightMicroseconds: 2.1,
      echoAmplitudePercentFsh: 8.0,
      referenceFbhAmplitudePercentFsh: 80.0 // 8 / 80 = 0.1 -> -20 dB
    };

    const report = WindPitchBearingFlawDetector.evaluateFlaw(spec, scan);

    expect(report.decibelsRelativeToFbh).toBeLessThan(-15.0);
    expect(report.racewayDefectSeverity).toBe('ACCEPTABLE_BASELINE');
    expect(report.operationalAction).toContain('normal metallurgical baseline');
  });

  it('detects critical sub-surface fatigue spalling in peak shear zone', () => {
    // Echo at t = 2.1 microseconds -> sound path = 3240 * 2.1e-6 / 2 = 3.402 mm
    // Depth = 3.402 * cos(45 deg) = 2.405 mm -> EXACTLY in peak shear zone (2.4mm)!
    // High amplitude: 75% FSH vs 80% FSH reference -> -0.6 dB (>= -3 dB)
    const criticalScan: UltrasonicEchoScan = {
      probeAngleDegrees: 45,
      shearWaveVelocityMPerSec: 3240,
      echoTimeOfFlightMicroseconds: 2.1,
      echoAmplitudePercentFsh: 75.0,
      referenceFbhAmplitudePercentFsh: 80.0
    };

    const report = WindPitchBearingFlawDetector.evaluateFlaw(spec, criticalScan);

    expect(report.isInPeakShearZone).toBe(true);
    expect(report.flawDepthMm).toBeCloseTo(2.4, 1);
    expect(report.racewayDefectSeverity).toBe('CRITICAL_SPALLING_STRUCTURAL_RISK');
    expect(report.operationalAction).toContain('EMERGENCY: Major sub-surface fatigue spalling crack detected');
  });
});
