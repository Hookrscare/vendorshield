/**
 * SNAP-55: Autonomous Dam Crest Seismic Liquefaction Settlement & Piezometric Pore Pressure Evaluator
 * 
 * Analyzes vibrating wire piezometer excess pore pressures, GNSS crest settlements, and
 * effective stress ratios (ru) post-seismic shaking to prevent catastrophic dam embankment liquefaction failures.
 */

export type DamSafetyLevel = 'NORMAL_STABLE' | 'ADVISORY_MONITORING' | 'WARNING_ELEVATED' | 'CRITICAL_EMERGENCY';

export interface PiezometerReading {
  sensorId: string;
  depthMeters: number;
  porePressureKPa: number;
  initialHydrostaticKPa: number;
  overburdenEffectiveStressKPa: number;
}

export interface DamCrestDisplacement {
  prismId: string;
  verticalSettlementMm: number;
  lateralDeflectionMm: number;
  currentFreeboardMeters: number;
}

export interface DamEvaluationSummary {
  maxPorePressureRatioRu: number;
  maxVerticalSettlementMm: number;
  minimumFreeboardMeters: number;
  liquefactionTriggered: boolean;
  safetyLevel: DamSafetyLevel;
  recommendedActions: string[];
}

export class DamSeismicPiezometricEvaluator {
  /**
   * Computes excess pore water pressure ratio ru = Delta_u / sigma'_v0
   */
  public calculateRu(reading: PiezometerReading): number {
    const deltaU = reading.porePressureKPa - reading.initialHydrostaticKPa;
    if (reading.overburdenEffectiveStressKPa <= 0) {
      throw new Error('Effective overburden stress must be strictly positive.');
    }
    const ru = deltaU / reading.overburdenEffectiveStressKPa;
    return Math.max(0, ru);
  }

  /**
   * Evaluates overall dam embankment safety combining piezometers and crest telemetry.
   */
  public evaluateDamStability(
    piezometers: PiezometerReading[],
    crestDisplacements: DamCrestDisplacement[]
  ): DamEvaluationSummary {
    if (piezometers.length === 0 || crestDisplacements.length === 0) {
      throw new Error('Piezometer readings and crest displacements must be provided.');
    }

    let maxRu = 0;
    for (const p of piezometers) {
      const ru = this.calculateRu(p);
      if (ru > maxRu) maxRu = ru;
    }

    let maxSettlementMm = 0;
    let minFreeboard = Infinity;

    for (const c of crestDisplacements) {
      if (c.verticalSettlementMm > maxSettlementMm) {
        maxSettlementMm = c.verticalSettlementMm;
      }
      if (c.currentFreeboardMeters < minFreeboard) {
        minFreeboard = c.currentFreeboardMeters;
      }
    }

    const liquefactionTriggered = maxRu >= 0.85;
    let safetyLevel: DamSafetyLevel = 'NORMAL_STABLE';
    const recommendedActions: string[] = [];

    if (liquefactionTriggered || minFreeboard < 0.50 || maxSettlementMm >= 150) {
      safetyLevel = 'CRITICAL_EMERGENCY';
      recommendedActions.push('TRIGGER_DOWNSTREAM_PUBLIC_EVACUATION_SIRENS');
      recommendedActions.push('OPEN_ALL_BOTTOM_OUTLETS_EMERGENCY_DRAWDOWN');
      recommendedActions.push('ACTIVATE_RELIEF_WELL_DEWATERING_PUMPS');
    } else if (maxRu >= 0.60 || maxSettlementMm >= 50 || minFreeboard < 1.50) {
      safetyLevel = 'WARNING_ELEVATED';
      recommendedActions.push('DISPATCH_EMERGENCY_GEOTECHNICAL_CORPS');
      recommendedActions.push('INITIATE_CONTROLLED_SPILLWAY_RESERVOIR_DRAWDOWN');
    } else if (maxRu >= 0.30 || maxSettlementMm >= 20) {
      safetyLevel = 'ADVISORY_MONITORING';
      recommendedActions.push('INCREASE_TELEMETRY_SAMPLING_RATE_TO_10HZ');
      recommendedActions.push('INSPECT_CREST_CRACK_COMPLIANCE');
    } else {
      safetyLevel = 'NORMAL_STABLE';
      recommendedActions.push('CONTINUE_ROUTINE_SEISMIC_STANDBY');
    }

    return {
      maxPorePressureRatioRu: Number(maxRu.toFixed(3)),
      maxVerticalSettlementMm: Number(maxSettlementMm.toFixed(1)),
      minimumFreeboardMeters: Number(minFreeboard.toFixed(2)),
      liquefactionTriggered,
      safetyLevel,
      recommendedActions,
    };
  }
}
