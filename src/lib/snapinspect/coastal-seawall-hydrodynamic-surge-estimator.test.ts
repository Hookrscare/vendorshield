/**
 * Unit tests for SNAP-57: Coastal Sea Wall Overtopping Hydrodynamic Surge & Scour Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Geotechnical Engineering Platform.
 */

import { describe, it, expect } from 'vitest';
import {
  CoastalSeawallHydrodynamicSurgeEstimator,
  SeawallGeometry,
  HydrodynamicForcing
} from './coastal-seawall-hydrodynamic-surge-estimator';

describe('SNAP-57: Coastal Sea Wall Hydrodynamic Surge & Scour Estimator', () => {
  const estimator = new CoastalSeawallHydrodynamicSurgeEstimator();

  it('evaluates safe revetment with generous freeboard under moderate swell', () => {
    const geometry: SeawallGeometry = {
      structureType: 'SLOPED_REVETMENT',
      crestElevationM: 9.0, // High crest
      slopeAngleDeg: 26.5,  // 1:2 slope
      bermInfluenceFactorGammaB: 1.0,
      roughnessInfluenceFactorGammaF: 0.55, // Rip-rap
      armorDensityTonneM3: 2.65
    };

    const forcing: HydrodynamicForcing = {
      significantWaveHeightM: 1.8,
      peakPeriodSec: 8.0,
      stormSurgeWaterLevelM: 3.5,
      toeWaterDepthM: 3.0,
      seaLevelRiseAllowanceM: 0.3
    };

    const report = estimator.evaluateSeaWall(geometry, forcing);
    expect(report.freeboardRcM).toBeGreaterThan(4.0);
    expect(report.hazardClassification).toBe('SAFE_NEGLIGIBLE_OVERTOPPING');
    expect(report.evacuationRecommended).toBe(false);
    expect(report.overtoppingDischargeLSecPerM).toBeLessThan(1.0);
    expect(report.recommendedArmorStoneM50Tonnes).toBeGreaterThan(0.2);
  });

  it('identifies catastrophic overtopping when storm surge inundates crest', () => {
    const geometry: SeawallGeometry = {
      structureType: 'VERTICAL_SEAWALL',
      crestElevationM: 4.5,
      slopeAngleDeg: 90,
      bermInfluenceFactorGammaB: 1.0,
      roughnessInfluenceFactorGammaF: 1.0,
      armorDensityTonneM3: 2.65
    };

    const forcing: HydrodynamicForcing = {
      significantWaveHeightM: 3.5,
      peakPeriodSec: 12.0,
      stormSurgeWaterLevelM: 4.8, // Crest submerged by 0.3m
      toeWaterDepthM: 5.0,
      seaLevelRiseAllowanceM: 0.5
    };

    const report = estimator.evaluateSeaWall(geometry, forcing);
    expect(report.freeboardRcM).toBeLessThan(0);
    expect(report.hazardClassification).toBe('CATASTROPHIC_OVERTOPPING_BREACH');
    expect(report.evacuationRecommended).toBe(true);
    expect(report.overtoppingDischargeLSecPerM).toBeGreaterThan(200.0);
    expect(report.toeScourDepthM).toBeGreaterThan(0.5);
  });

  it('calculates pedestrian hazard on moderate vertical seawall wave impact', () => {
    const geometry: SeawallGeometry = {
      structureType: 'VERTICAL_SEAWALL',
      crestElevationM: 6.0,
      slopeAngleDeg: 90,
      bermInfluenceFactorGammaB: 1.0,
      roughnessInfluenceFactorGammaF: 1.0,
      armorDensityTonneM3: 2.65
    };

    const forcing: HydrodynamicForcing = {
      significantWaveHeightM: 2.5,
      peakPeriodSec: 9.0,
      stormSurgeWaterLevelM: 3.8,
      toeWaterDepthM: 4.0,
      seaLevelRiseAllowanceM: 0.2
    };

    const report = estimator.evaluateSeaWall(geometry, forcing);
    expect(report.freeboardRcM).toBe(2.0);
    expect(['MODERATE_PEDESTRIAN_HAZARD', 'SEVERE_STRUCTURAL_DAMAGE_RISK']).toContain(report.hazardClassification);
  });
});
