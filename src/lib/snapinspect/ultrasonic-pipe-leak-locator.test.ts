import { describe, it, expect } from 'vitest';
import {
  UltrasonicPipeLeakLocator,
  PipeMaterial,
  SPEED_OF_SOUND_MPS,
  UltrasonicAcousticTelemetry
} from './ultrasonic-pipe-leak-locator';

describe('UltrasonicPipeLeakLocator', () => {
  it('accurately calculates leak location at midpoint when dt is 0', () => {
    const telemetry: UltrasonicAcousticTelemetry = {
      sensor1Id: 'node-A',
      sensor2Id: 'node-B',
      sensorDistanceMeters: 50.0,
      material: PipeMaterial.COPPER,
      crossCorrelationDelaySeconds: 0.0,
      correlationPeakCoeff: 0.95,
      snrDb: 35.0,
      sensor1AmplitudeDb: 48.0,
      sensor2AmplitudeDb: 48.0,
      pipePressurePsi: 60.0,
      ultrasonicCenterFreqKhz: 40.0
    };

    const estimate = UltrasonicPipeLeakLocator.locateLeak(telemetry);
    expect(estimate.leakDistanceFromSensor1Meters).toBe(25.0);
    expect(estimate.leakDistanceFromSensor2Meters).toBe(25.0);
    expect(estimate.isWithinSpan).toBe(true);
    expect(estimate.confidenceScore).toBeGreaterThan(0.85);
    expect(estimate.severity).toBe('SEVERE');
    expect(estimate.auditHash).toHaveLength(8);
  });

  it('calculates offset leak location closer to sensor 1 when sensor 1 receives signal first', () => {
    const distance = 100.0;
    const material = PipeMaterial.STEEL;
    const c = SPEED_OF_SOUND_MPS[material]; // 5000 m/s
    // Leak is at 30m from sensor 1 and 70m from sensor 2.
    // TDOA delay dt = t1 - t2 = 30/5000 - 70/5000 = -0.008s
    const dt = -0.008;

    const telemetry: UltrasonicAcousticTelemetry = {
      sensor1Id: 'flow-s1',
      sensor2Id: 'flow-s2',
      sensorDistanceMeters: distance,
      material,
      crossCorrelationDelaySeconds: dt,
      correlationPeakCoeff: 0.92,
      snrDb: 28.0,
      sensor1AmplitudeDb: 72.0,
      sensor2AmplitudeDb: 58.0,
      pipePressurePsi: 75.0,
      ultrasonicCenterFreqKhz: 40.0
    };

    const estimate = UltrasonicPipeLeakLocator.locateLeak(telemetry);
    expect(estimate.leakDistanceFromSensor1Meters).toBe(30.0);
    expect(estimate.leakDistanceFromSensor2Meters).toBe(70.0);
    expect(estimate.isWithinSpan).toBe(true);
    expect(estimate.severity).toBe('CATASTROPHIC');
    expect(estimate.estimatedFlowRateLpm).toBeGreaterThan(30.0);
  });

  it('flags out-of-span delay when leak is located beyond sensor 2', () => {
    const telemetry: UltrasonicAcousticTelemetry = {
      sensor1Id: 'node-1',
      sensor2Id: 'node-2',
      sensorDistanceMeters: 20.0,
      material: PipeMaterial.PVC, // 2300 m/s
      crossCorrelationDelaySeconds: 0.015, // dt positive -> x1 > D (beyond sensor 2)
      correlationPeakCoeff: 0.85,
      snrDb: 18.0,
      sensor1AmplitudeDb: 40.0,
      sensor2AmplitudeDb: 62.0,
      pipePressurePsi: 45.0,
      ultrasonicCenterFreqKhz: 38.0
    };

    const estimate = UltrasonicPipeLeakLocator.locateLeak(telemetry);
    expect(estimate.isWithinSpan).toBe(false);
    expect(estimate.leakDistanceFromSensor1Meters).toBe(27.25);
    expect(estimate.leakDistanceFromSensor2Meters).toBe(-7.25);
  });
});
