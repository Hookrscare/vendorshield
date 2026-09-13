/**
 * src/lib/snapinspect/fpso-turret-bearing-acoustic-monitor.test.ts
 * Unit tests for SNAP-85 Offshore FPSO Turret Mooring Bearing Hydrodynamic Acoustic Emission Monitor.
 */

import { describe, it, expect } from 'vitest';
import {
  FpsoTurretBearingAcousticMonitor,
  BearingAcousticWaveformMetrics
} from './fpso-turret-bearing-acoustic-monitor';

describe('FpsoTurretBearingAcousticMonitor (SNAP-85)', () => {
  const monitor = new FpsoTurretBearingAcousticMonitor();

  it('verifies healthy baseline bearing with normal hydrodynamic lubrication film', () => {
    const metrics: BearingAcousticWaveformMetrics = {
      bearingId: 'BRG-FPSO-ANNA-NERY-01',
      sensorLocation: 'INNER_RACE',
      significantWaveHeightMeters: 2.5,
      turretYawRateDegPerSec: 0.8,
      peakAmplitudeDbae: 46.0,
      rootMeanSquareVoltageMv: 0.15,
      ringdownCounts: 45,
      energyCountsEua: 850,
      peakFrequencyKhz: 145
    };

    const res = monitor.evaluateBearing(metrics);
    expect(res.healthTier).toBe('NORMAL_LUBRICATION');
    expect(res.isSafeForContinuedOperations).toBe(true);
    expect(res.damageIndex).toBeLessThan(0.25);
    expect(res.diagnosticDigestSha256).toHaveLength(64);
  });

  it('detects raceway spalling warning under storm wave yaw loads', () => {
    const metrics: BearingAcousticWaveformMetrics = {
      bearingId: 'BRG-FPSO-BACALHAU-02',
      sensorLocation: 'OUTER_RACE',
      significantWaveHeightMeters: 6.8,
      turretYawRateDegPerSec: 3.2,
      peakAmplitudeDbae: 76.0,
      rootMeanSquareVoltageMv: 2.8,
      ringdownCounts: 1100,
      energyCountsEua: 28000,
      peakFrequencyKhz: 210
    };

    const res = monitor.evaluateBearing(metrics);
    expect(res.healthTier).toBe('RACEWAY_SPALLING_WARNING');
    expect(res.isSafeForContinuedOperations).toBe(true);
    expect(res.damageIndex).toBeGreaterThanOrEqual(0.50);
  });

  it('triggers critical emergency shutdown on catastrophic roller cage fracture risk', () => {
    const metrics: BearingAcousticWaveformMetrics = {
      bearingId: 'BRG-FPSO-NORTH-SEA-09',
      sensorLocation: 'ROLLER_CAGE',
      significantWaveHeightMeters: 9.5,
      turretYawRateDegPerSec: 4.8,
      peakAmplitudeDbae: 94.0,
      rootMeanSquareVoltageMv: 15.0,
      ringdownCounts: 3500,
      energyCountsEua: 75000,
      peakFrequencyKhz: 290
    };

    const res = monitor.evaluateBearing(metrics);
    expect(res.healthTier).toBe('CRITICAL_ROLLER_FAILURE_RISK');
    expect(res.isSafeForContinuedOperations).toBe(false);
  });

  it('rejects invalid negative inputs', () => {
    const invalid: BearingAcousticWaveformMetrics = {
      bearingId: 'BRG-ERR',
      sensorLocation: 'INNER_RACE',
      significantWaveHeightMeters: -1.0,
      turretYawRateDegPerSec: 0.5,
      peakAmplitudeDbae: 50,
      rootMeanSquareVoltageMv: 0.5,
      ringdownCounts: 10,
      energyCountsEua: 100,
      peakFrequencyKhz: 100
    };
    expect(() => monitor.evaluateBearing(invalid)).toThrow('cannot be negative');
  });
});
