import { describe, it, expect } from 'vitest';
import {
  UphesCavernRockMassDiscontinuityClassifier,
  CavernGeotechnicalParameters,
} from './uphes-cavern-rock-mass-discontinuity-classifier';

describe('SNAP-74: UphesCavernRockMassDiscontinuityClassifier Tests', () => {
  const classifier = new UphesCavernRockMassDiscontinuityClassifier();

  it('classifies competent granitic host rock as VERY_GOOD with low cyclic risk', () => {
    const competentGranite: CavernGeotechnicalParameters = {
      cavernDepthMeters: 800,
      uniaxialCompressiveStrengthMpa: 140, // High strength
      rqdPercentage: 92, // Excellent RQD
      discontinuitySpacingMeters: 2.5, // Wide joint spacing
      discontinuityApertureMm: 0.05, // Tight joints
      groundwaterInflowLitersPerMin: 2, // Dry cavern
      cyclicWaterHammerPressureSwingMpa: 1.5, // Gentle pressure cycles
    };

    const res = classifier.classifyCavernRockMass(competentGranite);

    expect(res.rmrScore).toBeGreaterThanOrEqual(80);
    expect(res.rockMassClass).toBe('VERY_GOOD');
    expect(res.cyclicHydroFatigueRisk).toBe('LOW');
    expect(res.recommendedSupport.shotcreteThicknessMm).toBe(0);
  });

  it('classifies fractured shear zone under violent pressure transients as CRITICAL fatigue risk', () => {
    const fracturedShearZone: CavernGeotechnicalParameters = {
      cavernDepthMeters: 1200,
      uniaxialCompressiveStrengthMpa: 45, // Weak rock
      rqdPercentage: 35, // Poor RQD
      discontinuitySpacingMeters: 0.15, // Closely spaced joints
      discontinuityApertureMm: 3.5, // Open joints
      groundwaterInflowLitersPerMin: 80, // Heavy water ingress
      cyclicWaterHammerPressureSwingMpa: 8.5, // Violent water hammer
    };

    const res = classifier.classifyCavernRockMass(fracturedShearZone);

    expect(res.rmrScore).toBeLessThan(50);
    expect(res.cyclicHydroFatigueRisk).toBe('CRITICAL');
    expect(res.recommendedSupport.requiresPressureGrouting).toBe(true);
    expect(res.recommendedSupport.shotcreteThicknessMm).toBeGreaterThanOrEqual(150);
  });
});
