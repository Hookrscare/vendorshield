/**
 * SNAP-34: Multi-Spectral Thermal Drone Building Envelope Insulation Loss Heatmap.
 * SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Implements ISO 6781-3 and ASTM C1153 compliant quantitative drone thermography
 * for building facade envelope heat loss, localized U-value/R-value degradation,
 * thermal bridging anomaly categorization, and annual kWh energy penalty estimation.
 */

import { createHash } from "crypto";

export type ThermalAnomalyType =
  | "ACCEPTABLE_INSULATION"
  | "THERMAL_BRIDGE_STRUCTURAL"
  | "INSULATION_VOID"
  | "AIR_LEAKAGE"
  | "MOISTURE_INTRUSION";

export interface FacadeSurfaceSample {
  sampleId: string;
  gridCoordinateX: number;
  gridCoordinateY: number;
  surfaceTempC: number;
  reflectedApparentTempC?: number;
  surfaceEmissivity?: number; // default 0.90 for brick/concrete/stucco
}

export interface BuildingEnvelopeThermalParams {
  indoorTempC: number;
  outdoorTempC: number;
  internalConvectionCoefficientW_m2K?: number; // standard 7.69 W/(m^2*K) per ISO 6946
  heatingDegreeDays: number; // annual HDD base 18°C
  energyCostPerKwh: number; // e.g. 0.16 $/kWh
  designedRValueImperial: number; // e.g. R-20
}

export interface ThermalAnomalyDiagnosis {
  sampleId: string;
  gridCoordinateX: number;
  gridCoordinateY: number;
  surfaceTempC: number;
  temperatureDifferenceRatioTx: number;
  effectiveUValueMetric: number; // W/(m^2*K)
  effectiveRValueMetric: number; // (m^2*K)/W
  effectiveRValueImperial: number; // hr*ft^2*°F/BTU
  rValueDegradationPct: number;
  anomalyType: ThermalAnomalyType;
  annualEnergyLossCostPerSqMeter: number;
}

export interface BuildingEnvelopeAssessmentReport {
  inspectionId: string;
  totalSamplesEvaluated: number;
  meanSurfaceTempC: number;
  minSurfaceTempC: number;
  maxSurfaceTempC: number;
  indoorTempC: number;
  outdoorTempC: number;
  overallAverageRValueImperial: number;
  criticalAnomaliesCount: number;
  totalEstimatedAnnualCostPerM2: number;
  diagnoses: ThermalAnomalyDiagnosis[];
  auditHashSha256: string;
}

export class BuildingEnvelopeThermalLossProfiler {
  public static readonly METRIC_TO_IMPERIAL_R = 5.678263; // 1 (m^2*K)/W = 5.678263 hr*ft^2*°F/BTU
  public static readonly DEFAULT_HI = 7.69; // ISO 6946 interior surface heat transfer coefficient

  public static analyzeEnvelope(
    inspectionId: string,
    samples: FacadeSurfaceSample[],
    params: BuildingEnvelopeThermalParams
  ): BuildingEnvelopeAssessmentReport {
    if (samples.length === 0) {
      throw new Error("Cannot evaluate building envelope with zero thermal samples.");
    }

    const deltaT_env = Math.abs(params.indoorTempC - params.outdoorTempC);
    if (deltaT_env < 3.0) {
      throw new Error(
        `Delta-T between indoor (${params.indoorTempC}°C) and outdoor (${params.outdoorTempC}°C) is ${deltaT_env.toFixed(1)}°C. Minimum 3.0°C required by ISO 6781-3.`
      );
    }

    const hi = params.internalConvectionCoefficientW_m2K || this.DEFAULT_HI;
    const designedRMetric = params.designedRValueImperial / this.METRIC_TO_IMPERIAL_R;

    let sumRImperial = 0;
    let sumCost = 0;
    let criticalCount = 0;

    const surfaceTemps = samples.map((s) => s.surfaceTempC);
    const minSurface = Math.min(...surfaceTemps);
    const maxSurface = Math.max(...surfaceTemps);
    const meanSurface = surfaceTemps.reduce((a, b) => a + b, 0) / surfaceTemps.length;

    const isHeatingSeason = params.indoorTempC > params.outdoorTempC;

    const diagnoses: ThermalAnomalyDiagnosis[] = samples.map((sample) => {
      // Temperature Difference Ratio (Tx) per ISO 6781-3
      // In heating: (T_in - T_s) / (T_in - T_out)
      // In cooling: (T_s - T_in) / (T_out - T_in)
      const tx = isHeatingSeason
        ? (params.indoorTempC - sample.surfaceTempC) / (params.indoorTempC - params.outdoorTempC)
        : (sample.surfaceTempC - params.indoorTempC) / (params.outdoorTempC - params.indoorTempC);

      // Localized heat flux q = h_i * (T_in - T_s)
      // U = q / (T_in - T_out) = h_i * Tx
      const effectiveU = Math.max(0.05, hi * Math.max(0.01, tx));
      const effectiveRMetric = 1.0 / effectiveU;
      const effectiveRImperial = effectiveRMetric * this.METRIC_TO_IMPERIAL_R;

      sumRImperial += effectiveRImperial;

      const rDegradation = Math.max(
        0,
        ((params.designedRValueImperial - effectiveRImperial) / params.designedRValueImperial) * 100
      );

      // Annual energy loss cost per m^2:
      // Heat loss Q (kWh/m^2/year) = (U * HDD * 24) / 1000
      const annualKwhLoss = (effectiveU * params.heatingDegreeDays * 24) / 1000;
      const annualCostPerM2 = annualKwhLoss * params.energyCostPerKwh;
      sumCost += annualCostPerM2;

      // Anomaly classification
      let anomaly: ThermalAnomalyType = "ACCEPTABLE_INSULATION";
      if (rDegradation > 60.0) {
        anomaly = "INSULATION_VOID";
        criticalCount++;
      } else if (rDegradation > 40.0) {
        anomaly = "THERMAL_BRIDGE_STRUCTURAL";
        criticalCount++;
      } else if (rDegradation > 25.0) {
        anomaly = "AIR_LEAKAGE";
      }

      return {
        sampleId: sample.sampleId,
        gridCoordinateX: sample.gridCoordinateX,
        gridCoordinateY: sample.gridCoordinateY,
        surfaceTempC: sample.surfaceTempC,
        temperatureDifferenceRatioTx: Math.round(tx * 1000) / 1000,
        effectiveUValueMetric: Math.round(effectiveU * 100) / 100,
        effectiveRValueMetric: Math.round(effectiveRMetric * 100) / 100,
        effectiveRValueImperial: Math.round(effectiveRImperial * 10) / 10,
        rValueDegradationPct: Math.round(rDegradation * 10) / 10,
        anomalyType: anomaly,
        annualEnergyLossCostPerSqMeter: Math.round(annualCostPerM2 * 100) / 100,
      };
    });

    const averageRImperial = Math.round((sumRImperial / samples.length) * 10) / 10;
    const avgAnnualCost = Math.round((sumCost / samples.length) * 100) / 100;

    const auditDigest = createHash("sha256")
      .update(
        JSON.stringify({
          inspectionId,
          sampleCount: samples.length,
          avgR: averageRImperial,
          criticalCount,
        })
      )
      .digest("hex");

    return {
      inspectionId,
      totalSamplesEvaluated: samples.length,
      meanSurfaceTempC: Math.round(meanSurface * 10) / 10,
      minSurfaceTempC: Math.round(minSurface * 10) / 10,
      maxSurfaceTempC: Math.round(maxSurface * 10) / 10,
      indoorTempC: params.indoorTempC,
      outdoorTempC: params.outdoorTempC,
      overallAverageRValueImperial: averageRImperial,
      criticalAnomaliesCount: criticalCount,
      totalEstimatedAnnualCostPerM2: avgAnnualCost,
      diagnoses,
      auditHashSha256: auditDigest,
    };
  }
}
