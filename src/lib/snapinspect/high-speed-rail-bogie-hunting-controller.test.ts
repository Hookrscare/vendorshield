import { describe, it, expect } from 'vitest';
import {
  HighSpeedRailBogieHuntingController,
  BogieTelemetryFrame
} from './high-speed-rail-bogie-hunting-controller';

describe('SNAP-78: HighSpeedRailBogieHuntingController', () => {
  const controller = new HighSpeedRailBogieHuntingController(0.46, 0.7175, 35.0);

  it('calculates Klingel kinematic hunting frequency accurately', () => {
    // At 300 km/h (83.33 m/s) with 0.15 conicity, r0=0.46, b=0.7175
    // factor = sqrt(0.15 / (0.46 * 0.7175)) = sqrt(0.15 / 0.33005) = sqrt(0.454476) = 0.674148
    // f_h = (83.333 / (2 * pi)) * 0.674148 = 13.2629 * 0.674148 = 8.94 Hz
    const freq = controller.computeKlingelFrequency(300, 0.15);
    expect(freq).toBeGreaterThan(8.5);
    expect(freq).toBeLessThan(9.5);
  });

  it('evaluates stable bogie run within EN 14363 limits', () => {
    const frames: BogieTelemetryFrame[] = [
      { timestampMs: 100, vehicleSpeedKmh: 300, lateralAccelerationG: 0.05, yawRateRadPerSec: 0.01, lateralWheelForceKn: 10, verticalWheelForceKn: 70 },
      { timestampMs: 200, vehicleSpeedKmh: 300, lateralAccelerationG: -0.06, yawRateRadPerSec: -0.012, lateralWheelForceKn: 12, verticalWheelForceKn: 70 },
      { timestampMs: 300, vehicleSpeedKmh: 300, lateralAccelerationG: 0.08, yawRateRadPerSec: 0.015, lateralWheelForceKn: 14, verticalWheelForceKn: 70 }
    ];

    const res = controller.analyzeBogieDynamics(frames);
    expect(res.stabilityStatus).toBe('STABLE');
    expect(res.peakLateralAccelerationG).toBe(0.08);
    expect(res.nadalDerailmentRatio).toBe(0.2); // 14 / 70 = 0.2
    expect(res.safetyAlerts[0]).toContain('verified');
  });

  it('detects critical hunting oscillation limit cycle and commands active damping force', () => {
    const criticalFrames: BogieTelemetryFrame[] = [
      { timestampMs: 100, vehicleSpeedKmh: 320, lateralAccelerationG: 0.45, yawRateRadPerSec: 0.08, lateralWheelForceKn: 30, verticalWheelForceKn: 65 },
      { timestampMs: 200, vehicleSpeedKmh: 320, lateralAccelerationG: -0.85, yawRateRadPerSec: -0.15, lateralWheelForceKn: 55, verticalWheelForceKn: 65 },
      { timestampMs: 300, vehicleSpeedKmh: 320, lateralAccelerationG: 0.92, yawRateRadPerSec: 0.16, lateralWheelForceKn: 58, verticalWheelForceKn: 65 }
    ];

    const res = controller.analyzeBogieDynamics(criticalFrames);
    expect(res.stabilityStatus).toBe('CRITICAL_HUNTING_LIMIT_CYCLE');
    expect(res.peakLateralAccelerationG).toBe(0.92);
    expect(res.nadalDerailmentRatio).toBeGreaterThanOrEqual(0.85); // 58/65 = 0.892
    expect(res.safetyAlerts.some(a => a.includes('EN 14363 limit'))).toBe(true);
    expect(res.safetyAlerts.some(a => a.includes('Nadal derailment quotient'))).toBe(true);
    expect(res.activeDampingForceKn).toBeGreaterThan(20.0);
    expect(res.damperSolenoidCurrentMa).toBeGreaterThan(700);
  });
});
