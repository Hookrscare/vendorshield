import { describe, it, expect } from 'vitest';
import {
  BridgePierScourBathymetryEstimator,
  PierGeometry,
  HydrodynamicFlowConditions,
  SonarBathymetryPoint,
} from './bridge-pier-scour-bathymetry-estimator';

describe('SNAP-50: Autonomous Multi-Sensor Bridge Pier Scour Depth & Hydrodynamic Bathymetry Estimator', () => {
  const estimator = new BridgePierScourBathymetryEstimator();

  const standardPier: PierGeometry = {
    pierId: 'PIER-04-NORTH',
    widthMeters: 2.5,
    lengthMeters: 10.0,
    noseShape: 'ROUND_NOSE',
    attackAngleDeg: 0,
    topOfFootingElevationM: 92.0,
    pileTipElevationM: 70.0,
  };

  const calmFlow: HydrodynamicFlowConditions = {
    approachVelocityMps: 1.2,
    approachDepthMeters: 4.0,
    bedCondition: 'CLEAR_WATER',
  };

  it('calculates baseline HEC-18 scour depth for calm river flow conditions', () => {
    const soundings: SonarBathymetryPoint[] = [
      { xMeters: 0, yMeters: 1, bedElevationM: 99.5, sensorConfidence: 0.95 },
      { xMeters: 1, yMeters: -1, bedElevationM: 99.2, sensorConfidence: 0.90 },
    ];

    const report = estimator.evaluatePierScour(standardPier, calmFlow, soundings, 100.0);

    expect(report.froudeNumber).toBeGreaterThan(0.1);
    expect(report.froudeNumber).toBeLessThan(0.3);
    expect(report.theoreticalScourDepthM).toBeGreaterThan(2.0);
    expect(report.footingUndermined).toBe(false);
    expect(report.stabilityTier).toBe('SAFE');
    expect(report.geojsonFeature.properties.pierId).toBe('PIER-04-NORTH');
  });

  it('detects critical foundation undermining under severe flood conditions and sonar soundings', () => {
    const severeFloodFlow: HydrodynamicFlowConditions = {
      approachVelocityMps: 4.5,
      approachDepthMeters: 7.5,
      bedCondition: 'LARGE_DUNES',
    };

    // Deep scour hole sounding below top of footing (92.0m)
    const deepScourSoundings: SonarBathymetryPoint[] = [
      { xMeters: 0, yMeters: 0, bedElevationM: 90.5, sensorConfidence: 0.98 },
    ];

    const report = estimator.evaluatePierScour(standardPier, severeFloodFlow, deepScourSoundings, 100.0);

    expect(report.criticalScourElevationM).toBeLessThan(92.0);
    expect(report.footingUndermined).toBe(true);
    expect(report.stabilityTier).toBe('CRITICAL_UNDERMINED');
    expect(report.remediationRecommendation).toContain('EMERGENCY');
  });

  it('amplifies scour depth when angle of attack creates severe cross-flow vortices', () => {
    const angledPier: PierGeometry = {
      ...standardPier,
      attackAngleDeg: 25, // 25 degree skewed flow
    };

    const reportZero = estimator.evaluatePierScour(standardPier, calmFlow, [], 100.0);
    const reportAngled = estimator.evaluatePierScour(angledPier, calmFlow, [], 100.0);

    expect(reportAngled.theoreticalScourDepthM).toBeGreaterThan(reportZero.theoreticalScourDepthM * 1.5);
  });
});
