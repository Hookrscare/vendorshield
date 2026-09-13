import { describe, it, expect } from 'vitest';
import {
  BentoniteBufferSwellingPressureTomographer,
  BentoniteBufferSpec,
  TomographicSensorMeasurement,
} from './bentonite-buffer-swelling-pressure-tomographer';

describe('SNAP-71: BentoniteBufferSwellingPressureTomographer Tests', () => {
  const tomographer = new BentoniteBufferSwellingPressureTomographer();

  const standardSpec: BentoniteBufferSpec = {
    canisterId: 'KBS3-CU-SKB-0492',
    depositionHoleId: 'HOLE-FORSMARK-DA-18',
    bufferMaterial: 'MX_80_SODIUM_BENTONITE',
    targetDryDensityKgM3: 1600.0,
    minSafeSwellingPressureMpa: 5.0,
    maxAllowableSwellingPressureMpa: 15.0,
  };

  it('certifies healthy, fully saturated, axisymmetric bentonite buffer barrier', () => {
    const sensors: TomographicSensorMeasurement[] = [
      {
        sensorId: 'P-01-N',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 0,
        elevationMeters: 2.5,
        measuredSwellingPressureMpa: 7.8,
        waterContentPercent: 43.0,
        electricalResistivityOhmM: 4.8,
      },
      {
        sensorId: 'P-02-E',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 90,
        elevationMeters: 2.5,
        measuredSwellingPressureMpa: 8.2,
        waterContentPercent: 43.5,
        electricalResistivityOhmM: 4.6,
      },
      {
        sensorId: 'P-03-S',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 180,
        elevationMeters: 2.5,
        measuredSwellingPressureMpa: 8.0,
        waterContentPercent: 43.0,
        electricalResistivityOhmM: 4.7,
      },
      {
        sensorId: 'P-04-W',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 270,
        elevationMeters: 2.5,
        measuredSwellingPressureMpa: 7.9,
        waterContentPercent: 43.2,
        electricalResistivityOhmM: 4.9,
      },
    ];

    const res = tomographer.analyzeTomography(standardSpec, sensors);

    expect(res.isBufferBarrierCertified).toBe(true);
    expect(res.totalAnomaliesDetected).toBe(0);
    expect(res.meanSwellingPressureMpa).toBeCloseTo(8.0, 1);
    expect(res.swellingPressureAsymmetryRatio).toBeLessThan(1.5);
    expect(res.meanDegreeOfSaturationPercent).toBeGreaterThan(90.0);
    expect(res.cryptographicAuditDigest).toHaveLength(64);
  });

  it('detects groundwater erosion piping channel and under-pressure zones', () => {
    const degradedSensors: TomographicSensorMeasurement[] = [
      {
        sensorId: 'P-01-N',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 0,
        elevationMeters: 1.5,
        measuredSwellingPressureMpa: 2.1, // Deficient swelling pressure
        waterContentPercent: 32.0, // Water washed out
        electricalResistivityOhmM: 0.9, // Low resistivity piping channel
      },
      {
        sensorId: 'P-02-S',
        radialDistanceMeters: 0.75,
        azimuthAngleDegrees: 180,
        elevationMeters: 1.5,
        measuredSwellingPressureMpa: 11.5,
        waterContentPercent: 21.0,
        electricalResistivityOhmM: 5.2,
      },
    ];

    const res = tomographer.analyzeTomography(standardSpec, degradedSensors);

    expect(res.isBufferBarrierCertified).toBe(false);
    expect(res.anomalies.length).toBeGreaterThanOrEqual(2);
    expect(res.anomalies.some((a) => a.anomalyType === 'EROSION_PIPING_CHANNEL')).toBe(true);
    expect(res.anomalies.some((a) => a.anomalyType === 'INSUFFICIENT_SWELLING_PRESSURE')).toBe(true);
  });

  it('detects excessive rock overstress exceeding 15 MPa threshold', () => {
    const overstressedSensors: TomographicSensorMeasurement[] = [
      {
        sensorId: 'P-OVER-01',
        radialDistanceMeters: 0.85,
        azimuthAngleDegrees: 45,
        elevationMeters: 4.0,
        measuredSwellingPressureMpa: 17.8, // Exceeds 15 MPa rock cracking limit
        waterContentPercent: 26.0,
        electricalResistivityOhmM: 3.5,
      },
    ];

    const res = tomographer.analyzeTomography(standardSpec, overstressedSensors);

    expect(res.isBufferBarrierCertified).toBe(false);
    expect(res.anomalies.some((a) => a.anomalyType === 'EXCESSIVE_ROCK_OVERSTRESS')).toBe(true);
  });

  it('throws when sensor array is empty', () => {
    expect(() => {
      tomographer.analyzeTomography(standardSpec, []);
    }).toThrow('At least one tomographic sensor measurement is required.');
  });
});
