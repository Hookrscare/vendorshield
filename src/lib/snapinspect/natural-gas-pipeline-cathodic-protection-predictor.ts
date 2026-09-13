/**
 * natural-gas-pipeline-cathodic-protection-predictor.ts
 * SNAP-61: High-Pressure Natural Gas Pipeline Cathodic Protection Voltage Drop Predictor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements NACE SP0169 & ISO 15589-1 Cathodic Protection (CP) attenuation modeling:
 * 1. Computes longitudinal pipe resistance Rm and coating-to-electrolyte resistance Rc.
 * 2. Evaluates pipe-to-soil potential profile E(x) along pipeline distance from ICCP groundbeds.
 * 3. Verifies polarized potential against NACE -850 mV CSE criterion (instant-off).
 * 4. Assesses over-protection risk (< -1200 mV CSE) causing coating disbondment and hydrogen embrittlement.
 * 5. Recommends intermediate galvanic ribbon or sacrificial magnesium/zinc anode placement for under-protected segments.
 */

export interface PipelineParameters {
  lengthMeters: number;
  outerDiameterMeters: number;
  wallThicknessMeters: number;
  steelResistivityOhmMeter?: number; // Default 1.8e-7 for carbon steel (X52-X80)
  coatingQuality: 'EXCELLENT_FBE' | 'GOOD_3LPE' | 'DEGRADED_COAL_TAR' | 'POOR_ASPHALT';
  soilResistivityOhmMeter: number; // e.g., 50 Ohm-m
  nativePotentialMvCse?: number;   // e.g., -600 mV CSE
  drainagePointPotentialMvCse: number; // e.g., -1150 mV CSE
}

export interface CathodicProtectionStation {
  distanceMeters: number;
  pipeToSoilPotentialMvCse: number;
  isCriterionSatisfied: boolean; // Must be <= -850 mV CSE
  isOverProtected: boolean;      // Potential < -1200 mV CSE (risk of hydrogen-induced cracking / disbondment)
  status: 'COMPLIANT' | 'OVER_PROTECTED' | 'UNDER_PROTECTED';
}

export interface CathodicProtectionAssessment {
  attenuationConstantAlpha: number; // 1/m
  characteristicResistanceOhm: number;
  totalCurrentDemandAmps: number;
  stations: CathodicProtectionStation[];
  overallCompliance: boolean;
  minPolarizedPotentialMvCse: number;
  maxPolarizedPotentialMvCse: number;
  recommendations: string[];
}

export class NaturalGasPipelineCathodicProtectionPredictor {
  private static readonly DEFAULT_STEEL_RESISTIVITY = 1.8e-7; // Ohm-m
  private static readonly NACE_CRITERION_MV = -850;           // mV CSE
  private static readonly OVERPROTECTION_LIMIT_MV = -1200;    // mV CSE
  private static readonly DEFAULT_NATIVE_POTENTIAL_MV = -600; // mV CSE

  private static getCoatingResistivity(quality: PipelineParameters['coatingQuality']): number {
    switch (quality) {
      case 'GOOD_3LPE': return 100000; // Ohm-m2
      case 'EXCELLENT_FBE': return 50000;  // Ohm-m2
      case 'DEGRADED_COAL_TAR': return 5000; // Ohm-m2
      case 'POOR_ASPHALT': return 1000;    // Ohm-m2
      default: return 10000;
    }
  }

  public static predictAttenuation(
    pipeline: PipelineParameters,
    samplingIntervalMeters: number = 1000
  ): CathodicProtectionAssessment {
    const steelResistivity = pipeline.steelResistivityOhmMeter || this.DEFAULT_STEEL_RESISTIVITY;
    const nativePotential = pipeline.nativePotentialMvCse || this.DEFAULT_NATIVE_POTENTIAL_MV;
    const drainagePotential = pipeline.drainagePointPotentialMvCse;

    // Cross-sectional metal area of pipe wall: A = pi * (D - t) * t
    const crossSectionArea = Math.PI * (pipeline.outerDiameterMeters - pipeline.wallThicknessMeters) * pipeline.wallThicknessMeters;
    // Longitudinal metal resistance per meter: Rm = rho / A (Ohm/m)
    const Rm = steelResistivity / crossSectionArea;

    // Pipe circumferential outer area per meter: Ac = pi * D (m2/m)
    const circumAreaPerMeter = Math.PI * pipeline.outerDiameterMeters;
    const coatingUnitResistance = this.getCoatingResistivity(pipeline.coatingQuality);
    // Radial resistance to earth per meter: Rc = R_coating / Ac (Ohm * m)
    const Rc = coatingUnitResistance / circumAreaPerMeter;

    // Attenuation factor: alpha = sqrt(Rm / Rc) (1/m)
    const alpha = Math.sqrt(Rm / Rc);
    // Characteristic resistance: Z0 = sqrt(Rm * Rc) (Ohm)
    const Z0 = Math.sqrt(Rm * Rc);

    // Initial driving shift at drainage feed point: Delta E0 (mV)
    const deltaE0 = drainagePotential - nativePotential; // Negative value (e.g. -1150 - (-600) = -550 mV)

    const stations: CathodicProtectionStation[] = [];
    const recommendations: string[] = [];
    let minPot = 0;
    let maxPot = -Infinity;
    let anyUnderProtected = false;
    let anyOverProtected = false;

    const numPoints = Math.max(2, Math.floor(pipeline.lengthMeters / samplingIntervalMeters) + 1);
    for (let i = 0; i < numPoints; i++) {
      const x = Math.min(pipeline.lengthMeters, i * samplingIntervalMeters);

      // Transmission line attenuation formula for finite open-ended pipeline:
      // Delta E(x) = Delta E0 * cosh(alpha * (L - x)) / cosh(alpha * L)
      const numerator = Math.cosh(alpha * (pipeline.lengthMeters - x));
      const denominator = Math.cosh(alpha * pipeline.lengthMeters);
      const deltaEx = deltaE0 * (numerator / denominator);

      const pot = nativePotential + deltaEx;

      if (i === 0 || pot < minPot) minPot = pot;
      if (pot > maxPot) maxPot = pot;

      // In cathodic protection (negative scale), more negative = more polarized.
      // Criterion: pot <= -850 mV
      const isCriterionSatisfied = pot <= this.NACE_CRITERION_MV;
      const isOverProtected = pot < this.OVERPROTECTION_LIMIT_MV;

      let status: CathodicProtectionStation['status'] = 'COMPLIANT';
      if (isOverProtected) {
        status = 'OVER_PROTECTED';
        anyOverProtected = true;
      } else if (!isCriterionSatisfied) {
        status = 'UNDER_PROTECTED';
        anyUnderProtected = true;
      }

      stations.push({
        distanceMeters: x,
        pipeToSoilPotentialMvCse: Math.round(pot * 10) / 10,
        isCriterionSatisfied,
        isOverProtected,
        status
      });
    }

    // Total current demand I0 = |Delta E0| / Z0 * tanh(alpha * L)
    const deltaE0Volts = Math.abs(deltaE0) / 1000.0;
    const totalCurrentDemandAmps = (deltaE0Volts / Z0) * Math.tanh(alpha * pipeline.lengthMeters);

    if (anyOverProtected) {
      recommendations.push(
        'REDUCE_RECTIFIER_OUTPUT: Drainage point potential exceeds -1200 mV CSE. Risk of cathodic disbondment and hydrogen embrittlement.'
      );
    }
    if (anyUnderProtected) {
      recommendations.push(
        'INSTALL_INTERMEDIATE_ANODES: Far-end potential depolarizes above -850 mV CSE. Install supplemental magnesium sacrificial anode groundbed.'
      );
    }
    if (!anyOverProtected && !anyUnderProtected) {
      recommendations.push('OPTIMAL: Full pipeline length meets NACE SP0169 polarized potential criteria.');
    }

    return {
      attenuationConstantAlpha: Number(alpha.toExponential(4)),
      characteristicResistanceOhm: Math.round(Z0 * 1000) / 1000,
      totalCurrentDemandAmps: Math.round(totalCurrentDemandAmps * 100) / 100,
      stations,
      overallCompliance: !anyOverProtected && !anyUnderProtected,
      minPolarizedPotentialMvCse: Math.round(minPot * 10) / 10,
      maxPolarizedPotentialMvCse: Math.round(maxPot * 10) / 10,
      recommendations
    };
  }
}
