import { describe, it, expect } from 'vitest';
import {
  SlurryTrenchVerticalityProfiler,
  UltrasonicDepthEcho,
  SlurryProperties,
} from './slurry-trench-verticality-profiler';

describe('SNAP-60: SlurryTrenchVerticalityProfiler Tests', () => {
  const profiler = new SlurryTrenchVerticalityProfiler();

  const slurryProps: SlurryProperties = {
    acousticVelocityMetersPerSecond: 1500.0,
    designThicknessMeters: 1.0, // 1000 mm design panel thickness
    maxAllowedVerticalityDeviationPct: 0.33, // 1:300 specification
  };

  it('profiles a compliant deep trench with minimal vertical inclination', () => {
    // Probe centered in 1.0m trench: 0.5m left, 0.5m right -> t = (2 * 0.5) / 1500 = 666.67 us
    const echoes: UltrasonicDepthEcho[] = [
      {
        depthMeters: 10.0,
        timeOfFlightLeftMicroseconds: 666.67,
        timeOfFlightRightMicroseconds: 666.67,
        timeOfFlightFrontMicroseconds: 666.67,
        timeOfFlightBackMicroseconds: 666.67,
      },
      {
        depthMeters: 30.0,
        timeOfFlightLeftMicroseconds: 660.0,
        timeOfFlightRightMicroseconds: 673.33,
        timeOfFlightFrontMicroseconds: 666.67,
        timeOfFlightBackMicroseconds: 666.67,
      },
      {
        depthMeters: 50.0,
        timeOfFlightLeftMicroseconds: 653.33,
        timeOfFlightRightMicroseconds: 680.0,
        timeOfFlightFrontMicroseconds: 666.67,
        timeOfFlightBackMicroseconds: 666.67,
      },
    ];

    const res = profiler.evaluateTrenchProfile(echoes, slurryProps);
    expect(res.maxDepthMeters).toBe(50.0);
    expect(res.overallCompliancePass).toBe(true);
    expect(res.criticalAnomaliesCount).toBe(0);
    expect(res.maxVerticalityDeviationPct).toBeLessThanOrEqual(0.33);
  });

  it('detects severe out-of-tolerance verticality drift at trench base', () => {
    // At depth 40m, offset = 200mm -> verticality = (0.2 / 40) * 100 = 0.50% > 0.33%
    const echoes: UltrasonicDepthEcho[] = [
      {
        depthMeters: 40.0,
        timeOfFlightLeftMicroseconds: 400.0, // 0.3m
        timeOfFlightRightMicroseconds: 933.33, // 0.7m -> offset = (0.7 - 0.3) / 2 = 0.2m = 200mm
        timeOfFlightFrontMicroseconds: 666.67,
        timeOfFlightBackMicroseconds: 666.67,
      },
    ];

    const res = profiler.evaluateTrenchProfile(echoes, slurryProps);
    expect(res.overallCompliancePass).toBe(false);
    expect(res.criticalAnomaliesCount).toBe(1);
    expect(res.depthProfiles[0].anomalyClassification).toBe('VERTICALITY_OUT_OF_TOLERANCE');
    expect(res.depthProfiles[0].verticalityDeviationPct).toBeGreaterThan(0.33);
  });

  it('detects sidewall collapse / bulging over-excavation anomaly', () => {
    // Trench widens to 1.3m (design is 1.0m, dev = +300mm > 150mm threshold)
    const echoes: UltrasonicDepthEcho[] = [
      {
        depthMeters: 20.0,
        timeOfFlightLeftMicroseconds: 866.67, // 0.65m
        timeOfFlightRightMicroseconds: 866.67, // 0.65m -> total = 1.3m
        timeOfFlightFrontMicroseconds: 666.67,
        timeOfFlightBackMicroseconds: 666.67,
      },
    ];

    const res = profiler.evaluateTrenchProfile(echoes, slurryProps);
    expect(res.depthProfiles[0].anomalyClassification).toBe('BULGING_CAVING');
    expect(res.depthProfiles[0].widthDeviationMm).toBeCloseTo(300.0, 0);
  });
});
