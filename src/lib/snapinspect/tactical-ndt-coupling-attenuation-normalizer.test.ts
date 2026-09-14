import { describe, it, expect } from 'vitest';
import {
  TacticalNdtCouplingAttenuationNormalizer,
  TransducerCouplingTelemetry,
} from './tactical-ndt-coupling-attenuation-normalizer';

describe('SNAP-143: Tactical NDT Surface Roughness & Coupling Attenuation Normalizer', () => {
  it('correctly normalizes smooth machined steel with standard ultrasonic gel', () => {
    const telemetry: TransducerCouplingTelemetry = {
      transducerId: 'paut-probe-5mhz-01',
      probeCenterFrequencyMhz: 5.0,
      nominalMaterialVelocityMps: 5900,
      measuredSurfaceRoughnessRaMicrons: 3.2,
      couplantType: 'ULTRASONIC_GEL',
      couplantThicknessNominalMm: 0.5,
      rawEchoAmplitudePctFsh: 50.0,
      inspectionDepthMm: 25.0,
    };

    const res = TacticalNdtCouplingAttenuationNormalizer.normalizeCouplingTelemetry(telemetry);

    expect(res.roughnessScatteringLossDb).toBeGreaterThan(0);
    expect(res.couplantAttenuationLossDb).toBeCloseTo(0.25, 2);
    expect(res.couplingQualityGrade).toBe('OPTIMAL');
    expect(res.asmeCompliantInspection).toBe(true);
    expect(res.normalizedAmplitudePctFsh).toBeGreaterThan(50.0);
    expect(res.cadNormalizationToken.length).toBe(64);
  });

  it('detects severe roughness and rejects non-compliant excessive acoustic loss', () => {
    const telemetry: TransducerCouplingTelemetry = {
      transducerId: 'paut-probe-corroded-02',
      probeCenterFrequencyMhz: 10.0, // High frequency scatters severely
      nominalMaterialVelocityMps: 5900,
      measuredSurfaceRoughnessRaMicrons: 150.0, // Heavily pitted / corroded surface
      couplantType: 'DRY_MEMBRANE',
      couplantThicknessNominalMm: 2.0,
      rawEchoAmplitudePctFsh: 20.0,
      inspectionDepthMm: 40.0,
    };

    const res = TacticalNdtCouplingAttenuationNormalizer.normalizeCouplingTelemetry(telemetry);

    expect(res.totalCompensationGainDb).toBeGreaterThan(14.0);
    expect(res.couplingQualityGrade).toBe('POOR_RECOUPLE_REQUIRED');
    expect(res.asmeCompliantInspection).toBe(false);
  });

  it('validates invalid telemetry inputs gracefully', () => {
    const badTelemetry: TransducerCouplingTelemetry = {
      transducerId: 'bad-probe-03',
      probeCenterFrequencyMhz: -5.0, // Invalid negative frequency
      nominalMaterialVelocityMps: 5900,
      measuredSurfaceRoughnessRaMicrons: 3.2,
      couplantType: 'ULTRASONIC_GEL',
      couplantThicknessNominalMm: 0.5,
      rawEchoAmplitudePctFsh: 50.0,
      inspectionDepthMm: 25.0,
    };

    expect(() => {
      TacticalNdtCouplingAttenuationNormalizer.normalizeCouplingTelemetry(badTelemetry);
    }).toThrow('Probe center frequency must be greater than zero.');
  });
});
