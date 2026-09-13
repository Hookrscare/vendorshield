/**
 * SNAP-74: Underground Pumped Hydro Energy Storage (UPHES) Cavern Rock Mass Discontinuity Classifier
 * 
 * Classifies rock mass quality and joint discontinuity degradation under cyclic hydraulic water hammer
 * pressure transients in deep subterranean pumped hydro caverns using Bieniawski RMR and Barton Q criteria.
 */

export interface CavernGeotechnicalParameters {
  cavernDepthMeters: number; // e.g. 800m
  uniaxialCompressiveStrengthMpa: number; // intact rock strength (e.g. 120 MPa for granite)
  rqdPercentage: number; // Rock Quality Designation 0 - 100%
  discontinuitySpacingMeters: number; // Joint spacing (e.g. 0.6 m)
  discontinuityApertureMm: number; // Joint width (e.g. 0.5 mm)
  groundwaterInflowLitersPerMin: number;
  cyclicWaterHammerPressureSwingMpa: number; // Cyclic pressure swing (e.g. 8.0 MPa)
}

export interface RockMassClassificationResult {
  rmrScore: number; // 0 - 100
  rockMassClass: 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';
  cyclicHydroFatigueRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedSupport: {
    shotcreteThicknessMm: number;
    rockboltSpacingMeters: number;
    requiresPressureGrouting: boolean;
  };
}

export class UphesCavernRockMassDiscontinuityClassifier {
  /**
   * Classifies subterranean rock mass and evaluates cyclic hydraulic fatigue vulnerability.
   */
  public classifyCavernRockMass(params: CavernGeotechnicalParameters): RockMassClassificationResult {
    // 1. UCS rating (0 - 15)
    let ucsRating = 0;
    if (params.uniaxialCompressiveStrengthMpa > 100) ucsRating = 12;
    else if (params.uniaxialCompressiveStrengthMpa > 50) ucsRating = 7;
    else ucsRating = 4;

    // 2. RQD rating (3 - 20)
    const rqdRating = Math.max(3, Math.min(20, Math.round((params.rqdPercentage / 100.0) * 20)));

    // 3. Spacing rating (5 - 20)
    let spacingRating = 5;
    if (params.discontinuitySpacingMeters > 2.0) spacingRating = 20;
    else if (params.discontinuitySpacingMeters > 0.6) spacingRating = 15;
    else if (params.discontinuitySpacingMeters > 0.2) spacingRating = 10;

    // 4. Joint condition (aperture penalty) (0 - 30)
    let conditionRating = 25;
    if (params.discontinuityApertureMm > 5.0) conditionRating = 5;
    else if (params.discontinuityApertureMm > 1.0) conditionRating = 12;
    else if (params.discontinuityApertureMm > 0.1) conditionRating = 20;

    // 5. Groundwater rating (0 - 15)
    let waterRating = 15;
    if (params.groundwaterInflowLitersPerMin > 50) waterRating = 4;
    else if (params.groundwaterInflowLitersPerMin > 10) waterRating = 10;

    const rmrScore = ucsRating + rqdRating + spacingRating + conditionRating + waterRating;

    let rockClass: 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';
    if (rmrScore >= 81) rockClass = 'VERY_GOOD';
    else if (rmrScore >= 61) rockClass = 'GOOD';
    else if (rmrScore >= 41) rockClass = 'FAIR';
    else if (rmrScore >= 21) rockClass = 'POOR';
    else rockClass = 'VERY_POOR';

    // Cyclic water hammer fatigue risk
    let fatigueRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    if (params.cyclicWaterHammerPressureSwingMpa > 6.0 && rmrScore < 60) {
      fatigueRisk = 'CRITICAL';
    } else if (params.cyclicWaterHammerPressureSwingMpa > 4.0 || rmrScore < 50) {
      fatigueRisk = 'HIGH';
    } else if (params.cyclicWaterHammerPressureSwingMpa > 2.0) {
      fatigueRisk = 'MODERATE';
    } else {
      fatigueRisk = 'LOW';
    }

    // Support requirements
    let shotcreteThicknessMm = 0;
    let rockboltSpacingMeters = 2.5;
    let requiresGrouting = false;

    if (rockClass === 'VERY_POOR' || fatigueRisk === 'CRITICAL') {
      shotcreteThicknessMm = 200;
      rockboltSpacingMeters = 1.0;
      requiresGrouting = true;
    } else if (rockClass === 'POOR' || fatigueRisk === 'HIGH') {
      shotcreteThicknessMm = 120;
      rockboltSpacingMeters = 1.5;
      requiresGrouting = true;
    } else if (rockClass === 'FAIR') {
      shotcreteThicknessMm = 50;
      rockboltSpacingMeters = 2.0;
      requiresGrouting = false;
    }

    return {
      rmrScore,
      rockMassClass: rockClass,
      cyclicHydroFatigueRisk: fatigueRisk,
      recommendedSupport: {
        shotcreteThicknessMm,
        rockboltSpacingMeters,
        requiresPressureGrouting: requiresGrouting,
      },
    };
  }
}
