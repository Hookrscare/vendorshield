import { describe, it, expect } from 'vitest';
import {
  BentoniteBufferSwellingTomographer,
  EngineeredBarrierProfile,
} from './bentonite-buffer-swelling-tomographer';

describe('BentoniteBufferSwellingTomographer (SNAP-71)', () => {
  it('correctly evaluates an optimal saturated bentonite buffer profile', () => {
    const profile: EngineeredBarrierProfile = {
      canisterId: 'KBS3-CAN-084',
      hostRockFormation: 'CRYSTALLINE_GRANITE',
      targetDryDensityKgM3: 1650,
      installationDateIso: '2026-01-15T00:00:00Z',
      sensorReadings: [
        { sensorId: 'S-01', depthMeters: 2.5, azimuthDegrees: 0, swellingPressureMpa: 7.2, relativeHumidityPercent: 99.5, temperatureCelsius: 65.0 },
        { sensorId: 'S-02', depthMeters: 2.5, azimuthDegrees: 90, swellingPressureMpa: 7.5, relativeHumidityPercent: 99.4, temperatureCelsius: 65.2 },
        { sensorId: 'S-03', depthMeters: 2.5, azimuthDegrees: 180, swellingPressureMpa: 7.1, relativeHumidityPercent: 99.6, temperatureCelsius: 64.9 },
        { sensorId: 'S-04', depthMeters: 2.5, azimuthDegrees: 270, swellingPressureMpa: 7.4, relativeHumidityPercent: 99.5, temperatureCelsius: 65.1 },
      ],
    };

    const assessment = BentoniteBufferSwellingTomographer.analyzeProfile(profile);

    expect(assessment.canisterId).toBe('KBS3-CAN-084');
    expect(assessment.meanSwellingPressureMpa).toBe(7.3);
    expect(assessment.integrityStatus).toBe('OPTIMAL_SEALING');
    expect(assessment.iaeaSsr5Compliant).toBe(true);
    expect(assessment.microbialInhibitionEffective).toBe(true);
    expect(assessment.anisotropyRatio).toBeLessThanOrEqual(1.35);
  });

  it('flags under-consolidated erosion risk when swelling pressure is below 5.0 MPa', () => {
    const profile: EngineeredBarrierProfile = {
      canisterId: 'KBS3-CAN-099',
      hostRockFormation: 'CRYSTALLINE_GRANITE',
      targetDryDensityKgM3: 1600,
      installationDateIso: '2026-03-01T00:00:00Z',
      sensorReadings: [
        { sensorId: 'S-01', depthMeters: 1.0, azimuthDegrees: 0, swellingPressureMpa: 3.2, relativeHumidityPercent: 70.0, temperatureCelsius: 55.0 },
        { sensorId: 'S-02', depthMeters: 1.0, azimuthDegrees: 90, swellingPressureMpa: 3.5, relativeHumidityPercent: 72.0, temperatureCelsius: 55.0 },
      ],
    };

    const assessment = BentoniteBufferSwellingTomographer.analyzeProfile(profile);

    expect(assessment.meanSwellingPressureMpa).toBe(3.35);
    expect(assessment.integrityStatus).toBe('UNDER_CONSOLIDATED_EROSION_RISK');
    expect(assessment.iaeaSsr5Compliant).toBe(false);
    expect(assessment.microbialInhibitionEffective).toBe(false);
  });

  it('detects asymmetric shear anisotropy when radial pressure is imbalanced', () => {
    const profile: EngineeredBarrierProfile = {
      canisterId: 'KBS3-CAN-105',
      hostRockFormation: 'OPALINUS_CLAY',
      targetDryDensityKgM3: 1700,
      installationDateIso: '2026-02-10T00:00:00Z',
      sensorReadings: [
        { sensorId: 'S-01', depthMeters: 3.0, azimuthDegrees: 0, swellingPressureMpa: 9.8, relativeHumidityPercent: 98.0, temperatureCelsius: 60.0 },
        { sensorId: 'S-02', depthMeters: 3.0, azimuthDegrees: 180, swellingPressureMpa: 5.5, relativeHumidityPercent: 95.0, temperatureCelsius: 58.0 },
      ],
    };

    const assessment = BentoniteBufferSwellingTomographer.analyzeProfile(profile);

    expect(assessment.integrityStatus).toBe('ASYMMETRIC_SHEAR_ANISOTROPY');
    expect(assessment.anisotropyRatio).toBeGreaterThan(1.35);
    expect(assessment.iaeaSsr5Compliant).toBe(false);
  });
});
