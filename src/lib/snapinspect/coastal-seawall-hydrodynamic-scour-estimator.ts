/**
 * SNAP-57: Coastal Sea Wall Overtopping Hydrodynamic Surge & Scour Estimator.
 * Part of SnapInspect AI Civil & Marine Infrastructure Inspection Suite.
 *
 * Models coastal seawall hydrodynamic overtopping discharges, wave impact pressures,
 * and toe scour erosion hazards under extreme storm surge and tidal regimes based
 * on the EurOtop (2018) Manual and coastal engineering standards:
 * - Seawall Geometries: Vertical Wall, Recurved Parapet / Bullnose, Sloped Revetment, Stepped Dike
 * - Wave Spectrum: Significant wave height (Hm0), peak period (Tp), deepwater wavelength (L0)
 * - EurOtop Mean Overtopping Discharge (q in m^3/s per meter and L/s per meter)
 * - Dynamic Wave Impact Pressure (Minikin & Goda methods)
 * - Toe Scour Depth Prediction (Fowler & Hughes semi-empirical equilibrium model)
 * - Structural Safety Hazard Rating & Toe Rock Armoring Sizing
 */

export type SeawallType = 'VERTICAL_WALL' | 'RECURVED_PARAPET' | 'SLOPED_REVETMENT' | 'STEPPED_DIKE';

export type OvertoppingSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CoastalSeawallParameters {
  wallId: string;
  seawallType: SeawallType;
  crestHeightMeters: number; // Elevation of wall crest above datum
  toeElevationMeters: number; // Elevation of seabed at wall toe
  surgeWaterLevelMeters: number; // Still water level (SWL) during storm
  significantWaveHeightHm0: number; // Hm0 in meters
  peakPeriodTpSeconds: number; // Tp in seconds
  toeEmbedmentDepthMeters: number; // Depth of foundation below original toe
  slopeAngleDegrees?: number; // For sloped revetment (default 90 for vertical)
  roughnessCoefficientGammaF?: number; // 1.0 for smooth, 0.55-0.7 for rock armor
}

export interface CoastalOvertoppingScourResult {
  wallId: string;
  freeboardRcMeters: number; // Rc = crest - SWL
  deepwaterWavelengthL0Meters: number;
  waveSteepnessSp: number;
  meanOvertoppingDischargeQ_M3sPerM: number;
  meanOvertoppingDischargeQ_LsPerM: number;
  peakHydrodynamicPressureKPa: number;
  estimatedToeScourDepthMeters: number;
  remainingToeEmbedmentMeters: number;
  scourRatio: number; // scour depth / original embedment
  severity: OvertoppingSeverity;
  structuralFailureRisk: boolean;
  recommendedRiprapWeightKg: number;
  recommendations: string[];
}

export class CoastalSeawallHydrodynamicScourEstimator {
  private readonly g = 9.81; // Gravitational acceleration m/s^2
  private readonly seaWaterDensityKgM3 = 1025; // kg/m^3

  public evaluateSeawall(params: CoastalSeawallParameters): CoastalOvertoppingScourResult {
    const {
      wallId,
      seawallType,
      crestHeightMeters,
      toeElevationMeters,
      surgeWaterLevelMeters,
      significantWaveHeightHm0,
      peakPeriodTpSeconds,
      toeEmbedmentDepthMeters,
    } = params;

    // 1. Water depth at toe and Freeboard Rc
    const waterDepthToe = Math.max(0.1, surgeWaterLevelMeters - toeElevationMeters);
    const freeboardRc = Math.max(0.0, crestHeightMeters - surgeWaterLevelMeters);

    // 2. Wave kinematics: L0 = (g * Tp^2) / (2 * PI)
    const L0 = (this.g * Math.pow(peakPeriodTpSeconds, 2)) / (2 * Math.PI);
    const waveSteepness = significantWaveHeightHm0 / Math.max(1.0, L0);

    // 3. Form factor reductions (gamma_v for parapets, gamma_f for roughness)
    let gammaV = 1.0;
    let gammaF = params.roughnessCoefficientGammaF ?? 1.0;

    switch (seawallType) {
      case 'RECURVED_PARAPET':
        gammaV = 0.65; // Bullnose recurve deflects discharge seaward
        break;
      case 'SLOPED_REVETMENT':
        gammaV = 0.90;
        gammaF = params.roughnessCoefficientGammaF ?? 0.65;
        break;
      case 'STEPPED_DIKE':
        gammaV = 0.85;
        gammaF = params.roughnessCoefficientGammaF ?? 0.75;
        break;
      case 'VERTICAL_WALL':
      default:
        gammaV = 1.0;
        gammaF = 1.0;
        break;
    }

    // 4. EurOtop (2018) Mean Overtopping Discharge (q)
    // q = sqrt(g * Hm0^3) * 0.047 * exp(- (2.35 * Rc / (Hm0 * gammaF * gammaV))^1.3)
    const dimensionlessFreeboard = freeboardRc / (Math.max(0.1, significantWaveHeightHm0) * gammaF * gammaV);
    const expExponent = Math.pow(2.35 * dimensionlessFreeboard, 1.3);
    const baseDischarge = Math.sqrt(this.g * Math.pow(significantWaveHeightHm0, 3));
    const qM3sPerM = baseDischarge * 0.047 * Math.exp(-expExponent);
    const qLsPerM = qM3sPerM * 1000.0; // Liters per second per meter of wall

    // 5. Hydrodynamic Impact Pressure (Goda / Minikin composite approximation)
    // P_impact = rho * g * Hm0 * dynamicFactor
    const dynamicFactor = seawallType === 'VERTICAL_WALL' ? 2.5 : 1.8;
    const peakHydrodynamicPressureKPa = (this.seaWaterDensityKgM3 * this.g * significantWaveHeightHm0 * dynamicFactor) / 1000.0;

    // 6. Maximum Toe Scour Depth (Fowler & Hughes vertical seawall formulation)
    // S_max = waterDepthToe * [ 0.025 * (Hm0 / L0)^(-0.4) ], bounded by 1.25 * Hm0
    const rawScour = waterDepthToe * (0.025 * Math.pow(Math.max(0.005, waveSteepness), -0.4));
    const estimatedToeScourDepthMeters = Math.min(1.25 * significantWaveHeightHm0, Math.max(0.2, rawScour));

    const remainingToeEmbedmentMeters = Math.max(0.0, toeEmbedmentDepthMeters - estimatedToeScourDepthMeters);
    const scourRatio = estimatedToeScourDepthMeters / Math.max(0.1, toeEmbedmentDepthMeters);

    // 7. Hazard Classification (EurOtop structural damage & hazard thresholds)
    let severity: OvertoppingSeverity = 'LOW';
    let structuralFailureRisk = false;
    const recommendations: string[] = [];

    if (qLsPerM >= 50 || remainingToeEmbedmentMeters <= 0.2 || scourRatio >= 0.85) {
      severity = 'CRITICAL';
      structuralFailureRisk = true;
      recommendations.push('Immediate structural evacuation; catastrophic scour undermining or severe crest breach imminent.');
      recommendations.push('Deploy emergency rock armor toe berm and wave dissipation tetrapods.');
    } else if (qLsPerM >= 10 || scourRatio >= 0.6) {
      severity = 'HIGH';
      recommendations.push('High risk of embankment scour and landward infrastructure flooding.');
      recommendations.push('Construct recurved bullnose parapet to deflect wave crest overtopping.');
    } else if (qLsPerM >= 1.0 || scourRatio >= 0.35) {
      severity = 'MODERATE';
      recommendations.push('Pedestrian hazard present; inspect toe drainage and back-of-wall crest gutters.');
    } else {
      severity = 'LOW';
      recommendations.push('Discharge within safe operational limits; continue scheduled routine monitoring.');
    }

    // 8. Hudson Riprap Toe Protection Sizing: W50 = (rho_s * H^3) / (K_D * (S_r - 1)^3 * cot(theta))
    // Approximate stable stone mass in kg:
    const riprapWeightKg = Math.round(15.0 * Math.pow(significantWaveHeightHm0, 3));

    return {
      wallId,
      freeboardRcMeters: Number(freeboardRc.toFixed(2)),
      deepwaterWavelengthL0Meters: Number(L0.toFixed(2)),
      waveSteepnessSp: Number(waveSteepness.toFixed(4)),
      meanOvertoppingDischargeQ_M3sPerM: Number(qM3sPerM.toFixed(6)),
      meanOvertoppingDischargeQ_LsPerM: Number(qLsPerM.toFixed(3)),
      peakHydrodynamicPressureKPa: Number(peakHydrodynamicPressureKPa.toFixed(2)),
      estimatedToeScourDepthMeters: Number(estimatedToeScourDepthMeters.toFixed(2)),
      remainingToeEmbedmentMeters: Number(remainingToeEmbedmentMeters.toFixed(2)),
      scourRatio: Number(scourRatio.toFixed(3)),
      severity,
      structuralFailureRisk,
      recommendedRiprapWeightKg: riprapWeightKg,
      recommendations,
    };
  }
}
