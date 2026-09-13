/**
 * src/lib/snapinspect/prestressed-tendon-wire-break-localizer.test.ts
 * Unit tests for SNAP-62: Prestressed Concrete Bridge Tendon Acoustic Emission Wire-Break Localizer.
 */

import { describe, it, expect } from 'vitest';
import {
  PrestressedTendonWireBreakLocalizer,
  AeSensor,
  AeWaveformHit,
  WireBreakEvent
} from './prestressed-tendon-wire-break-localizer';

describe('SNAP-62: PrestressedTendonWireBreakLocalizer', () => {
  const sensors: AeSensor[] = [
    { id: 'AE-01', positionMeters: 10.0, sensitivityDbae: 40 },
    { id: 'AE-02', positionMeters: 40.0, sensitivityDbae: 40 }
  ];

  it('accurately localizes wire break event via 1D TDOA stress wave speed in steel', () => {
    // Break occurs at position 20.0m (10m from AE-01, 20m from AE-02).
    // Distance difference = 10m.
    // Time difference = 10m / 5100 m/s = ~0.0019608 s = ~1961 microseconds.
    const t0 = 1000000;
    const dtMicroseconds = Math.round((10.0 / 5100) * 1e6); // 1961 us

    const hits: AeWaveformHit[] = [
      {
        sensorId: 'AE-01',
        arrivalTimestampMicroseconds: t0,
        peakAmplitudeDbae: 78,
        riseTimeMicroseconds: 22,
        durationMicroseconds: 850,
        energyEu: 1250,
        peakFrequencyKhz: 140
      },
      {
        sensorId: 'AE-02',
        arrivalTimestampMicroseconds: t0 + dtMicroseconds,
        peakAmplitudeDbae: 72,
        riseTimeMicroseconds: 35,
        durationMicroseconds: 720,
        energyEu: 980,
        peakFrequencyKhz: 125
      }
    ];

    const result = PrestressedTendonWireBreakLocalizer.localizeBreak(sensors, hits, 'EVT-001');

    expect(result.isConfirmedWireBreak).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.8);
    // Estimated position should be ~20.0m
    expect(result.estimatedPositionMeters).toBeCloseTo(20.0, 1);
    expect(result.notes[0]).toContain('CONFIRMED_WIRE_BREAK');
  });

  it('rejects low-energy or slow-rise ambient vehicular traffic vibrations', () => {
    const hits: AeWaveformHit[] = [
      {
        sensorId: 'AE-01',
        arrivalTimestampMicroseconds: 1000000,
        peakAmplitudeDbae: 52, // Below threshold
        riseTimeMicroseconds: 180, // Slow rise
        durationMicroseconds: 2500,
        energyEu: 80, // Low energy
        peakFrequencyKhz: 25
      },
      {
        sensorId: 'AE-02',
        arrivalTimestampMicroseconds: 1002000,
        peakAmplitudeDbae: 50,
        riseTimeMicroseconds: 210,
        durationMicroseconds: 2200,
        energyEu: 65,
        peakFrequencyKhz: 22
      }
    ];

    const result = PrestressedTendonWireBreakLocalizer.localizeBreak(sensors, hits, 'EVT-002');
    expect(result.isConfirmedWireBreak).toBe(false);
    expect(result.confidenceScore).toBeLessThan(0.7);
  });

  it('computes cumulative strand loss and triggers critical replacement alert when >15% loss', () => {
    // 12-strand tendon * 7 wires = 84 total wires.
    // 13 wire breaks = 13 / 84 = 15.47% loss.
    const events: WireBreakEvent[] = [];
    for (let i = 0; i < 13; i++) {
      events.push({
        eventId: `EVT-${i}`,
        isConfirmedWireBreak: true,
        estimatedPositionMeters: 25.0 + i * 0.2,
        confidenceScore: 0.95,
        releasingEnergyJ: 100,
        participatingSensors: ['AE-01', 'AE-02'],
        notes: []
      });
    }

    const health = PrestressedTendonWireBreakLocalizer.assessTendonIntegrity(
      'TENDON-GIRDER-04',
      12,
      7,
      2600,
      events
    );

    expect(health.totalWires).toBe(84);
    expect(health.detectedWireBreaks).toBe(13);
    expect(health.strandLossPercentage).toBeGreaterThan(15.0);
    expect(health.alertLevel).toBe('CRITICAL_TENDON_REPLACEMENT');
    expect(health.remainingPrestressCapacityKn).toBeLessThan(2210);
  });
});
