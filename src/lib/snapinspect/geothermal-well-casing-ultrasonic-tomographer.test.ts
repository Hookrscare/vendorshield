/**
 * src/lib/snapinspect/geothermal-well-casing-ultrasonic-tomographer.test.ts
 * Vitest tests for SNAP-63: GeothermalWellCasingUltrasonicTomographer.
 */

import { describe, it, expect } from 'vitest';
import {
  GeothermalWellCasingUltrasonicTomographer,
  WellCasingSpecification,
  UltrasonicTransducerMeasurement
} from './geothermal-well-casing-ultrasonic-tomographer';

describe('SNAP-63: GeothermalWellCasingUltrasonicTomographer', () => {
  const tomographer = new GeothermalWellCasingUltrasonicTomographer();

  const mockCasing: WellCasingSpecification = {
    wellId: 'GEO-WELL-KRAFLA-09',
    nominalOuterDiameterMm: 244.5, // 9-5/8 inch
    nominalWallThicknessMm: 11.99, // 40 lb/ft L80
    steelGradeYieldStrengthMpa: 552, // L80 grade
    wellDepthMeters: 2150,
  };

  it('correctly models temperature acoustic derating in high-temperature casing steel', () => {
    const vCold = tomographer.calculateSteelAcousticVelocity(20);
    const vHot = tomographer.calculateSteelAcousticVelocity(220);

    expect(vCold).toBe(5920);
    expect(vHot).toBeLessThan(5800);
    expect(vHot).toBeGreaterThan(5700);
  });

  it('accurately resolves nominal wall thickness and burst pressure in healthy well conditions', () => {
    // Healthy echo interval: ~4.15 microsec at 200°C gives ~11.99 mm
    // v_steel(200°C) = 5920 - 0.75 * 180 = 5785 m/s
    // dt = (2 * 0.01199) / 5785 = ~4.145e-6 s = 4.145 microsec
    const measurements: UltrasonicTransducerMeasurement[] = [
      { azimuthAngleDeg: 0, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
      { azimuthAngleDeg: 90, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
      { azimuthAngleDeg: 180, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
      { azimuthAngleDeg: 270, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
    ];

    const result = tomographer.analyzeCasingCrossSection(mockCasing, measurements);

    expect(result.integrityStatus).toBe('OPTIMAL');
    expect(result.averageWallThicknessMm).toBeCloseTo(11.99, 1);
    expect(result.maximumWallLossPercent).toBeLessThan(2.0);
    expect(result.burstDeratingFactor).toBeGreaterThan(0.95);
    expect(result.evidenceSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('flags severe localized pitting and derated burst pressure under corrosive brine attack', () => {
    // 3 transducers normal, 1 transducer severely pitted (dt = 2.0 microsec -> ~5.78 mm)
    const measurements: UltrasonicTransducerMeasurement[] = [
      { azimuthAngleDeg: 0, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
      { azimuthAngleDeg: 90, fluidTravelTimeMicrosec: 17.0, steelEchoIntervalMicrosec: 2.100, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 }, // Pitting!
      { azimuthAngleDeg: 180, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
      { azimuthAngleDeg: 270, fluidTravelTimeMicrosec: 15.0, steelEchoIntervalMicrosec: 4.145, downholeTemperatureCelsius: 200, brineSalinityPpm: 25000 },
    ];

    const result = tomographer.analyzeCasingCrossSection(mockCasing, measurements);

    expect(result.pittingAnomaliesDetected).toBe(1);
    expect(result.maximumWallLossPercent).toBeGreaterThan(45.0);
    expect(result.integrityStatus).toBe('IMMINENT_BURST_FAILURE');
    expect(result.burstDeratingFactor).toBeLessThan(0.60);
  });
});
