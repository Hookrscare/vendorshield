import { describe, it, expect } from 'vitest';
import {
  ConcreteSlabMoistureProfiler,
  MoistureProbeReading,
  FlooringSpecification
} from './concrete-slab-moisture-profiler';

describe('SNAP-31: ConcreteSlabMoistureProfiler', () => {
  const spec: FlooringSpecification = {
    maxAllowableRHPercent: 80.0,
    maxAllowableMVER: 4.0,
    coatingType: 'High-Performance Commercial Epoxy'
  };

  it('verifies compliant slab under 40% depth ASTM F2170 single-sided drying', () => {
    // 6-inch slab drying from one side -> target depth is 6 * 0.40 = 2.40 inches
    const probes: MoistureProbeReading[] = [
      {
        sensorId: 'PROBE-NW-01',
        depthInches: 2.4,
        totalThicknessInches: 6.0,
        relativeHumidityPercent: 72.5,
        temperatureCelsius: 21.0,
        acclimationHours: 48
      },
      {
        sensorId: 'PROBE-SE-02',
        depthInches: 2.4,
        totalThicknessInches: 6.0,
        relativeHumidityPercent: 74.0,
        temperatureCelsius: 21.5,
        acclimationHours: 72
      }
    ];

    const report = ConcreteSlabMoistureProfiler.analyzeSlab('INSP-SLAB-101', 'ONE_SIDE', probes, spec);
    expect(report.allProbesCompliant).toBe(true);
    expect(report.dominantRiskClassification).toBe('OPTIMAL_CURED');
    expect(report.meanRHPercent).toBe(73.3);
    expect(report.cryptographicVerificationHash).toHaveLength(64);
    expect(report.sensorAnalyses[0].standardDepthCompliance).toBe(true);
    expect(report.sensorAnalyses[0].targetDepthInches).toBe(2.4);
  });

  it('detects elevated vapor emissions and non-compliant probe depth', () => {
    const probes: MoistureProbeReading[] = [
      {
        sensorId: 'PROBE-SHALLOW-01',
        depthInches: 1.0, // Should be 2.4 inches
        totalThicknessInches: 6.0,
        relativeHumidityPercent: 82.0, // Exceeds 80% spec
        temperatureCelsius: 20.0,
        acclimationHours: 24
      }
    ];

    const report = ConcreteSlabMoistureProfiler.analyzeSlab('INSP-SLAB-102', 'ONE_SIDE', probes, spec);
    expect(report.allProbesCompliant).toBe(false);
    expect(report.sensorAnalyses[0].standardDepthCompliance).toBe(false);
    expect(report.dominantRiskClassification).toBe('ELEVATED_VAPOR_EMISSION');
  });

  it('detects condensation imminent when surface temp is near dew point', () => {
    const probes: MoistureProbeReading[] = [
      {
        sensorId: 'PROBE-DAMP-01',
        depthInches: 1.6, // 8 * 0.20 for two sides
        totalThicknessInches: 8.0,
        relativeHumidityPercent: 96.0,
        temperatureCelsius: 15.0,
        acclimationHours: 48
      }
    ];

    const report = ConcreteSlabMoistureProfiler.analyzeSlab('INSP-SLAB-103', 'TWO_SIDES', probes, spec);
    expect(report.allProbesCompliant).toBe(false);
    expect(report.dominantRiskClassification).toBe('CONDENSATION_IMMINENT');
  });
});
