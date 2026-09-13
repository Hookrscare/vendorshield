import { createHash } from 'crypto';

/**
 * SNAP-66: Suspended Cable-Stayed Bridge Main Stay Vibration Frequency Aerodynamic Damping Analyzer
 * 
 * Part of SnapInspect AI Tactical CAD & Infrastructure Health Suite.
 * Analyzes aeroelastic damping properties of cable-stayed bridge main stays:
 * 1. Modal decay ring-down logarithmic decrement (delta) and damping ratio (zeta).
 * 2. Scruton number calculation against PTI DC35.1 and fib Bulletin 89 criteria.
 * 3. Rain-Wind Induced Vibration (RWIV) and dry cable galloping instability envelope check.
 * 4. Supplemental external damper (viscous / MR) efficiency and location ratio (xd / L).
 * 5. Cryptographic SHA-256 inspection verification token.
 */

export interface StayCableAerodynamicSpec {
  cableId: string;
  spanLengthM: number;               // L (m)
  linearMassKgPerM: number;          // m (kg/m)
  outerDiameterM: number;            // D (m)
  fundamentalFreqHz: number;         // f1 (Hz)
  damperDistanceM?: number;          // x_d (m from deck anchorage)
}

export interface AeroVibrationTelemetry {
  amplitudeDecaySeriesMm: number[];  // Successive peak displacement amplitudes [A0, A1, ... An]
  windSpeedMPerS: number;            // Ambient mean wind velocity U (m/s)
  windYawAngleDeg: number;           // Angle of attack relative to cable axis
  rainfallMmPerHour: number;         // Precipitation rate (mm/h)
  airDensityKgPerM3?: number;        // Default: 1.225 kg/m^3
}

export type AeroStabilityRegime =
  | 'STABLE_SUFFICIENT_DAMPING'
  | 'ELEVATED_VIV_SENSITIVITY'
  | 'RWIV_UNSTABLE_RISK'
  | 'DRY_GALLOPING_DANGER'
  | 'CRITICAL_NEGATIVE_DAMPING';

export interface AerodynamicDampingAssessment {
  cableId: string;
  measuredLogDecrement: number;      // delta = ln(A0/An) / n
  measuredDampingRatioZeta: number;  // zeta = delta / (2 * pi)
  scrutonNumber: number;             // Sc = (2 * m * delta) / (rho * D^2)
  ptiComplianceSatisfied: boolean;   // Requires delta >= 0.05 and no unmitigated RWIV risk
  criticalWindVelocityMPerS: number; // U_cr = (f1 * D) / St (St = 0.20)
  maxTheoreticalDamperDamping: number; // zeta_max ~ 0.5 * (xd / L)
  regime: AeroStabilityRegime;
  recommendedActions: string[];
  auditHashToken: string;
}

export class BridgeStayAerodynamicDampingAnalyzer {
  private static readonly STROUHAL_NUMBER = 0.20;
  private static readonly AIR_DENSITY_DEFAULT = 1.225; // kg/m^3
  private static readonly PTI_MIN_LOG_DEC = 0.05;
  private static readonly PTI_MIN_SCRUTON = 10.0;

  /**
   * Evaluates aeroelastic damping, Scruton number, and instability risks for a stay cable.
   */
  public analyze(
    spec: StayCableAerodynamicSpec,
    telemetry: AeroVibrationTelemetry
  ): AerodynamicDampingAssessment {
    if (spec.spanLengthM <= 0 || spec.linearMassKgPerM <= 0 || spec.outerDiameterM <= 0) {
      throw new Error('Cable geometry parameters (L, m, D) must be strictly positive.');
    }
    if (spec.fundamentalFreqHz <= 0) {
      throw new Error('Fundamental modal frequency must be strictly positive.');
    }
    if (!telemetry.amplitudeDecaySeriesMm || telemetry.amplitudeDecaySeriesMm.length < 2) {
      throw new Error('At least two peak amplitude measurements required for logarithmic decrement.');
    }

    const peaks = telemetry.amplitudeDecaySeriesMm;
    const n = peaks.length - 1;
    const a0 = Math.max(1e-6, peaks[0]);
    const an = Math.max(1e-6, peaks[n]);

    // Logarithmic Decrement: delta = (1/n) * ln(A0 / An)
    const logDec = Math.max(0.0001, (1.0 / n) * Math.log(a0 / an));
    const zeta = logDec / (2.0 * Math.PI);

    const rho = telemetry.airDensityKgPerM3 ?? BridgeStayAerodynamicDampingAnalyzer.AIR_DENSITY_DEFAULT;
    const D = spec.outerDiameterM;
    const m = spec.linearMassKgPerM;

    // Scruton number: Sc = (2 * m * delta) / (rho * D^2)
    const scruton = (2.0 * m * logDec) / (rho * Math.pow(D, 2));

    // Strouhal critical vortex lock-in velocity
    const uCritical = (spec.fundamentalFreqHz * D) / BridgeStayAerodynamicDampingAnalyzer.STROUHAL_NUMBER;

    // Maximum theoretical damping from supplemental damper at xd:
    // zeta_max ~ 0.5 * (xd / L)
    let maxDamperZeta = 0.0;
    if (spec.damperDistanceM && spec.damperDistanceM > 0) {
      maxDamperZeta = 0.5 * (spec.damperDistanceM / spec.spanLengthM);
    }

    // Aeroelastic instability check
    const u = telemetry.windSpeedMPerS;
    const yaw = telemetry.windYawAngleDeg;
    const isRaining = telemetry.rainfallMmPerHour > 0.5;

    let regime: AeroStabilityRegime = 'STABLE_SUFFICIENT_DAMPING';
    const actions: string[] = [];

    // Rain-Wind Induced Vibration (RWIV) occurs typically between 6 - 18 m/s, yaw 20-65 deg, delta < 0.05
    const inRwivVelocityRange = u >= 6.0 && u <= 18.0;
    const inRwivYawRange = yaw >= 20.0 && yaw <= 65.0;

    if (logDec < 0.01 && u > 20.0) {
      regime = 'CRITICAL_NEGATIVE_DAMPING';
      actions.push('EMERGENCY: Negative aerodynamic damping detected. High-velocity divergent flutter threat.');
      actions.push('Deploy immediate bridge traffic restrictions and engage auxiliary tuned mass dampers.');
    } else if (isRaining && inRwivVelocityRange && inRwivYawRange && logDec < BridgeStayAerodynamicDampingAnalyzer.PTI_MIN_LOG_DEC) {
      regime = 'RWIV_UNSTABLE_RISK';
      actions.push('Aeroelastic instability: Rain-Wind Induced Vibration (RWIV) rivulet formation conditions matched.');
      actions.push('Inspect stay surface aerodynamic dimples / double-helical ribs for wear.');
      actions.push('Retune supplemental external viscous damper fluid viscosity.');
    } else if (u > 15.0 && scruton < 8.0) {
      regime = 'DRY_GALLOPING_DANGER';
      actions.push('Dry cable galloping potential: Scruton number below threshold under high shear wind.');
      actions.push('Increase supplemental damping to achieve delta >= 0.05.');
    } else if (logDec < BridgeStayAerodynamicDampingAnalyzer.PTI_MIN_LOG_DEC) {
      regime = 'ELEVATED_VIV_SENSITIVITY';
      actions.push('Stay cable fails PTI DC35.1 minimum damping criteria (delta < 0.05).');
      actions.push('Schedule non-urgent recalibration of external damper bracket.');
    } else {
      regime = 'STABLE_SUFFICIENT_DAMPING';
      actions.push('Damping properties conform to PTI DC35.1 / fib Bulletin 89 aeroelastic design guidelines.');
    }

    // PTI DC35.1 compliance: delta >= 0.05 and no active aeroelastic instability regime
    const ptiSatisfied = logDec >= BridgeStayAerodynamicDampingAnalyzer.PTI_MIN_LOG_DEC &&
      regime === 'STABLE_SUFFICIENT_DAMPING';

    // Cryptographic audit token
    const tokenPayload = JSON.stringify({
      cableId: spec.cableId,
      delta: Math.round(logDec * 10000) / 10000,
      Sc: Math.round(scruton * 100) / 100,
      regime,
      ptiSatisfied
    });
    const auditHash = createHash('sha256').update(tokenPayload).digest('hex');

    return {
      cableId: spec.cableId,
      measuredLogDecrement: Math.round(logDec * 10000) / 10000,
      measuredDampingRatioZeta: Math.round(zeta * 10000) / 10000,
      scrutonNumber: Math.round(scruton * 100) / 100,
      ptiComplianceSatisfied: ptiSatisfied,
      criticalWindVelocityMPerS: Math.round(uCritical * 100) / 100,
      maxTheoreticalDamperDamping: Math.round(maxDamperZeta * 10000) / 10000,
      regime,
      recommendedActions: actions,
      auditHashToken: auditHash
    };
  }
}
