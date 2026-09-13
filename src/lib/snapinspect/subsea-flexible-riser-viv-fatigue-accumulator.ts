/**
 * subsea-flexible-riser-viv-fatigue-accumulator.ts
 * SNAP-78: Offshore Subsea Flexible Riser Hydrodynamic Vortex-Induced Vibration (VIV) Fatigue Life Accumulator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile NDT.
 *
 * Grounded in API RP 2RD and DNV-RP-F204 offshore subsea risers:
 * 1. Evaluates cross-flow vortex-induced vibration (VIV) lock-in across marine current shear velocity profiles.
 * 2. Applies Strouhal number (St ≈ 0.2) to calculate shedding frequency: f_s = St * U / D.
 * 3. Quantifies cyclic stress amplitudes using S-N curves (DNV-RP-C203 Curve D in seawater with cathodic protection).
 * 4. Accumulates fatigue damage via Palmgren-Miner linear damage rule: D_total = sum(n_i / N_i).
 * 5. Projects remaining operational service life in years against design safety factors (DSF = 10).
 */

export interface RiserHydrodynamicProfile {
  riserOuterDiameterMeters: number;       // e.g. 0.35m (14-inch riser)
  currentVelocityMs: number;              // Ocean current flow speed (m/s)
  naturalFrequencyHz: number;             // Riser fundamental / harmonic bending mode frequency (Hz)
  waterDepthMeters: number;               // Operational depth (m)
}

export interface StressCycleBlock {
  stressRangeMpa: number;                 // Cyclic stress range Delta sigma (MPa)
  observedCycles: number;                 // Number of recorded vibration cycles
}

export interface VivFatigueAssessment {
  sheddingFrequencyHz: number;
  isLockInCondition: boolean;
  cumulativeMinerDamageIndex: number;     // D_total
  designFatigueFactor: number;            // API / DNV standard factor (e.g. 10.0 for critical riser)
  isCriticalFatigueExceeded: boolean;
  projectedFatigueLifeYears: number;
  tacticalInspectionDirective: string;
}

export class SubseaFlexibleRiserVivFatigueAccumulator {
  private static readonly STROUHAL_NUMBER = 0.20;
  // DNV-RP-C203 Curve D in seawater with cathodic protection: log10(N) = log10(a1) - m1 * log10(Delta sigma)
  // For Delta sigma >= 52.63 MPa: log10(a1) = 11.764, m1 = 3.0. For Delta sigma < 52.63: log10(a2) = 15.606, m2 = 5.0
  private static readonly LOG_A1 = 11.764;
  private static readonly M1 = 3.0;
  private static readonly LOG_A2 = 15.606;
  private static readonly M2 = 5.0;
  private static readonly TRANSITION_STRESS = 52.63;

  public static evaluateVivAndFatigue(
    riser: RiserHydrodynamicProfile,
    stressBlocks: StressCycleBlock[],
    observedPeriodHours: number = 24.0,
    designFatigueFactor: number = 10.0
  ): VivFatigueAssessment {
    if (riser.riserOuterDiameterMeters <= 0 || riser.currentVelocityMs < 0 || riser.naturalFrequencyHz <= 0) {
      throw new Error("Invalid riser hydrodynamic parameters: diameter and frequencies must be positive.");
    }

    // Shedding frequency f_s = St * U / D
    const sheddingFrequencyHz = Number(
      ((this.STROUHAL_NUMBER * riser.currentVelocityMs) / riser.riserOuterDiameterMeters).toFixed(3)
    );

    // Lock-in occurs when shedding frequency matches natural modal frequency within +/- 15%
    const frequencyRatio = sheddingFrequencyHz / riser.naturalFrequencyHz;
    const isLockInCondition = frequencyRatio >= 0.85 && frequencyRatio <= 1.15;

    // Accumulate Palmgren-Miner fatigue damage D = sum(n_i / N_i)
    let totalMinerDamage = 0;

    for (const block of stressBlocks) {
      if (block.stressRangeMpa <= 0 || block.observedCycles <= 0) continue;

      let allowableCyclesN: number;
      if (block.stressRangeMpa >= this.TRANSITION_STRESS) {
        // N = 10^(log_a1) / (Delta_sigma^m1)
        allowableCyclesN = Math.pow(10, this.LOG_A1) / Math.pow(block.stressRangeMpa, this.M1);
      } else {
        allowableCyclesN = Math.pow(10, this.LOG_A2) / Math.pow(block.stressRangeMpa, this.M2);
      }

      totalMinerDamage += block.observedCycles / allowableCyclesN;
    }

    // Allowable annual damage budget considering Design Fatigue Factor (DFF)
    // Damage limit D_allow = 1.0 / DFF
    const allowableDamageLimit = 1.0 / designFatigueFactor;
    const isCriticalFatigueExceeded = totalMinerDamage >= allowableDamageLimit;

    // Project remaining operational years assuming observed period represents steady sea-state
    const observedPeriodYears = observedPeriodHours / (24 * 365.25);
    const damageRatePerYear = totalMinerDamage / (observedPeriodYears || 1);
    const projectedFatigueLifeYears = damageRatePerYear > 0 
      ? Number((allowableDamageLimit / damageRatePerYear).toFixed(2))
      : 999.0;

    let tacticalInspectionDirective: string;
    if (isCriticalFatigueExceeded) {
      tacticalInspectionDirective = "CRITICAL: Miner damage limit exceeded under DFF 10.0. Dispatch subsea ROV for phased array ultrasonic inspection of riser touch-down zone immediately.";
    } else if (isLockInCondition) {
      tacticalInspectionDirective = "WARNING: Hydrodynamic lock-in detected. Cross-flow vortex shedding aligns with riser bending mode. Deploy hydrodynamic strakes or buoyancy module fairings.";
    } else {
      tacticalInspectionDirective = "NOMINAL: Vortex shedding outside lock-in band. Cumulative fatigue within design safety envelope.";
    }

    return {
      sheddingFrequencyHz,
      isLockInCondition,
      cumulativeMinerDamageIndex: Number(totalMinerDamage.toExponential(4)),
      designFatigueFactor,
      isCriticalFatigueExceeded,
      projectedFatigueLifeYears,
      tacticalInspectionDirective
    };
  }
}
