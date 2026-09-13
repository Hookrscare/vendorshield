/**
 * SNAP-59: Concrete Cooling Tower Hygrothermal Microcrack & Acid Vapour Corrosion Degradation Scanner
 * 
 * Evaluates industrial hyperbolic cooling tower reinforced concrete shell degradation,
 * including carbonation depth, acid vapor chemical leaching, microcrack permeability acceleration,
 * and structural rebar depassivation risk.
 */

export interface CoolingTowerInspectionInput {
  exposureYears: number;                      // t (years in service)
  nominalConcreteCoverMm: number;             // Nominal rebar cover depth (e.g. 40 - 60 mm)
  ambientCo2Ppm: number;                       // CO2 concentration (e.g. 420 - 800 ppm)
  sulfuricAcidDepositionRateGPerM2Yr: number; // Acid condensation rate (g/m^2/year)
  observedMicrocrackDensityPerM2: number;     // Visual microcrack count per square meter
  meanCrackWidthMm: number;                   // Average surface crack width (e.g. 0.05 - 0.40 mm)
}

export type CorrosionSeverityLevel = 'LOW' | 'MODERATE' | 'CRITICAL_SPALLING_RISK';

export interface CoolingTowerAssessment {
  carbonationDepthMm: number;
  acidLeachingDepthMm: number;
  totalDegradationDepthMm: number;
  effectiveResidualCoverMm: number;
  permeabilityMultiplier: number;
  rebarDepassivationOccurred: boolean;
  structuralSeverityLevel: CorrosionSeverityLevel;
  remediationRecommendation: string;
}

export class CoolingTowerCorrosionScanner {
  /**
   * Evaluates concrete shell degradation across chemical, carbonation, and crack-driven pathways.
   */
  public evaluateShellDegradation(input: CoolingTowerInspectionInput): CoolingTowerAssessment {
    if (input.exposureYears <= 0 || input.nominalConcreteCoverMm <= 0) {
      throw new Error('Exposure time and nominal cover must be strictly positive.');
    }

    // Permeability multiplier driven by crack width squared (Poiseuille-type flow in planar fissures)
    const crackWidth = Math.max(0.0, input.meanCrackWidthMm);
    const crackDensity = Math.max(0.0, input.observedMicrocrackDensityPerM2);
    const permeabilityMultiplier = 1.0 + (12.0 * Math.pow(crackWidth, 1.8) * Math.min(5.0, crackDensity * 0.2));

    // Base carbonation coefficient k_carb (mm / year^0.5)
    // Scaled by ambient CO2 and permeability acceleration
    const co2Factor = Math.sqrt(Math.max(350, input.ambientCo2Ppm) / 400.0);
    const kCarb = 1.85 * co2Factor * Math.sqrt(permeabilityMultiplier);
    const carbonationDepthMm = kCarb * Math.sqrt(input.exposureYears);

    // Acid vapor chemical leaching depth: x_a = k_acid * rate^0.4 * t^0.6 * permeabilityMultiplier^0.5
    const acidRate = Math.max(0.0, input.sulfuricAcidDepositionRateGPerM2Yr);
    const kAcid = 0.45;
    const acidLeachingDepthMm = kAcid * Math.pow(acidRate + 0.1, 0.4) * Math.pow(input.exposureYears, 0.6) * Math.sqrt(permeabilityMultiplier);

    // Total degradation penetration depth
    const totalDegradationDepthMm = carbonationDepthMm + (0.75 * acidLeachingDepthMm);

    // Remaining sound concrete cover over steel rebar
    const effectiveResidualCoverMm = input.nominalConcreteCoverMm - totalDegradationDepthMm;
    const rebarDepassivationOccurred = effectiveResidualCoverMm <= 0;

    let structuralSeverityLevel: CorrosionSeverityLevel = 'LOW';
    let remediationRecommendation = 'Surface protective hydrophobic silane coating during routine maintenance.';

    if (rebarDepassivationOccurred || effectiveResidualCoverMm < 5.0) {
      structuralSeverityLevel = 'CRITICAL_SPALLING_RISK';
      remediationRecommendation = 'Urgent cathodic protection installation and structural polymer-modified shotcrete resurfacing.';
    } else if (effectiveResidualCoverMm < 15.0 || permeabilityMultiplier > 2.0) {
      structuralSeverityLevel = 'MODERATE';
      remediationRecommendation = 'Pressure injection of elastomeric polyurethane resin into microcracks and anti-carbonation barrier coating.';
    }

    return {
      carbonationDepthMm: Number(carbonationDepthMm.toFixed(2)),
      acidLeachingDepthMm: Number(acidLeachingDepthMm.toFixed(2)),
      totalDegradationDepthMm: Number(totalDegradationDepthMm.toFixed(2)),
      effectiveResidualCoverMm: Number(effectiveResidualCoverMm.toFixed(2)),
      permeabilityMultiplier: Number(permeabilityMultiplier.toFixed(2)),
      rebarDepassivationOccurred,
      structuralSeverityLevel,
      remediationRecommendation,
    };
  }
}
