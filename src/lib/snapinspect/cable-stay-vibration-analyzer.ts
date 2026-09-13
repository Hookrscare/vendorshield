/**
 * cable-stay-vibration-analyzer.ts
 * SNAP-66: Suspended Cable-Stayed Bridge Main Stay Vibration Frequency Aerodynamic Damping Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & NDT Diagnostics.
 *
 * Civil infrastructure dynamics analyzer for cable-stayed bridge health:
 * 1. Computes stay natural eigenfrequencies: f_n = (n / 2L) * sqrt(T / m).
 * 2. Inverts measured modal peaks to estimate cable tension and identify loss-of-prestress.
 * 3. Evaluates aerodynamic instability via the Scruton number: Sc = (2 * m * zeta) / (rho * D^2).
 * 4. Flags rain-wind induced vibration (RWIV) risks when Sc < 10 and sizes internal dampening retrofits.
 */

export interface CableStayProperties {
  stayId: string;
  lengthMeters: number;              // e.g. 150m
  massPerUnitLengthKgPerM: number;   // e.g. 45 kg/m
  outerDiameterMeters: number;       // e.g. 0.20m (200mm HDPE stay pipe)
  nominalDesignTensionKn: number;    // e.g. 3500 kN
}

export interface StayVibrationTelemetry {
  modalFrequenciesHz: number[];      // e.g. [1.2, 2.4, 3.6, 4.8]
  amplitudeDecayEnvelope: number[];  // successive peak amplitudes for log-decrement
  ambientWindSpeedMPerSec: number;
}

export interface StayAeroDampingReport {
  stayId: string;
  estimatedTensionKn: number;
  tensionDeviationPercent: number;
  logarithmicDecrement: number;
  dampingRatioZeta: number;
  scrutonNumber: number;
  aerodynamicVibrationRisk: 'STABLE' | 'MODERATE_VORTEX_SHEDDING' | 'CRITICAL_RAIN_WIND_INSTABILITY';
  recommendedIntervention: string;
}

export class CableStayVibrationAnalyzer {
  public static readonly AIR_DENSITY_KG_PER_M3 = 1.225;

  /**
   * Estimates cable tension from harmonic modal spacing delta_f:
   * delta_f = (1 / 2L) * sqrt(T / m)  =>  T = m * (2 * L * delta_f)^2
   */
  public static estimateTension(
    lengthM: number,
    massPerUnitLengthKgM: number,
    modalFrequenciesHz: number[]
  ): number {
    if (modalFrequenciesHz.length < 2) {
      const f1 = modalFrequenciesHz[0] || 1.0;
      const tNewtons = massPerUnitLengthKgM * Math.pow(2.0 * lengthM * f1, 2);
      return Math.round((tNewtons / 1000.0) * 10) / 10;
    }

    // Compute average modal spacing
    let sumDelta = 0;
    for (let i = 1; i < modalFrequenciesHz.length; i++) {
      sumDelta += (modalFrequenciesHz[i] - modalFrequenciesHz[i - 1]);
    }
    const avgDeltaF = sumDelta / (modalFrequenciesHz.length - 1);
    const tNewtons = massPerUnitLengthKgM * Math.pow(2.0 * lengthM * avgDeltaF, 2);
    return Math.round((tNewtons / 1000.0) * 10) / 10;
  }

  /**
   * Computes logarithmic decrement delta = (1/k) * ln(A_0 / A_k)
   * and critical damping ratio zeta = delta / (2 * pi)
   */
  public static computeDampingRatio(decayPeaks: number[]): { logDec: number; zeta: number } {
    if (decayPeaks.length < 2 || decayPeaks[0] <= 0) {
      return { logDec: 0.005, zeta: 0.0008 };
    }

    const k = decayPeaks.length - 1;
    const a0 = Math.max(1e-6, decayPeaks[0]);
    const ak = Math.max(1e-6, decayPeaks[k]);

    const logDec = Math.max(0.001, (1.0 / k) * Math.log(a0 / ak));
    const zeta = logDec / (2.0 * Math.PI);

    return {
      logDec: Math.round(logDec * 10000) / 10000,
      zeta: Math.round(zeta * 10000) / 10000
    };
  }

  /**
   * Computes Scruton Number: Sc = (2 * m * zeta) / (rho * D^2)
   */
  public static computeScrutonNumber(
    massPerUnitLengthKgM: number,
    zeta: number,
    outerDiameterM: number
  ): number {
    const denom = this.AIR_DENSITY_KG_PER_M3 * (outerDiameterM * outerDiameterM);
    const sc = (2.0 * massPerUnitLengthKgM * zeta) / Math.max(1e-6, denom);
    return Math.round(sc * 10) / 10;
  }

  public static evaluateStay(
    props: CableStayProperties,
    telemetry: StayVibrationTelemetry
  ): StayAeroDampingReport {
    const estTensionKn = this.estimateTension(
      props.lengthMeters,
      props.massPerUnitLengthKgPerM,
      telemetry.modalFrequenciesHz
    );

    const devPercent = Math.round(((estTensionKn - props.nominalDesignTensionKn) / props.nominalDesignTensionKn) * 1000) / 10;

    const { logDec, zeta } = this.computeDampingRatio(telemetry.amplitudeDecayEnvelope);
    const scruton = this.computeScrutonNumber(props.massPerUnitLengthKgPerM, zeta, props.outerDiameterMeters);

    let risk: StayAeroDampingReport['aerodynamicVibrationRisk'] = 'STABLE';
    let intervention = 'Cable stay dynamic parameters within standard FIB Bulletin 30 specifications.';

    if (scruton < 10.0) {
      risk = 'CRITICAL_RAIN_WIND_INSTABILITY';
      intervention = 'MANDATORY INTERVENTION: Scruton number < 10. Install external high-viscosity elastomeric or magnetorheological (MR) dampers at guide pipe.';
    } else if (scruton < 15.0) {
      risk = 'MODERATE_VORTEX_SHEDDING';
      intervention = 'Inspect helical fillet dimpled aerodynamic HDPE sheath for wear and retension internal dampers.';
    }

    return {
      stayId: props.stayId,
      estimatedTensionKn: estTensionKn,
      tensionDeviationPercent: devPercent,
      logarithmicDecrement: logDec,
      dampingRatioZeta: zeta,
      scrutonNumber: scruton,
      aerodynamicVibrationRisk: risk,
      recommendedIntervention: intervention
    };
  }
}
