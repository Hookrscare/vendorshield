import { describe, it, expect } from 'vitest';
import {
  PostTensionAcousticEmissionSensor,
  AeWaveformHit
} from './post-tension-acoustic-emission-sensor';

describe('SNAP-84: Post-Tensioned Anchorage Acoustic Emission Sensor', () => {
  it('detects critical wedge slip shear failure and commands emergency halt', () => {
    // 88 dB amplitude, long rise time 250 µs, long duration, low ringdown frequency (30 kHz)
    const hit: AeWaveformHit = {
      tendonId: 'tendon_pier_3_south',
      peakAmplitudeDb: 88,
      riseTimeMicroseconds: 250,
      durationMicroseconds: 1000,
      ringdownCounts: 30
    };

    const res = PostTensionAcousticEmissionSensor.analyzeHit(hit);

    expect(res.status).toBe('CRITICAL_ANCHOR_WEDGE_SLIP_FAILURE');
    expect(res.isSafeToContinueJacking).toBe(false);
    expect(res.structuralNotes).toContain('HALT JACKING');
  });

  it('monitors acceptable tensile microcracking during hydraulic tendon stressing', () => {
    // 68 dB amplitude, fast rise time 5 µs, high ringdown frequency (150 kHz)
    const hit: AeWaveformHit = {
      tendonId: 'tendon_span_4A',
      peakAmplitudeDb: 68,
      riseTimeMicroseconds: 5,
      durationMicroseconds: 500,
      ringdownCounts: 75
    };

    const res = PostTensionAcousticEmissionSensor.analyzeHit(hit);

    expect(res.status).toBe('TENSILE_MICROCRACKING_MONITORED');
    expect(res.isSafeToContinueJacking).toBe(true);
    expect(res.averageFrequencyKhz).toBe(150);
  });

  it('reports nominal elastic tension during normal load hold', () => {
    const hit: AeWaveformHit = {
      tendonId: 'tendon_span_4A',
      peakAmplitudeDb: 45,
      riseTimeMicroseconds: 10,
      durationMicroseconds: 100,
      ringdownCounts: 5
    };

    const res = PostTensionAcousticEmissionSensor.analyzeHit(hit);

    expect(res.status).toBe('ANCHORAGE_ELASTIC_TENSION_NOMINAL');
    expect(res.isSafeToContinueJacking).toBe(true);
  });
});
