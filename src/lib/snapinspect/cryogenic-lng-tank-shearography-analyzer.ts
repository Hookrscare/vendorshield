/**
 * SNAP-68: Cryogenic Liquefied Natural Gas (LNG) Spherical Tank Invar Membrane Laser Shearography Analyzer
 * 
 * Analyzes laser speckle shearography interferograms of LNG tank Invar-36 membranes and insulation foam,
 * detecting subsurface delamination, kiss-bonding voids, and thermal contraction fatigue anomalies.
 */

export interface LngTankMembraneSpec {
  tankId: string;
  membraneAlloy: 'INVAR_36' | 'AUSTENITIC_STAINLESS_304L';
  membraneThicknessMm: number; // typically 0.7 - 1.2 mm
  operatingTemperatureKelvin: number; // 111 K (-162 C)
  maxAllowableVoidDiameterMm: number; // typically 15.0 mm
}

export interface ShearographyPhaseMap {
  laserWavelengthNm: number; // typically 532 nm
  shearDistanceMm: number; // delta x (typically 5 - 10 mm)
  measuredPhaseDifferenceRad: number[][]; // 2D grid of phase fringes
  thermalExcitationDeltaKelvin: number; // typically 2.0 - 5.0 K
}

export interface LngMembraneDefectReport {
  defectId: string;
  centroidCoordinatesMm: [number, number];
  estimatedDiameterMm: number;
  peakStrainGradientMicroStrain: number;
  severity: 'ACCEPTABLE' | 'ELEVATED_WATCH' | 'CRITICAL_DELAMINATION';
}

export interface LngShearographyAssessment {
  tankId: string;
  totalDefectsFound: number;
  isMembraneIntegrityCertified: boolean;
  maxDefectDiameterMm: number;
  defects: LngMembraneDefectReport[];
  recommendations: string[];
}

export class CryogenicLngTankShearographyAnalyzer {
  /**
   * Evaluates laser shearography fringe patterns for cryogenic containment validation.
   */
  public analyzePhaseMap(
    spec: LngTankMembraneSpec,
    phaseMap: ShearographyPhaseMap
  ): LngShearographyAssessment {
    const grid = phaseMap.measuredPhaseDifferenceRad;
    const rows = grid.length;
    if (rows === 0 || grid[0].length === 0) {
      throw new Error('Phase difference grid cannot be empty.');
    }
    const cols = grid[0].length;

    const defects: LngMembraneDefectReport[] = [];
    const lambdaM = phaseMap.laserWavelengthNm * 1e-9;
    const deltaXM = phaseMap.shearDistanceMm * 1e-3;

    // Search for butterfly fringe anomalies (phase gradient peaks)
    const thresholdPhaseRad = 1.8; // significant out-of-plane displacement gradient

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const val = Math.abs(grid[r][c]);
        if (val > thresholdPhaseRad) {
          // Check if local maximum
          const isLocalMax =
            val >= Math.abs(grid[r - 1][c]) &&
            val >= Math.abs(grid[r + 1][c]) &&
            val >= Math.abs(grid[r][c - 1]) &&
            val >= Math.abs(grid[r][c + 1]);

          if (isLocalMax) {
            // Out-of-plane displacement derivative dw/dx = (lambda * Delta phi) / (4 * pi * delta_x)
            const dw_dx = (lambdaM * val) / (4.0 * Math.PI * deltaXM);
            const microStrain = dw_dx * 1e6;

            // Estimated void diameter correlated with butterfly fringe span
            const diameterMm = Number((val * 7.5).toFixed(1));

            let severity: LngMembraneDefectReport['severity'] = 'ACCEPTABLE';
            if (diameterMm > spec.maxAllowableVoidDiameterMm) {
              severity = 'CRITICAL_DELAMINATION';
            } else if (diameterMm > spec.maxAllowableVoidDiameterMm * 0.6) {
              severity = 'ELEVATED_WATCH';
            }

            defects.push({
              defectId: `LNG-DEF-${r}-${c}`,
              centroidCoordinatesMm: [c * 5.0, r * 5.0],
              estimatedDiameterMm: diameterMm,
              peakStrainGradientMicroStrain: Number(microStrain.toFixed(2)),
              severity,
            });
          }
        }
      }
    }

    const criticalCount = defects.filter((d) => d.severity === 'CRITICAL_DELAMINATION').length;
    const isCertified = criticalCount === 0;
    const maxDiameter = defects.reduce((max, d) => Math.max(max, d.estimatedDiameterMm), 0.0);

    const recs: string[] = [];
    if (!isCertified) {
      recs.push(`CRITICAL: Found ${criticalCount} subsurface insulation voids exceeding ${spec.maxAllowableVoidDiameterMm} mm limit. Tank unseaworthy.`);
      recs.push('MANDATORY: Execute secondary helium leak test and cryogenic vacuum repair.');
    } else if (defects.length > 0) {
      recs.push('PASS: All detected fringe anomalies are within acceptable IGC Code tolerance.');
    } else {
      recs.push('NOMINAL: Perfect laser shearography speckle coherence. No subsurface debonding detected.');
    }

    return {
      tankId: spec.tankId,
      totalDefectsFound: defects.length,
      isMembraneIntegrityCertified: isCertified,
      maxDefectDiameterMm: Number(maxDiameter.toFixed(1)),
      defects,
      recommendations: recs,
    };
  }
}
