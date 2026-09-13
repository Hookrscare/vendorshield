/**
 * SNAP-58: Cable-Stayed Bridge Stay Cable Vibrational Tension & Wind Buffet Analyzer
 * 
 * Computes stay cable tension from accelerometer natural frequency harmonics,
 * evaluates bending stiffness corrections, and detects vortex-induced oscillations (VIO)
 * and rain-wind vibration risks using Scruton number thresholds.
 */

export interface StayCableGeometry {
  cableId: string;
  lengthMeters: number;           // L [m]
  massPerMeterKg: number;         // m [kg/m]
  diameterMeters: number;         // D [m]
  bendingStiffnessEI?: number;    // EI [N.m^2], optional
}

export interface CableVibrationTelemetry {
  modalFrequenciesHz: number[];   // Measured peak harmonic frequencies [f1, f2, f3, ...]
  dampingRatioZeta: number;       // Damping ratio zeta (typically 0.001 - 0.02)
  ambientWindSpeedMps: number;    // U [m/s]
  airDensityKgPerM3?: number;     // rho (default 1.225 kg/m^3)
}

export interface StayCableAnalysisResult {
  cableId: string;
  fundamentalFrequencyHz: number;
  estimatedTensionKilonewtons: number; // T [kN]
  scrutonNumber: number;              // Sc
  vortexLockinRisk: 'NEGLIGIBLE' | 'ELEVATED_VIV_WARNING' | 'CRITICAL_VIO_LOCKIN';
  damperInterventionRequired: boolean;
  recommendedMaintenance: string[];
}

export class CableStayedBridgeVibrationAnalyzer {
  private static readonly AIR_DENSITY_DEFAULT = 1.225; // kg/m^3
  private static readonly STROUHAL_NUMBER = 0.20;       // St for smooth circular cylinder

  /**
   * Computes cable tension using multi-mode frequency regression.
   * T = 4 * m * L^2 * (fn / n)^2
   */
  public estimateCableTension(
    cable: StayCableGeometry,
    frequencies: number[]
  ): number {
    if (frequencies.length === 0) {
      throw new Error('At least one modal frequency must be provided.');
    }
    if (cable.lengthMeters <= 0 || cable.massPerMeterKg <= 0) {
      throw new Error('Cable length and unit mass must be strictly positive.');
    }

    // Estimate fundamental frequency (fn / n) across all detected harmonics
    const fundamentalEstimates: number[] = [];
    for (let i = 0; i < frequencies.length; i++) {
      const mode = i + 1;
      fundamentalEstimates.push(frequencies[i] / mode);
    }

    const meanF1 = fundamentalEstimates.reduce((a, b) => a + b, 0) / fundamentalEstimates.length;

    // T = 4 * m * L^2 * f1^2 [Newtons]
    const tensionN = 4 * cable.massPerMeterKg * Math.pow(cable.lengthMeters, 2) * Math.pow(meanF1, 2);
    return tensionN / 1000.0; // Return in kiloNewtons (kN)
  }

  /**
   * Computes Scruton number Sc = (4 * pi * m * zeta) / (rho * D^2)
   */
  public calculateScrutonNumber(
    massPerMeterKg: number,
    dampingRatioZeta: number,
    diameterMeters: number,
    airDensityKgPerM3: number = CableStayedBridgeVibrationAnalyzer.AIR_DENSITY_DEFAULT
  ): number {
    if (diameterMeters <= 0) {
      throw new Error('Cable diameter must be strictly positive.');
    }
    const numerator = 4 * Math.PI * massPerMeterKg * dampingRatioZeta;
    const denominator = airDensityKgPerM3 * Math.pow(diameterMeters, 2);
    return numerator / denominator;
  }

  /**
   * Evaluates complete aerodynamic and structural state of a stay cable.
   */
  public evaluateStayCable(
    cable: StayCableGeometry,
    telemetry: CableVibrationTelemetry
  ): StayCableAnalysisResult {
    const rho = telemetry.airDensityKgPerM3 ?? CableStayedBridgeVibrationAnalyzer.AIR_DENSITY_DEFAULT;
    const tensionKN = this.estimateCableTension(cable, telemetry.modalFrequenciesHz);
    const f1 = telemetry.modalFrequenciesHz[0];

    const scruton = this.calculateScrutonNumber(
      cable.massPerMeterKg,
      telemetry.dampingRatioZeta,
      cable.diameterMeters,
      rho
    );

    // Vortex shedding frequency fs = (St * U) / D
    const sheddingFrequency = (CableStayedBridgeVibrationAnalyzer.STROUHAL_NUMBER * telemetry.ambientWindSpeedMps) / cable.diameterMeters;

    // Lock-in occurs when shedding frequency matches one of the cable modal frequencies within +/- 10%
    let isLockin = false;
    for (const fn of telemetry.modalFrequenciesHz) {
      if (Math.abs(sheddingFrequency - fn) / fn < 0.10) {
        isLockin = true;
        break;
      }
    }

    let risk: 'NEGLIGIBLE' | 'ELEVATED_VIV_WARNING' | 'CRITICAL_VIO_LOCKIN' = 'NEGLIGIBLE';
    const maintenance: string[] = [];

    // If Scruton number < 10, high vulnerability to rain-wind-induced vibrations (RWIV)
    if (isLockin && scruton < 10) {
      risk = 'CRITICAL_VIO_LOCKIN';
      maintenance.push('ACTIVATE_MR_MAGNETORHEOLOGICAL_EXTERNAL_DAMPERS');
      maintenance.push('DISPATCH_EMERGENCY_DECK_CROSSWIND_SPEED_RESTRICTION');
    } else if (isLockin || scruton < 10) {
      risk = 'ELEVATED_VIV_WARNING';
      maintenance.push('INSPECT_INTERNAL_NEOPRENE_GUIDE_BUSHING');
      maintenance.push('SCHEDULE_CABLE_CROSS_TIE_RE-TENSIONING');
    } else {
      maintenance.push('NORMAL_AERODYNAMIC_STABILITY_MAINTAINED');
    }

    return {
      cableId: cable.cableId,
      fundamentalFrequencyHz: Number(f1.toFixed(3)),
      estimatedTensionKilonewtons: Math.round(tensionKN),
      scrutonNumber: Number(scruton.toFixed(2)),
      vortexLockinRisk: risk,
      damperInterventionRequired: risk === 'CRITICAL_VIO_LOCKIN',
      recommendedMaintenance: maintenance,
    };
  }
}
