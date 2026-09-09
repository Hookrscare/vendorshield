/**
 * SNAP-31: High-Precision Multi-Sensor Concrete Slab Moisture Relative Humidity Profiler.
 * Implements ASTM F2170 in-situ probe depth compliance, ASTM F1869 MVER vapor emission analysis,
 * flooring adhesive compatibility risk matrix, and slab drying time maturity estimation.
 */

export type SlabDryingCondition = 'SINGLE_SIDE_ON_GRADE' | 'SUSPENDED_DUAL_SIDE';

export type FlooringCoveringType =
  | 'EPOXY_COATING'
  | 'LUXURY_VINYL_TILE'
  | 'HARDWOOD_ENGINEERED'
  | 'CARPET_PERMEABLE'
  | 'CERAMIC_TILE';

export type MoistureRiskLevel = 'LOW_PASS' | 'MODERATE_MONITOR' | 'HIGH_FAIL_RISK' | 'CRITICAL_FAIL';

export interface ConcreteProbeReading {
  probeId: string;
  depthInches: number;
  relativeHumidityPct: number;
  temperatureCelsius: number;
  locationDescription?: string;
}

export interface SlabSpecification {
  totalThicknessInches: number;
  dryingCondition: SlabDryingCondition;
  waterCementRatio: number; // e.g. 0.45 - 0.60
  slabAgeDays: number;
  ambientTempCelsius: number;
  ambientRHPct: number;
}

export interface FlooringCompatibilityAssessment {
  flooringType: FlooringCoveringType;
  maxAllowableRHPct: number;
  maxAllowableMverLbs: number;
  measuredRHPct: number;
  estimatedMverLbs: number;
  riskLevel: MoistureRiskLevel;
  isCompliant: boolean;
  warrantyRisk: string;
}

export interface ConcreteMoistureProfileReport {
  timestampIso: string;
  totalProbes: number;
  averageRHPct: number;
  maxRHPct: number;
  minRHPct: number;
  depthCompliancePct: number;
  probesNonCompliantDepth: string[];
  estimatedMverLbsPer1000SqFt24Hr: number;
  estimatedDaysToReach75PctRH: number;
  flooringAssessments: FlooringCompatibilityAssessment[];
  overallRecommendation: string;
}

const FLOORING_THRESHOLDS: Record<FlooringCoveringType, { maxRH: number; maxMver: number }> = {
  EPOXY_COATING: { maxRH: 75, maxMver: 3.0 },
  HARDWOOD_ENGINEERED: { maxRH: 75, maxMver: 3.0 },
  LUXURY_VINYL_TILE: { maxRH: 85, maxMver: 5.0 },
  CARPET_PERMEABLE: { maxRH: 90, maxMver: 8.0 },
  CERAMIC_TILE: { maxRH: 95, maxMver: 10.0 }
};

export class ConcreteSlabMoistureProfiler {
  /**
   * Validates probe depth according to ASTM F2170:
   * - 40% (±5%) of slab thickness for single-side drying (slab on grade / vapor retarder)
   * - 20% (±5%) of slab thickness for dual-side drying (suspended slab)
   */
  public static verifyProbeDepthCompliance(
    depthInches: number,
    thicknessInches: number,
    condition: SlabDryingCondition
  ): { isCompliant: boolean; targetDepthInches: number; toleranceInches: number } {
    const targetRatio = condition === 'SINGLE_SIDE_ON_GRADE' ? 0.40 : 0.20;
    const targetDepth = thicknessInches * targetRatio;
    const tolerance = thicknessInches * 0.05; // ±5% of thickness

    const isCompliant = Math.abs(depthInches - targetDepth) <= tolerance;
    return {
      isCompliant,
      targetDepthInches: Math.round(targetDepth * 100) / 100,
      toleranceInches: Math.round(tolerance * 100) / 100
    };
  }

  /**
   * Converts in-situ %RH to approximate MVER (lbs/1000 sq ft / 24 hr)
   * using standard empirical moisture diffusion relationships for 4-6" normal-weight concrete.
   */
  public static estimateMverFromRH(rhPct: number): number {
    if (rhPct <= 50) return 1.0;
    // Empirical exponential moisture flux relationship: MVER ≈ 1.5 * exp(0.045 * (RH - 50))
    const mver = 1.5 * Math.exp(0.045 * (rhPct - 50));
    return Math.round(mver * 10) / 10;
  }

  /**
   * Projects drying timeline to reach 75% RH based on Fickian diffusion rule-of-thumb:
   * Normal weight concrete takes ~30 days per inch of thickness to dry to 75-80% RH under standard 70°F/50% RH ambient.
   */
  public static estimateDaysRemainingToTargetRH(
    currentRHPct: number,
    targetRHPct: number,
    thicknessInches: number,
    waterCementRatio: number
  ): number {
    if (currentRHPct <= targetRHPct) return 0;

    const baseDaysPerInch = 30 * (waterCementRatio / 0.50);
    const totalDryingDays = baseDaysPerInch * thicknessInches;
    const remainingFraction = (currentRHPct - targetRHPct) / (100 - targetRHPct);

    return Math.max(0, Math.round(totalDryingDays * remainingFraction));
  }

  /**
   * Evaluates flooring adhesive compatibility across standard finishes.
   */
  public static assessFlooringRisk(
    type: FlooringCoveringType,
    measuredRHPct: number,
    estimatedMver: number
  ): FlooringCompatibilityAssessment {
    const limits = FLOORING_THRESHOLDS[type];
    const isCompliant = measuredRHPct <= limits.maxRH && estimatedMver <= limits.maxMver;

    let riskLevel: MoistureRiskLevel = 'LOW_PASS';
    let warrantyRisk = 'Low risk. Adhesive warranty valid under standard installation specifications.';

    if (measuredRHPct > limits.maxRH + 8 || estimatedMver > limits.maxMver + 3) {
      riskLevel = 'CRITICAL_FAIL';
      warrantyRisk = 'Extreme risk: catastrophic adhesive saponification, blistering, and debonding imminent.';
    } else if (measuredRHPct > limits.maxRH || estimatedMver > limits.maxMver) {
      riskLevel = 'HIGH_FAIL_RISK';
      warrantyRisk = 'High risk: exceeds manufacturer moisture threshold. Requires topical epoxy vapor barrier.';
    } else if (measuredRHPct >= limits.maxRH - 5) {
      riskLevel = 'MODERATE_MONITOR';
      warrantyRisk = 'Moderate risk: near upper warranty threshold. Re-test in 48 hours prior to adhesive application.';
    }

    return {
      flooringType: type,
      maxAllowableRHPct: limits.maxRH,
      maxAllowableMverLbs: limits.maxMver,
      measuredRHPct,
      estimatedMverLbs: estimatedMver,
      riskLevel,
      isCompliant,
      warrantyRisk
    };
  }

  /**
   * Generates comprehensive slab moisture survey report.
   */
  public static generateProfileReport(
    slab: SlabSpecification,
    probes: ConcreteProbeReading[]
  ): ConcreteMoistureProfileReport {
    if (probes.length === 0) {
      throw new Error('Concrete moisture survey requires at least one probe reading.');
    }

    let nonCompliantCount = 0;
    const nonCompliantIds: string[] = [];

    for (const p of probes) {
      const check = this.verifyProbeDepthCompliance(p.depthInches, slab.totalThicknessInches, slab.dryingCondition);
      if (!check.isCompliant) {
        nonCompliantCount++;
        nonCompliantIds.push(p.probeId);
      }
    }

    const depthCompliancePct = Math.round(((probes.length - nonCompliantCount) / probes.length) * 100);

    const rhValues = probes.map((p) => p.relativeHumidityPct);
    const avgRH = Math.round((rhValues.reduce((a, b) => a + b, 0) / rhValues.length) * 10) / 10;
    const maxRH = Math.max(...rhValues);
    const minRH = Math.min(...rhValues);

    const estMver = this.estimateMverFromRH(maxRH);
    const daysTo75 = this.estimateDaysRemainingToTargetRH(maxRH, 75, slab.totalThicknessInches, slab.waterCementRatio);

    const flooringTypes: FlooringCoveringType[] = [
      'EPOXY_COATING',
      'HARDWOOD_ENGINEERED',
      'LUXURY_VINYL_TILE',
      'CARPET_PERMEABLE',
      'CERAMIC_TILE'
    ];

    const flooringAssessments = flooringTypes.map((type) => this.assessFlooringRisk(type, maxRH, estMver));

    let overallRecommendation = 'Slab meets target moisture criteria for standard resilient flooring.';
    if (flooringAssessments.some((a) => a.riskLevel === 'CRITICAL_FAIL')) {
      overallRecommendation = 'CRITICAL: Excessive moisture detected. Apply Class 1 vapor barrier or allow extended drying.';
    } else if (flooringAssessments.some((a) => a.riskLevel === 'HIGH_FAIL_RISK')) {
      overallRecommendation = 'CAUTION: Moisture exceeds limits for non-breathable flooring. Vapor mitigation recommended.';
    }

    return {
      timestampIso: new Date().toISOString(),
      totalProbes: probes.length,
      averageRHPct: avgRH,
      maxRHPct: maxRH,
      minRHPct: minRH,
      depthCompliancePct,
      probesNonCompliantDepth: nonCompliantIds,
      estimatedMverLbsPer1000SqFt24Hr: estMver,
      estimatedDaysToReach75PctRH: daysTo75,
      flooringAssessments,
      overallRecommendation
    };
  }
}
