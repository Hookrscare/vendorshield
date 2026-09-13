/**
 * src/lib/snapinspect/offshore-monopile-grout-annulus-scanner.test.ts
 * Unit tests for SNAP-74 Offshore Wind Monopile Grout Annulus Ultrasonic Phased Array Scanner.
 */

import { describe, it, expect } from 'vitest';
import {
  OffshoreMonopileGroutAnnulusScanner,
  type GroutAnnulusAcousticEcho
} from './offshore-monopile-grout-annulus-scanner';

describe('OffshoreMonopileGroutAnnulusScanner (SNAP-74)', () => {
  it('identifies integral healthy structural grout bond', () => {
    // 36 scan points around 360 degrees, low reflection amplitude (-18 dB)
    const echoes: GroutAnnulusAcousticEcho[] = Array.from({ length: 36 }, (_, i) => ({
      depthMeters: -12.0,
      azimuthDeg: i * 10,
      echoTransitTimeMicroSec: 42.5,
      reflectedAmplitudeDb: -18.0 - (i % 3),
      frequencyMhz: 2.25
    }));

    const result = OffshoreMonopileGroutAnnulusScanner.evaluateAnnulusScans(echoes);
    expect(result.structuralIntegrityState).toBe('INTEGRAL_STRUCTURAL_BOND');
    expect(result.voidFractionPercent).toBe(0);
    expect(result.remediationRecommended).toBe(false);
    expect(result.tamperProofDigest.length).toBe(64);
  });

  it('detects critical continuous debond arc and recommends remediation', () => {
    // 36 scan points, with a 70-degree continuous debond arc having -4 dB reflections
    const echoes: GroutAnnulusAcousticEcho[] = Array.from({ length: 36 }, (_, i) => {
      const az = i * 10;
      const isSevereDebond = az >= 90 && az <= 160; // 70 degree arc
      return {
        depthMeters: -15.0,
        azimuthDeg: az,
        echoTransitTimeMicroSec: 38.0,
        reflectedAmplitudeDb: isSevereDebond ? -4.5 : -20.0,
        frequencyMhz: 2.25
      };
    });

    const result = OffshoreMonopileGroutAnnulusScanner.evaluateAnnulusScans(echoes);
    expect(result.structuralIntegrityState).toBe('CRITICAL_ANNULUS_FAILURE_RISK');
    expect(result.remediationRecommended).toBe(true);
    expect(result.maxContinuousDebondArcDeg).toBeGreaterThanOrEqual(60.0);
  });

  it('handles empty scan arrays gracefully', () => {
    const result = OffshoreMonopileGroutAnnulusScanner.evaluateAnnulusScans([]);
    expect(result.totalScanPoints).toBe(0);
    expect(result.structuralIntegrityState).toBe('INTEGRAL_STRUCTURAL_BOND');
    expect(result.remediationRecommended).toBe(false);
  });
});
