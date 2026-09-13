/**
 * src/lib/snapinspect/subsea-xmas-tree-valve-leak-acoustic-detector.test.ts
 * Unit tests for SNAP-84 Deepwater Subsea Christmas Tree Valve Actuator Hydraulic Leak Acoustic Detector.
 */

import { describe, it, expect } from 'vitest';
import {
  SubseaXmasTreeValveLeakAcousticDetector,
  XmasTreeAcousticTelemetry
} from './subsea-xmas-tree-valve-leak-acoustic-detector';

describe('SubseaXmasTreeValveLeakAcousticDetector (SNAP-84)', () => {
  const detector = new SubseaXmasTreeValveLeakAcousticDetector();

  it('validates sound integrity with zero leaks on quiet background noise', () => {
    const telemetry: XmasTreeAcousticTelemetry = {
      treeId: 'XT-GOM-104',
      valveTag: 'PMV',
      waterDepthMeters: 1850,
      differentialPressurePsi: 5000,
      ambientNoiseFloorDb: 42.0,
      ultrasonicSpectrum: [
        { frequencyKhz: 20, soundPressureLevelDb: 44.0 },
        { frequencyKhz: 40, soundPressureLevelDb: 43.5 },
        { frequencyKhz: 60, soundPressureLevelDb: 41.0 }
      ]
    };

    const res = detector.evaluateValveAcoustics(telemetry);
    expect(res.isLeakDetected).toBe(false);
    expect(res.leakSeverityTier).toBe('INTEGRITY_VERIFIED');
    expect(res.estimatedLeakRateMlPerMin).toBe(0.0);
    expect(res.telemetryDigestSha256).toHaveLength(64);
  });

  it('detects moderate ultrasonic leak jetting on wing valve', () => {
    const telemetry: XmasTreeAcousticTelemetry = {
      treeId: 'XT-NORTHSEA-08',
      valveTag: 'PWV',
      waterDepthMeters: 320,
      differentialPressurePsi: 3500,
      ambientNoiseFloorDb: 45.0,
      ultrasonicSpectrum: [
        { frequencyKhz: 20, soundPressureLevelDb: 48.0 },
        { frequencyKhz: 55, soundPressureLevelDb: 72.0 }, // Peak at 55 kHz, SNR = 27 dB
        { frequencyKhz: 80, soundPressureLevelDb: 60.0 }
      ]
    };

    const res = detector.evaluateValveAcoustics(telemetry);
    expect(res.isLeakDetected).toBe(true);
    expect(res.peakUltrasonicFrequencyKhz).toBe(55);
    expect(res.leakSeverityTier).toBe('MODERATE_HYDRAULIC_BYPASS');
    expect(res.estimatedLeakRateMlPerMin).toBeGreaterThan(50.0);
  });

  it('triggers critical blow-by alert on massive high-pressure seal failure', () => {
    const telemetry: XmasTreeAcousticTelemetry = {
      treeId: 'XT-SANTOS-BASIN-22',
      valveTag: 'CIV',
      waterDepthMeters: 2200,
      differentialPressurePsi: 8500,
      ambientNoiseFloorDb: 48.0,
      ultrasonicSpectrum: [
        { frequencyKhz: 45, soundPressureLevelDb: 95.0 } // SNR = 47 dB
      ]
    };

    const res = detector.evaluateValveAcoustics(telemetry);
    expect(res.isLeakDetected).toBe(true);
    expect(res.leakSeverityTier).toBe('CRITICAL_BLOW_BY');
    expect(res.estimatedLeakRateMlPerMin).toBeGreaterThan(500.0);
  });

  it('rejects negative differential pressure inputs', () => {
    const invalidTelemetry: XmasTreeAcousticTelemetry = {
      treeId: 'XT-ERR',
      valveTag: 'PMV',
      waterDepthMeters: 100,
      differentialPressurePsi: -50,
      ambientNoiseFloorDb: 40,
      ultrasonicSpectrum: []
    };
    expect(() => detector.evaluateValveAcoustics(invalidTelemetry)).toThrow('cannot be negative');
  });
});
