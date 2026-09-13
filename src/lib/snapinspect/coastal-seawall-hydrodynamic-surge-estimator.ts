/**
 * SNAP-57: Coastal Sea Wall Overtopping Hydrodynamic Surge & Scour Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Geotechnical Engineering Platform.
 *
 * Implements EurOtop (2018) & USACE Coastal Engineering Manual (CEM) standards for coastal
 * revetments, vertical sea walls, and dikes:
 * 1. Calculates Iribarren breaker parameter (xi_m-1,0) and wave steepness.
 * 2. Computes mean wave overtopping discharge q (m^3/s per m crest and liters/s/m).
 * 3. Evaluates toe scour trench excavation depth d_scour (m).
 * 4. Determines rock armor stone median mass M_50 (tonnes) via Hudson formula.
 * 5. Classifies coastal public safety and structural stability risk tiers.
 */

export interface SeawallGeometry {
  structureType: 'SLOPED_REVETMENT' | 'VERTICAL_SEAWALL' | 'BERMED_DIKE';
  crestElevationM: number;       // Meters above Chart Datum (CD)
  slopeAngleDeg: number;         // Slope angle (e.g. 26.5° for 1:2 slope; 90° for vertical)
  bermInfluenceFactorGammaB: number; // Berm reduction factor (0.6 - 1.0)
  roughnessInfluenceFactorGammaF: number; // Roughness factor (e.g. 0.55 for rip-rap, 1.0 for smooth concrete)
  armorDensityTonneM3: number;   // Armor stone density (e.g. 2.65 t/m^3 for basalt/granite)
}

export interface HydrodynamicForcing {
  significantWaveHeightM: number;  // H_m0 in meters (e.g. 3.2 m)
  peakPeriodSec: number;           // T_p in seconds (e.g. 10.5 s)
  stormSurgeWaterLevelM: number;   // Still water level above CD (e.g. 4.5 m)
  toeWaterDepthM: number;          // Water depth at structure toe h_toe (m)
  seaLevelRiseAllowanceM: number;  // Climate change SLR allowance (e.g. 0.6 m)
}

export type OvertoppingRiskTier =
  | 'SAFE_NEGLIGIBLE_OVERTOPPING'
  | 'MODERATE_PEDESTRIAN_HAZARD'
  | 'SEVERE_STRUCTURAL_DAMAGE_RISK'
  | 'CATASTROPHIC_OVERTOPPING_BREACH';

export interface CoastalOvertoppingReport {
  freeboardRcM: number;                   // Effective freeboard Rc = Crest - (Surge + SLR)
  iribarrenParameter: number;            // Breaker parameter xi
  overtoppingDischargeM3SecPerM: number; // q in m^3/s/m
  overtoppingDischargeLSecPerM: number;  // q in L/s/m
  toeScourDepthM: number;                // Estimated toe scour depth d_scour in meters
  recommendedArmorStoneM50Tonnes: number; // Median armor stone weight M_50 in tonnes
  hazardClassification: OvertoppingRiskTier;
  evacuationRecommended: boolean;
}

export class CoastalSeawallHydrodynamicSurgeEstimator {
  private readonly G = 9.81;

  public evaluateSeaWall(
    geometry: SeawallGeometry,
    forcing: HydrodynamicForcing
  ): CoastalOvertoppingReport {
    const H_m0 = Math.max(0.1, forcing.significantWaveHeightM);
    const T_p = Math.max(1.0, forcing.peakPeriodSec);
    const effectiveWaterLevel = forcing.stormSurgeWaterLevelM + forcing.seaLevelRiseAllowanceM;
    const freeboardRc = geometry.crestElevationM - effectiveWaterLevel;

    // 1. Deepwater wavelength and wave steepness
    const L_0 = (this.G * Math.pow(T_p, 2)) / (2 * Math.PI);
    const s_0 = H_m0 / L_0;

    // 2. Slope angle and Iribarren parameter
    const radSlope = (Math.min(89.0, Math.max(10.0, geometry.slopeAngleDeg)) * Math.PI) / 180;
    const tanAlpha = Math.tan(radSlope);
    const iribarren = tanAlpha / Math.sqrt(Math.max(1e-4, s_0));

    // 3. EurOtop overtopping calculation
    let q_m3_s_m = 0.0;

    if (freeboardRc <= 0) {
      // Submerged or zero freeboard crest: catastrophic weir flow overtopping
      const overflowHead = Math.abs(freeboardRc) + H_m0 * 0.5;
      q_m3_s_m = 0.54 * Math.sqrt(this.G) * Math.pow(overflowHead, 1.5);
    } else if (geometry.structureType === 'VERTICAL_SEAWALL') {
      // EurOtop formulation for non-impulsive vertical walls
      const expTerm = Math.exp(-2.6 * (freeboardRc / H_m0));
      q_m3_s_m = 0.047 * Math.sqrt(this.G * Math.pow(H_m0, 3)) * expTerm;
    } else {
      // Sloped dikes and revetments (EurOtop 2018)
      const gamma_b = Math.min(1.0, Math.max(0.6, geometry.bermInfluenceFactorGammaB));
      const gamma_f = Math.min(1.0, Math.max(0.5, geometry.roughnessInfluenceFactorGammaF));
      const gamma_tot = gamma_b * gamma_f;

      // Breaking waves formula
      const breakingExponent = -4.75 * (freeboardRc / (H_m0 * Math.max(0.1, iribarren) * gamma_tot));
      const q_breaking = (0.067 / Math.sqrt(tanAlpha)) * gamma_b * iribarren * Math.sqrt(this.G * Math.pow(H_m0, 3)) * Math.exp(breakingExponent);

      // Non-breaking maximum limit
      const nonBreakingExponent = -2.6 * (freeboardRc / (H_m0 * gamma_f));
      const q_non_breaking = 0.2 * Math.sqrt(this.G * Math.pow(H_m0, 3)) * Math.exp(nonBreakingExponent);

      q_m3_s_m = Math.min(q_breaking, q_non_breaking);
    }

    const q_L_s_m = q_m3_s_m * 1000.0;

    // 4. Toe scour excavation depth estimation (USACE CEM)
    const h_toe = Math.max(0.5, forcing.toeWaterDepthM);
    const scourDepth = 0.18 * H_m0 * Math.sqrt(h_toe / H_m0);

    // 5. Hudson formula for primary armor unit weight M_50
    // M_50 = (rho_s * H^3) / (K_D * (S_r - 1)^3 * cot(alpha))
    const rho_s = geometry.armorDensityTonneM3;
    const rho_w = 1.025; // Seawater density
    const S_r = rho_s / rho_w;
    const K_D = geometry.roughnessInfluenceFactorGammaF < 0.7 ? 3.5 : 2.0; // Rough quarrystone stability coefficient
    const cotAlpha = 1.0 / tanAlpha;
    const armorWeightTonnes = (rho_s * Math.pow(H_m0, 3)) / (K_D * Math.pow(S_r - 1, 3) * Math.max(0.5, cotAlpha));

    // 6. Hazard classification based on EurOtop human and structural thresholds
    let hazard: OvertoppingRiskTier;
    let evacuation = false;

    if (q_L_s_m < 1.0) {
      hazard = 'SAFE_NEGLIGIBLE_OVERTOPPING';
    } else if (q_L_s_m < 10.0) {
      hazard = 'MODERATE_PEDESTRIAN_HAZARD';
    } else if (q_L_s_m < 200.0) {
      hazard = 'SEVERE_STRUCTURAL_DAMAGE_RISK';
      evacuation = true;
    } else {
      hazard = 'CATASTROPHIC_OVERTOPPING_BREACH';
      evacuation = true;
    }

    return {
      freeboardRcM: Number(freeboardRc.toFixed(3)),
      iribarrenParameter: Number(iribarren.toFixed(3)),
      overtoppingDischargeM3SecPerM: Number(q_m3_s_m.toFixed(5)),
      overtoppingDischargeLSecPerM: Number(q_L_s_m.toFixed(2)),
      toeScourDepthM: Number(scourDepth.toFixed(3)),
      recommendedArmorStoneM50Tonnes: Number(Math.max(0.1, armorWeightTonnes).toFixed(2)),
      hazardClassification: hazard,
      evacuationRecommended: evacuation
    };
  }
}
