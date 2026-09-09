/**
 * SNAP-21: Drone Thermal Envelope Insulation R-Value Degradation Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Processes radiometric drone FLIR infrared thermal imagery telemetry, surface heat flux,
 * and indoor/outdoor delta-T to compute in-situ insulation R-values (imperial hr·ft²·°F/Btu
 * and metric RSI m²·K/W), percentage degradation from nameplate specs, moisture intrusion
 * severity, and annualized heating/cooling energy loss.
 */

export type EnvelopeSectionType =
  | "FLAT_COMMERCIAL_ROOF"
  | "PITCHED_ATTIC"
  | "EXTERIOR_FACADE_WALL"
  | "GLAZING_CURTAIN_WALL"
  | "FOUNDATION_PERIMETER";

export type DegradationSeverity = "NOMINAL" | "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";

export interface ThermalTelemetrySample {
  sampleId: string;
  sectionType: EnvelopeSectionType;
  designedRValueImperial: number; // e.g. R-30, R-38
  indoorAirTempF: number;
  outdoorAirTempF: number;
  measuredExteriorSurfaceTempF: number;
  surfaceAreaSqFt: number;
  localDegreeDays: number; // Annual Heating + Cooling Degree Days (HDD + CDD)
  energyCostPerKwh: number; // e.g. $0.16/kWh
  airFilmCoeffOutside?: number; // default ~ 6.0 Btu/(hr·ft²·°F) for 7.5mph wind
  airFilmCoeffInside?: number; // default ~ 1.46 Btu/(hr·ft²·°F) still air
}

export interface DegradationAssessmentResult {
  sampleId: string;
  sectionType: EnvelopeSectionType;
  designedRValueImperial: number;
  measuredRValueImperial: number;
  measuredRsiMetric: number; // m²·K/W
  rValueDegradationPct: number;
  heatFluxBtuPerHourSqFt: number;
  severity: DegradationSeverity;
  suspectedAnomalyCauses: string[];
  annualEnergyLossKwh: number;
  annualEnergyCostUsd: number;
  remediationRecommendation: string;
}

export const DEFAULT_HO_OUTSIDE = 6.0; // Btu/(hr·ft²·°F)
export const DEFAULT_HI_INSIDE = 1.46; // Btu/(hr·ft²·°F)
export const BTU_PER_KWH = 3412.142;

/**
 * Converts Imperial R-value (hr·ft²·°F/Btu) to Metric RSI (m²·K/W).
 * 1 hr·ft²·°F/Btu ≈ 0.176110 m²·K/W
 */
export function imperialRToMetricRsi(rVal: number): number {
  return Number((rVal * 0.176110).toFixed(3));
}

/**
 * Classifies degradation severity based on percentage drop from designed R-value.
 */
export function classifySeverity(degradationPct: number): DegradationSeverity {
  if (degradationPct >= 65) return "CRITICAL";
  if (degradationPct >= 45) return "SEVERE";
  if (degradationPct >= 25) return "MODERATE";
  if (degradationPct >= 10) return "MILD";
  return "NOMINAL";
}

/**
 * Evaluates an envelope section's in-situ thermal performance from FLIR radiometric sensor data.
 */
export function estimateDegradation(sample: ThermalTelemetrySample): DegradationAssessmentResult {
  const ho = sample.airFilmCoeffOutside ?? DEFAULT_HO_OUTSIDE;
  const hi = sample.airFilmCoeffInside ?? DEFAULT_HI_INSIDE;

  const deltaAir = Math.abs(sample.indoorAirTempF - sample.outdoorAirTempF);
  if (deltaAir < 5.0) {
    throw new Error("Delta-T between indoor and outdoor air must be at least 5.0°F for reliable thermographic R-value estimation.");
  }

  // Outside surface heat flux q = ho * |T_surface - T_outdoor|
  const deltaSurfaceOutdoor = Math.abs(sample.measuredExteriorSurfaceTempF - sample.outdoorAirTempF);
  const heatFlux = Math.max(0.1, ho * deltaSurfaceOutdoor);

  // In-situ total thermal resistance R_total = deltaAir / heatFlux
  // Subtracting boundary air film resistances: R_insulation = R_total - (1/ho + 1/hi)
  const airFilmsResistance = 1.0 / ho + 1.0 / hi;
  const rawRInsulation = Math.max(0.5, deltaAir / heatFlux - airFilmsResistance);
  const measuredRValue = Number(rawRInsulation.toFixed(2));
  const measuredRsi = imperialRToMetricRsi(measuredRValue);

  const designedR = Math.max(1.0, sample.designedRValueImperial);
  const drop = Math.max(0, designedR - measuredRValue);
  const degradationPct = Number(((drop / designedR) * 100).toFixed(1));
  const severity = classifySeverity(degradationPct);

  // Diagnose suspected causes
  const suspectedCauses: string[] = [];
  if (degradationPct >= 50) {
    suspectedCauses.push("Severe thermal bridging or missing batt insulation");
  }
  if (sample.sectionType === "FLAT_COMMERCIAL_ROOF" && degradationPct >= 35) {
    suspectedCauses.push("Sub-membrane saturated moisture accumulation in polyiso board");
  }
  if (sample.sectionType === "EXTERIOR_FACADE_WALL" && degradationPct >= 25) {
    suspectedCauses.push("Cavity wall insulation slump or convective air loop bypassing");
  }
  if (suspectedCauses.length === 0 && degradationPct >= 10) {
    suspectedCauses.push("Natural age-related micro-voiding or settling degradation");
  }
  if (suspectedCauses.length === 0) {
    suspectedCauses.push("Envelope insulation operating within nominal tolerance");
  }

  // Annual energy loss calculation:
  // Heat loss/gain rate per degree day: (24 hr/day * DegreeDays * Area * (1/R_measured - 1/R_designed))
  const uDesign = 1.0 / designedR;
  const uMeasured = 1.0 / measuredRValue;
  const deltaU = Math.max(0, uMeasured - uDesign);

  const annualBtuLoss = 24.0 * sample.localDegreeDays * sample.surfaceAreaSqFt * deltaU;
  const annualKwhLoss = Number((annualBtuLoss / BTU_PER_KWH).toFixed(1));
  const annualCost = Number((annualKwhLoss * sample.energyCostPerKwh).toFixed(2));

  let remediation = "No immediate envelope action required; schedule annual infrared maintenance sweep.";
  if (severity === "CRITICAL") {
    remediation = "IMMEDIATE REPAIR: Destructive core moisture sampling required; replace waterlogged polyiso insulation and re-seal envelope barrier.";
  } else if (severity === "SEVERE") {
    remediation = "PRIORITY RETROFIT: High convective heat leakage detected; inject blow-in dense foam or install continuous exterior insulation layer.";
  } else if (severity === "MODERATE") {
    remediation = "SCHEDULED REMEDIATION: Inspect perimeter flashing, air seals, and mechanical fasteners for localized thermal bridging.";
  }

  return {
    sampleId: sample.sampleId,
    sectionType: sample.sectionType,
    designedRValueImperial: designedR,
    measuredRValueImperial: measuredRValue,
    measuredRsiMetric: measuredRsi,
    rValueDegradationPct: degradationPct,
    heatFluxBtuPerHourSqFt: Number(heatFlux.toFixed(2)),
    severity,
    suspectedAnomalyCauses: suspectedCauses,
    annualEnergyLossKwh: annualKwhLoss,
    annualEnergyCostUsd: annualCost,
    remediationRecommendation: remediation,
  };
}

export const ThermalRValueEstimator = {
  DEFAULT_HO_OUTSIDE,
  DEFAULT_HI_INSIDE,
  BTU_PER_KWH,
  imperialRToMetricRsi,
  classifySeverity,
  estimateDegradation,
};
