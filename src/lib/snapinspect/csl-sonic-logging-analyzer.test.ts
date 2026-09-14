import { describe, it, expect } from 'vitest';
import {
  CslSonicLoggingAnalyzer,
  CslLogSample
} from './csl-sonic-logging-analyzer';

describe('SNAP-83: Cross-Hole Sonic Logging (CSL) Velocity Analyzer', () => {
  it('confirms sound homogeneous drilled shaft concrete integrity', () => {
    // 1.2 meters, FAT 300 µs -> velocity = 4000 m/s
    const sample: CslLogSample = {
      shaftId: 'pier_shaft_14B',
      tubePair: 'T1-T2',
      tubeSpacingMeters: 1.2,
      firstArrivalTimeMicroseconds: 300,
      signalEnergyDb: 89.0,
      baselineVelocityMps: 4000,
      baselineEnergyDb: 90.0
    };

    const res = CslSonicLoggingAnalyzer.analyzeLog(sample);

    expect(res.status).toBe('DRILLED_SHAFT_INTEGRITY_SOUND');
    expect(res.isAcceptable).toBe(true);
    expect(res.measuredVelocityMps).toBe(4000);
    expect(res.velocityReductionPercent).toBe(0.0);
  });

  it('detects moderate defect honeycombing with 15% velocity drop', () => {
    // 1.2 meters, FAT 353 µs -> velocity = 3399 m/s (15% drop from 4000)
    const sample: CslLogSample = {
      shaftId: 'pier_shaft_14B',
      tubePair: 'T2-T3',
      tubeSpacingMeters: 1.2,
      firstArrivalTimeMicroseconds: 353,
      signalEnergyDb: 83.0,
      baselineVelocityMps: 4000,
      baselineEnergyDb: 90.0
    };

    const res = CslSonicLoggingAnalyzer.analyzeLog(sample);

    expect(res.status).toBe('ANOMALY_MODERATE_CONCRETE_DEFECT');
    expect(res.isAcceptable).toBe(true);
    expect(res.velocityReductionPercent).toBeCloseTo(15.0, 0);
  });

  it('flags critical void / soil necking flaw with >25% velocity drop & heavy attenuation', () => {
    // 1.2 meters, FAT 450 µs -> velocity = 2667 m/s (33% drop), energy drop 15 dB
    const sample: CslLogSample = {
      shaftId: 'pier_shaft_14B',
      tubePair: 'T3-T4',
      tubeSpacingMeters: 1.2,
      firstArrivalTimeMicroseconds: 450,
      signalEnergyDb: 75.0,
      baselineVelocityMps: 4000,
      baselineEnergyDb: 90.0
    };

    const res = CslSonicLoggingAnalyzer.analyzeLog(sample);

    expect(res.status).toBe('CRITICAL_SHAFT_VOID_FLAW_DETECTED');
    expect(res.isAcceptable).toBe(false);
    expect(res.geotechnicalNotes).toContain('CRITICAL FLAW (ASTM D6760)');
  });
});
