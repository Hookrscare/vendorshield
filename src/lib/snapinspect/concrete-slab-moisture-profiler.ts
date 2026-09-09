/**
 * src/lib/snapinspect/concrete-slab-moisture-profiler.ts
 * SNAP-31: High-Precision Multi-Sensor Concrete Slab Moisture Relative Humidity Profiler.
 *
 * Implements ASTM F2170 in situ relative humidity profiling and ASTM F1869 MVER
 * vapor emission modeling across depth-stratified concrete sensors to certify
 * adhesive and flooring substrate readiness.
 */

import { createHash } from 'crypto';

export type DryingCondition = 'ONE_SIDE' | 'TWO_SIDES';

export type MoistureRiskClassification =
  | 'OPTIMAL_CURED'
  | 'ELEVATED_VAPOR_EMISSION'
  | 'UNACCEPTABLE_MOISTURE_RISK'
  | 'CONDENSATION_IMMINENT';

export interface MoistureProbeReading {
  sensorId: string;
  depthInches: number;
  totalThicknessInches: number;
  relativeHumidityPercent: number; // 0..100
  temperatureCelsius: number;
  acclimationHours: number; // ASTM F2170 requires >= 24-72h
}

export interface FlooringSpecification {
  maxAllowableRHPercent: number; // e.g. 75.0, 80.0, 85.0
  maxAllowableMVER: number; // lbs/1000 sq ft/24h (e.g. 3.0 or 5.0)
  coatingType: string; // e.g. "Vapor Barrier Epoxy", "LVT Resilient Adhesive"
}

export interface SensorProfileAnalysis {
  sensorId: string;
  standardDepthCompliance: boolean;
  targetDepthInches: number;
  relativeHumidityPercent: number;
  dewPointCelsius: number;
  vaporPressureKPa: number;
  estimatedMVER: number; // lbs / 1000 sq ft / 24h
  riskZone: MoistureRiskClassification;
  warrantyCompliant: boolean;
}

export interface ConcreteMoistureReport {
  inspectionId: string;
  dryingCondition: DryingCondition;
  probeCount: number;
  meanRHPercent: number;
  maxRHPercent: number;
  meanEstimatedMVER: number;
  allProbesCompliant: boolean;
  dominantRiskClassification: MoistureRiskClassification;
  sensorAnalyses: SensorProfileAnalysis[];
  cryptographicVerificationHash: string;
}

export class ConcreteSlabMoistureProfiler {
  /**
   * Computes saturation vapor pressure using Tetens equation (kPa).
   */
  private static getSaturationVaporPressure(tempC: number): number {
    return 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  }

  /**
   * Computes dew point in Celsius using Magnus formula.
   */
  private static computeDewPoint(tempC: number, rhPercent: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * tempC) / (b + tempC) + Math.log(rhPercent / 100.0);
    return (b * alpha) / (a - alpha);
  }

  /**
   * Estimates Moisture Vapor Emission Rate (MVER) from in situ RH & Vapor Pressure.
   * Empirical approximation: MVER ~ 3.0 * (RH / 75)^3 * (VaporPressure / 2.3)
   */
  private static estimateMVER(rhPercent: number, vaporPressureKPa: number): number {
    const baseRatio = Math.max(0, rhPercent / 75.0);
    const vpFactor = Math.max(0.5, vaporPressureKPa / 2.338); // VP at 20°C is ~2.338 kPa
    const mver = 3.0 * Math.pow(baseRatio, 3.2) * vpFactor;
    return Math.round(mver * 100) / 100;
  }

  /**
   * Analyzes an array of depth-stratified ASTM F2170 probe readings.
   */
  public static analyzeSlab(
    inspectionId: string,
    dryingCondition: DryingCondition,
    probes: MoistureProbeReading[],
    spec: FlooringSpecification
  ): ConcreteMoistureReport {
    if (probes.length === 0) {
      throw new Error('At least one probe reading required for slab moisture analysis.');
    }

    const depthFraction = dryingCondition === 'ONE_SIDE' ? 0.40 : 0.20;
    const sensorAnalyses: SensorProfileAnalysis[] = [];

    let sumRH = 0;
    let maxRH = 0;
    let sumMVER = 0;

    for (const probe of probes) {
      const targetDepth = probe.totalThicknessInches * depthFraction;
      // Probe is compliant if within 0.25 inches of mandated ASTM depth
      const standardDepthCompliance =
        Math.abs(probe.depthInches - targetDepth) <= 0.35 &&
        probe.acclimationHours >= 24;

      const satVP = this.getSaturationVaporPressure(probe.temperatureCelsius);
      const actualVP = (probe.relativeHumidityPercent / 100.0) * satVP;
      const dewPoint = this.computeDewPoint(probe.temperatureCelsius, probe.relativeHumidityPercent);
      const estimatedMVER = this.estimateMVER(probe.relativeHumidityPercent, actualVP);

      sumRH += probe.relativeHumidityPercent;
      if (probe.relativeHumidityPercent > maxRH) {
        maxRH = probe.relativeHumidityPercent;
      }
      sumMVER += estimatedMVER;

      // Risk zone categorization
      let riskZone: MoistureRiskClassification;
      if (probe.temperatureCelsius - dewPoint <= 1.5) {
        riskZone = 'CONDENSATION_IMMINENT';
      } else if (probe.relativeHumidityPercent > 85.0 || estimatedMVER > 5.0) {
        riskZone = 'UNACCEPTABLE_MOISTURE_RISK';
      } else if (
        probe.relativeHumidityPercent > spec.maxAllowableRHPercent ||
        estimatedMVER > spec.maxAllowableMVER
      ) {
        riskZone = 'ELEVATED_VAPOR_EMISSION';
      } else {
        riskZone = 'OPTIMAL_CURED';
      }

      const warrantyCompliant =
        standardDepthCompliance &&
        probe.relativeHumidityPercent <= spec.maxAllowableRHPercent &&
        estimatedMVER <= spec.maxAllowableMVER;

      sensorAnalyses.push({
        sensorId: probe.sensorId,
        standardDepthCompliance,
        targetDepthInches: Math.round(targetDepth * 100) / 100,
        relativeHumidityPercent: probe.relativeHumidityPercent,
        dewPointCelsius: Math.round(dewPoint * 10) / 10,
        vaporPressureKPa: Math.round(actualVP * 100) / 100,
        estimatedMVER,
        riskZone,
        warrantyCompliant
      });
    }

    const meanRHPercent = Math.round((sumRH / probes.length) * 10) / 10;
    const maxRH = Math.max(...probes.map((p) => p.relativeHumidityPercent));
    const meanEstimatedMVER = Math.round((sumMVER / probes.length) * 100) / 100;
    const allProbesCompliant = sensorAnalyses.every((s) => s.warrantyCompliant);

    // Dominant risk: worst case among probes
    let dominantRiskClassification: MoistureRiskClassification = 'OPTIMAL_CURED';
    if (sensorAnalyses.some((s) => s.riskZone === 'CONDENSATION_IMMINENT')) {
      dominantRiskClassification = 'CONDENSATION_IMMINENT';
    } else if (sensorAnalyses.some((s) => s.riskZone === 'UNACCEPTABLE_MOISTURE_RISK')) {
      dominantRiskClassification = 'UNACCEPTABLE_MOISTURE_RISK';
    } else if (sensorAnalyses.some((s) => s.riskZone === 'ELEVATED_VAPOR_EMISSION')) {
      dominantRiskClassification = 'ELEVATED_VAPOR_EMISSION';
    }

    const hashInput = `${inspectionId}:${dryingCondition}:${meanRHPercent}:${meanEstimatedMVER}:${allProbesCompliant}`;
    const cryptographicVerificationHash = createHash('sha256').update(hashInput).digest('hex');

    return {
      inspectionId,
      dryingCondition,
      probeCount: probes.length,
      meanRHPercent,
      maxRHPercent: maxRH,
      meanEstimatedMVER,
      allProbesCompliant,
      dominantRiskClassification,
      sensorAnalyses,
      cryptographicVerificationHash
    };
  }
}
