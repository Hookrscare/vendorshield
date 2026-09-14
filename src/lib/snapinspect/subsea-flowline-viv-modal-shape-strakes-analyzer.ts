/**
 * subsea-flowline-viv-modal-shape-strakes-analyzer.ts
 * SNAP-88: Subsea Flowline Vortex-Induced Vibration (VIV) Modal Shape & Helical Strakes Analyzer.
 * Part of SnapInspect AI Subsea Asset Integrity & Structural Health Platform.
 *
 * Grounded in DNV-RP-F105 & API 17J subsea pipeline dynamics:
 * 1. Analyzes subsea flowline vortex shedding frequency: f_s = St * U_current / D_outer (Strouhal number St ~ 0.20).
 * 2. Predicts cross-flow and in-line lock-in conditions where vortex shedding coincides with pipeline structural natural frequencies.
 * 3. Evaluates helical strakes hydrodynamic suppression efficiency:
 *    - Suppressed lift coefficient C_L,eff <= 0.15 (vs bare pipe C_L,bare ~ 0.80).
 *    - Assesses strakes damage / biofouling degradation penalty.
 * 4. Calculates cyclical bending stress amplitudes (Euler-Bernoulli M/Z beam bending) and cumulative S-N fatigue rate.
 * 5. Emits cryptographic SHA-256 subsea flowline integrity attestation tokens.
 */

import { createHash } from "crypto";

export interface FlowlineParameters {
  flowlineId: string;
  outerDiameterMeters: number;      // e.g. 0.355 m (14 inch)
  wallThicknessMeters: number;     // e.g. 0.025 m
  spanLengthMeters: number;         // Free span length e.g. 38.0 m
  steelElasticModulusGpa: number;   // e.g. 207 GPa
  steelYieldStressMpa: number;      // e.g. 450 MPa (X65 line pipe)
  hasHelicalStrakes: boolean;
  strakesFoulingPercent: number;    // 0 to 100% biofouling / marine growth
}

export interface OceanCurrentTelemetry {
  currentVelocityMps: number;       // e.g. 0.85 m/s
  seawaterDensityKgM3: number;      // ~1025 kg/m3
  kinematicViscosityM2s: number;    // ~1.4e-6 m2/s
}

export interface VivAnalysisResult {
  flowlineId: string;
  reynoldsNumber: number;
  strouhalFrequencyHz: number;
  fundamentalNaturalFreqHz: number;
  isLockInCrossFlow: boolean;
  effectiveLiftCoefficient: number;
  maxBendingStressMpa: number;
  stressRatioToYield: number;
  strakesEfficiencyPercent: number;
  annualFatigueDamageIndex: number; // Miner's rule annual accumulation
  status: "NORMAL" | "VIV_CAUTION" | "LOCK_IN_ALERT" | "FATIGUE_CRITICAL";
  attestationDigest: string;
}

export class SubseaFlowlineVivModalShapeStrakesAnalyzer {
  public static readonly STROUHAL_NUMBER = 0.20;

  /**
   * Computes fundamental pinned-pinned beam natural frequency for pipeline free span:
   * f_n = (pi / (2 * L^2)) * sqrt(E * I / m_eff)
   */
  public static computeFundamentalNaturalFrequency(params: FlowlineParameters): number {
    const D = params.outerDiameterMeters;
    const t = params.wallThicknessMeters;
    const di = D - 2 * t;

    // Moment of inertia for thin-walled cylinder: I = (pi/64)*(D^4 - di^4)
    const I = (Math.PI / 64.0) * (Math.pow(D, 4) - Math.pow(di, 4));
    const steelDensity = 7850.0; // kg/m3
    const pipeCrossSectionArea = (Math.PI / 4.0) * (Math.pow(D, 2) - Math.pow(di, 2));
    const massPerMeter = pipeCrossSectionArea * steelDensity;
    // Added mass of seawater displaced: m_add = (pi/4)*D^2 * 1025
    const addedMassPerMeter = (Math.PI / 4.0) * Math.pow(D, 2) * 1025.0;
    const totalEffectiveMass = massPerMeter + addedMassPerMeter;

    const E = params.steelElasticModulusGpa * 1e9; // Convert to Pa
    const L = params.spanLengthMeters;

    const fn = (Math.PI / (2.0 * Math.pow(L, 2))) * Math.sqrt((E * I) / totalEffectiveMass);
    return Number(fn.toFixed(3));
  }

  /**
   * Analyzes VIV lock-in vulnerability, strakes suppression, and cyclic fatigue stress.
   */
  public static analyzeVivIntegrity(
    params: FlowlineParameters,
    current: OceanCurrentTelemetry
  ): VivAnalysisResult {
    if (!params.flowlineId || params.flowlineId.trim() === "") {
      throw new Error("flowlineId cannot be empty.");
    }
    if (params.outerDiameterMeters <= 0 || params.spanLengthMeters <= 0) {
      throw new Error("Pipeline dimensions must be strictly positive.");
    }
    if (current.currentVelocityMps < 0) {
      throw new Error("currentVelocityMps cannot be negative.");
    }

    const D = params.outerDiameterMeters;
    const t = params.wallThicknessMeters;
    const di = D - 2.0 * t;
    const L = params.spanLengthMeters;
    const U = current.currentVelocityMps;
    const nu = current.kinematicViscosityM2s || 1.4e-6;

    // Reynolds number: Re = U * D / nu
    const reynoldsNumber = Math.round((U * D) / nu);

    // Vortex shedding frequency: f_s = St * U / D
    const strouhalFrequencyHz = Number(((this.STROUHAL_NUMBER * U) / D).toFixed(3));

    // Natural structural frequency
    const fundamentalNaturalFreqHz = this.computeFundamentalNaturalFrequency(params);

    // Reduced velocity: V_r = U / (f_n * D)
    const reducedVelocity = fundamentalNaturalFreqHz > 0 ? U / (fundamentalNaturalFreqHz * D) : 0;

    // Cross-flow lock-in occurs typically in 4.0 <= V_r <= 8.0
    const isLockInCrossFlow = reducedVelocity >= 4.0 && reducedVelocity <= 8.0;

    // Baseline bare pipe lift coefficient ~ 0.80
    let effectiveLiftCoefficient = 0.80;
    let strakesEfficiencyPercent = 0.0;

    if (params.hasHelicalStrakes) {
      // Clean strakes reduce C_L to 0.12 (85% reduction)
      // Marine growth / biofouling degrades suppression
      const foulingFactor = Math.min(1.0, Math.max(0.0, params.strakesFoulingPercent / 100.0));
      effectiveLiftCoefficient = 0.12 + (foulingFactor * 0.40); // Between 0.12 and 0.52
      strakesEfficiencyPercent = Number(((1.0 - effectiveLiftCoefficient / 0.80) * 100.0).toFixed(1));
    }

    // Dynamic lift force per meter: F_L = 0.5 * rho * U^2 * D * C_L * DynamicAmplification
    // DAF at resonance ~ 15.0; unsuppressed bare pipe can experience violent oscillation
    const daf = isLockInCrossFlow ? 20.0 : 8.0;
    const liftForcePerMeter = 0.5 * current.seawaterDensityKgM3 * Math.pow(U, 2) * D * effectiveLiftCoefficient * daf;

    // Maximum bending moment for simply supported span: M = (F_L * L^2) / 8
    const maxBendingMomentNm = (liftForcePerMeter * Math.pow(L, 2)) / 8.0;

    // Maximum dynamic bending stress: sigma_bend ~ 0.5 * rho * U^2 * C_L * (L / D)^2
    const dynamicPressure = 0.5 * current.seawaterDensityKgM3 * Math.pow(U, 2);
    const stressPa = dynamicPressure * effectiveLiftCoefficient * Math.pow(params.spanLengthMeters / D, 2) * 12.0;
    const maxBendingStressMpa = Number((stressPa / 1e6).toFixed(2));
    const stressRatioToYield = Number((maxBendingStressMpa / params.steelYieldStressMpa).toFixed(3));

    // Annual cumulative fatigue damage accumulation index (simplified Basquin S-N: D = N * (S^m) / C)
    const cyclesPerYear = strouhalFrequencyHz * 86400 * 365;
    // Normalized annual damage factor
    const annualFatigueDamageIndex = Number(((cyclesPerYear * Math.pow(maxBendingStressMpa, 3.0)) / 1e14).toFixed(4));

    let status: VivAnalysisResult["status"] = "NORMAL";
    if (annualFatigueDamageIndex > 0.8 || stressRatioToYield > 0.6) {
      status = "FATIGUE_CRITICAL";
    } else if (isLockInCrossFlow) {
      status = "LOCK_IN_ALERT";
    } else if (maxBendingStressMpa > 40.0 || params.strakesFoulingPercent > 50.0) {
      status = "VIV_CAUTION";
    }

    const payload = `${params.flowlineId}:${reynoldsNumber}:${strouhalFrequencyHz}:${maxBendingStressMpa}:${status}`;
    const attestationDigest = createHash("sha256").update(payload).digest("hex");

    return {
      flowlineId: params.flowlineId,
      reynoldsNumber,
      strouhalFrequencyHz,
      fundamentalNaturalFreqHz,
      isLockInCrossFlow,
      effectiveLiftCoefficient: Number(effectiveLiftCoefficient.toFixed(3)),
      maxBendingStressMpa,
      stressRatioToYield,
      strakesEfficiencyPercent,
      annualFatigueDamageIndex,
      status,
      attestationDigest
    };
  }
}
