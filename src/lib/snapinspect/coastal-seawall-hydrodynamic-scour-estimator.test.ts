import { describe, it, expect } from 'vitest';
import {
  CoastalSeawallHydrodynamicScourEstimator,
  CoastalSeawallParameters,
} from './coastal-seawall-hydrodynamic-scour-estimator';

describe('SNAP-57: Coastal Sea Wall Overtopping Hydrodynamic Surge & Scour Estimator', () => {
  const estimator = new CoastalSeawallHydrodynamicScourEstimator();

  it('evaluates safe low-discharge vertical seawall under moderate sea state', () => {
    const params: CoastalSeawallParameters = {
      wallId: 'SW-001-CALIFORNIA',
      seawallType: 'VERTICAL_WALL',
      crestHeightMeters: 6.0,
      toeElevationMeters: 0.0,
      surgeWaterLevelMeters: 2.5, // 3.5m freeboard
      significantWaveHeightHm0: 1.2,
      peakPeriodTpSeconds: 8.0,
      toeEmbedmentDepthMeters: 3.0,
    };

    const result = estimator.evaluateSeawall(params);
    expect(result.wallId).toBe('SW-001-CALIFORNIA');
    expect(result.freeboardRcMeters).toBe(3.5);
    expect(result.meanOvertoppingDischargeQ_LsPerM).toBeLessThan(1.0);
    expect(result.severity).toBe('LOW');
    expect(result.structuralFailureRisk).toBe(false);
    expect(result.remainingToeEmbedmentMeters).toBeGreaterThan(1.5);
  });

  it('detects critical hazard and toe undermining under extreme storm surge', () => {
    const params: CoastalSeawallParameters = {
      wallId: 'SW-002-HURRICANE',
      seawallType: 'VERTICAL_WALL',
      crestHeightMeters: 4.5,
      toeElevationMeters: 0.0,
      surgeWaterLevelMeters: 4.2, // only 0.3m freeboard
      significantWaveHeightHm0: 3.5,
      peakPeriodTpSeconds: 12.0,
      toeEmbedmentDepthMeters: 1.5,
    };

    const result = estimator.evaluateSeawall(params);
    expect(result.meanOvertoppingDischargeQ_LsPerM).toBeGreaterThan(50.0);
    expect(result.severity).toBe('CRITICAL');
    expect(result.structuralFailureRisk).toBe(true);
    expect(result.recommendations).toContain(
      'Immediate structural evacuation; catastrophic scour undermining or severe crest breach imminent.'
    );
  });

  it('demonstrates overtopping reduction with recurved bullnose parapet geometry', () => {
    const baseVerticalParams: CoastalSeawallParameters = {
      wallId: 'SW-VERT',
      seawallType: 'VERTICAL_WALL',
      crestHeightMeters: 5.0,
      toeElevationMeters: 0.0,
      surgeWaterLevelMeters: 3.0,
      significantWaveHeightHm0: 2.0,
      peakPeriodTpSeconds: 10.0,
      toeEmbedmentDepthMeters: 2.5,
    };

    const recurvedParams: CoastalSeawallParameters = {
      ...baseVerticalParams,
      wallId: 'SW-RECURVE',
      seawallType: 'RECURVED_PARAPET',
    };

    const resVertical = estimator.evaluateSeawall(baseVerticalParams);
    const resRecurved = estimator.evaluateSeawall(recurvedParams);

    // Recurved parapet reduces discharge due to gammaV = 0.65 in EurOtop exponent
    expect(resRecurved.meanOvertoppingDischargeQ_LsPerM).toBeLessThan(
      resVertical.meanOvertoppingDischargeQ_LsPerM
    );
  });

  it('calculates riprap weight and dynamic wave impact pressure correctly', () => {
    const params: CoastalSeawallParameters = {
      wallId: 'SW-004',
      seawallType: 'VERTICAL_WALL',
      crestHeightMeters: 5.0,
      toeElevationMeters: 0.0,
      surgeWaterLevelMeters: 2.0,
      significantWaveHeightHm0: 2.5,
      peakPeriodTpSeconds: 9.0,
      toeEmbedmentDepthMeters: 2.0,
    };

    const result = estimator.evaluateSeawall(params);
    expect(result.peakHydrodynamicPressureKPa).toBeGreaterThan(50);
    expect(result.recommendedRiprapWeightKg).toBeGreaterThan(100);
  });
});
