import { describe, it, expect } from 'vitest';
import {
  BridgeTendonAcousticEmissionLocalizer,
  AeSensorHit,
  TendonWireBreakEvent,
} from './bridge-tendon-acoustic-emission-localizer';

describe('SNAP-62: Prestressed Concrete Bridge Tendon Acoustic Emission Wire-Break Localizer', () => {
  it('should accurately localize wire break location using 1D TDoA', () => {
    // Sensor 1 at x = 0m, Sensor 2 at x = 50m
    // Event at x = 20m.
    // Distance to Sensor 1 = 20m, Distance to Sensor 2 = 30m.
    // Wave speed v = 5000 m/s.
    // t1 = 20 / 5000 = 0.004s, t2 = 30 / 5000 = 0.006s.
    // deltaT = 0.002s.
    const hits: AeSensorHit[] = [
      {
        sensorId: 'AE-01',
        sensorPositionMeters: 0.0,
        arrivalTimestampSeconds: 1000.004,
        peakAmplitudeDb: 82.0,
        riseTimeMicroseconds: 12.0,
        energyMarseCounts: 850,
        durationMicroseconds: 350,
      },
      {
        sensorId: 'AE-02',
        sensorPositionMeters: 50.0,
        arrivalTimestampSeconds: 1000.006,
        peakAmplitudeDb: 79.0,
        riseTimeMicroseconds: 16.0,
        energyMarseCounts: 620,
        durationMicroseconds: 400,
      },
    ];

    const event = BridgeTendonAcousticEmissionLocalizer.localizeEvent(
      'DUCT-NORTH-GIRDER-04',
      hits,
      5000.0
    );

    expect(event.isConfirmedWireBreak).toBe(true);
    expect(event.estimatedLocationMeters).toBeCloseTo(20.0, 1);
    expect(event.classificationReason).toContain('snap transient');
  });

  it('should reject ambient fretting or traffic noise due to slow rise time or low amplitude', () => {
    const hits: AeSensorHit[] = [
      {
        sensorId: 'AE-01',
        sensorPositionMeters: 0.0,
        arrivalTimestampSeconds: 100.001,
        peakAmplitudeDb: 58.0, // < 70 dB
        riseTimeMicroseconds: 65.0, // > 30 us
        energyMarseCounts: 120,
        durationMicroseconds: 800,
      },
      {
        sensorId: 'AE-02',
        sensorPositionMeters: 40.0,
        arrivalTimestampSeconds: 100.005,
        peakAmplitudeDb: 54.0,
        riseTimeMicroseconds: 80.0,
        energyMarseCounts: 90,
        durationMicroseconds: 950,
      },
    ];

    const event = BridgeTendonAcousticEmissionLocalizer.localizeEvent(
      'DUCT-SOUTH-GIRDER-02',
      hits
    );

    expect(event.isConfirmedWireBreak).toBe(false);
    expect(event.classificationReason).toContain('Sub-threshold amplitude');
  });

  it('should model cumulative prestress loss and trigger critical inspection when threshold is exceeded', () => {
    // 19 strands * 7 wires = 133 wires total
    const events: TendonWireBreakEvent[] = Array.from({ length: 8 }).map((_, i) => ({
      eventId: `EVT-${i}`,
      tendonDuctId: 'DUCT-MAIN-01',
      estimatedLocationMeters: 25.4 + i * 0.2,
      hitCount: 2,
      isConfirmedWireBreak: true,
      classificationReason: 'Brittle wire snap',
      stressWaveSpeedMetersPerSec: 5050,
    }));

    // Add 2 non-confirmed events
    events.push({
      eventId: 'EVT-TRAFFIC-1',
      tendonDuctId: 'DUCT-MAIN-01',
      estimatedLocationMeters: 10.0,
      hitCount: 2,
      isConfirmedWireBreak: false,
      classificationReason: 'Traffic vibration',
      stressWaveSpeedMetersPerSec: 5050,
    });

    const report = BridgeTendonAcousticEmissionLocalizer.evaluateTendonHealth(
      'DUCT-MAIN-01',
      19, // 19 strands
      7,
      events
    );

    expect(report.totalInitialWires).toBe(133);
    expect(report.confirmedBreaksCount).toBe(8);
    // 8 / 133 * 100 = 6.02% (>= 5.0% threshold)
    expect(report.prestressLossPercentage).toBeGreaterThanOrEqual(5.0);
    expect(report.safetyStatus).toBe('CRITICAL_INSPECTION_REQUIRED');
    expect(report.recommendations[0]).toContain('Immediate structural load restriction');
  });
});
