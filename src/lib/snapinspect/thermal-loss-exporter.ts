/**
 * SNAP-11: Multi-Page Infrared Thermal Delta-T Heating/Cooling Loss Assessment PDF Table Exporter.
 * Analyzes building envelope and mechanical infrared thermography scans,
 * computes Delta-T heat loss / cooling loss in BTU & USD, and formats multi-page
 * paginated table data structures for PDF export.
 */

export type ThermalAnomalySeverity =
  | "CRITICAL_HOTSPOT"
  | "MAJOR_ANOMALY"
  | "MODERATE_VARIATION"
  | "NORMAL_BASELINE";

export interface ThermalReadingInput {
  id: string;
  zone: string;
  component: string;
  targetTempC: number;
  ambientTempC: number;
  surfaceAreaSqFt: number;
  currentRValue: number; // Thermal resistance (e.g. R-11 vs target R-38)
  recommendedRValue?: number;
  remediationNote?: string;
  imageRef?: string;
}

export interface EvaluatedThermalReading {
  id: string;
  zone: string;
  component: string;
  targetTempC: number;
  ambientTempC: number;
  deltaC: number;
  deltaF: number;
  surfaceAreaSqFt: number;
  severity: ThermalAnomalySeverity;
  estimatedBtuPerHourLoss: number;
  estimatedAnnualKwhLoss: number;
  estimatedAnnualLossUsd: number;
  recommendedAction: string;
  imageRef?: string;
}

export interface ThermalAuditPage {
  pageNumber: number;
  totalPages: number;
  rows: EvaluatedThermalReading[];
  subtotalAnnualLossUsd: number;
}

export interface ThermalAuditReport {
  reportId: string;
  propertyAddress: string;
  inspectorName: string;
  generatedAtIso: string;
  totalSurfacesAudited: number;
  criticalAnomaliesCount: number;
  majorAnomaliesCount: number;
  totalEstimatedAnnualLossUsd: number;
  worstDeltaC: number;
  worstDeltaComponent: string;
  pages: ThermalAuditPage[];
  readings: EvaluatedThermalReading[];
}

export interface PropertyThermalMeta {
  reportId: string;
  propertyAddress: string;
  inspectorName: string;
  electricityCostPerKwh?: number; // default $0.16/kWh
  heatingCoolingOperatingHours?: number; // default 2,800 hrs/yr
}

export function computeThermalDelta(targetC: number, ambientC: number): { deltaC: number; deltaF: number } {
  const deltaC = Math.round(Math.abs(targetC - ambientC) * 10) / 10;
  const deltaF = Math.round(deltaC * 1.8 * 10) / 10;
  return { deltaC, deltaF };
}

export function classifyThermalSeverity(deltaC: number): ThermalAnomalySeverity {
  if (deltaC >= 15.0) return "CRITICAL_HOTSPOT";
  if (deltaC >= 8.0) return "MAJOR_ANOMALY";
  if (deltaC >= 3.5) return "MODERATE_VARIATION";
  return "NORMAL_BASELINE";
}

/**
 * Computes heat transfer: Q = (Area * Delta_T_F) / R_value in BTU/hr
 * Converts BTU to kWh (1 kWh = 3412.14 BTU) and multiplies by annual hours & rate.
 */
export function calculateEnergyLoss(
  surfaceAreaSqFt: number,
  deltaF: number,
  rValue: number,
  kwhRate: number = 0.16,
  annualOperatingHours: number = 2800
): { btuPerHour: number; annualKwh: number; annualCostUsd: number } {
  const safeR = Math.max(1.0, rValue);
  const safeArea = Math.max(0.0, surfaceAreaSqFt);
  const safeDelta = Math.max(0.0, deltaF);

  // Q (BTU/hr) = (Area * Delta_T) / R
  const btuPerHour = Math.round((safeArea * safeDelta) / safeR);
  // Total Annual BTU = btuPerHour * hours
  const totalAnnualBtu = btuPerHour * annualOperatingHours;
  // Convert BTU to kWh
  const annualKwh = Math.round(totalAnnualBtu / 3412.14);
  const annualCostUsd = Math.round(annualKwh * kwhRate * 100) / 100;

  return {
    btuPerHour,
    annualKwh,
    annualCostUsd
  };
}

export function evaluateThermalReading(
  input: ThermalReadingInput,
  kwhRate: number = 0.16,
  operatingHours: number = 2800
): EvaluatedThermalReading {
  const { deltaC, deltaF } = computeThermalDelta(input.targetTempC, input.ambientTempC);
  const severity = classifyThermalSeverity(deltaC);
  const { btuPerHour, annualKwh, annualCostUsd } = calculateEnergyLoss(
    input.surfaceAreaSqFt,
    deltaF,
    input.currentRValue,
    kwhRate,
    operatingHours
  );

  let defaultAction = "Baseline monitoring; no immediate remediation required.";
  if (severity === "CRITICAL_HOTSPOT") {
    defaultAction = `Urgent: Severe thermal defect (ΔT ${deltaC}°C). Inspect for electrical overload or structural insulation void.`;
  } else if (severity === "MAJOR_ANOMALY") {
    const targetR = input.recommendedRValue || 38;
    defaultAction = `Retrofit insulation to code R-${targetR} and seal envelope air penetration.`;
  } else if (severity === "MODERATE_VARIATION") {
    defaultAction = "Apply aerosol air-barrier or weatherstripping to mitigate convective leakage.";
  }

  return {
    id: input.id,
    zone: input.zone,
    component: input.component,
    targetTempC: input.targetTempC,
    ambientTempC: input.ambientTempC,
    deltaC,
    deltaF,
    surfaceAreaSqFt: input.surfaceAreaSqFt,
    severity,
    estimatedBtuPerHourLoss: btuPerHour,
    estimatedAnnualKwhLoss: annualKwh,
    estimatedAnnualLossUsd: annualCostUsd,
    recommendedAction: input.remediationNote || defaultAction,
    imageRef: input.imageRef
  };
}

export function generateThermalAuditReport(
  readings: ThermalReadingInput[],
  meta: PropertyThermalMeta,
  itemsPerPage: number = 5
): ThermalAuditReport {
  const kwhRate = meta.electricityCostPerKwh ?? 0.16;
  const hours = meta.heatingCoolingOperatingHours ?? 2800;

  const evaluated: EvaluatedThermalReading[] = readings.map(r =>
    evaluateThermalReading(r, kwhRate, hours)
  );

  let totalLossUsd = 0;
  let criticalCount = 0;
  let majorCount = 0;
  let worstDelta = 0;
  let worstComponent = "None";

  for (const item of evaluated) {
    totalLossUsd += item.estimatedAnnualLossUsd;
    if (item.severity === "CRITICAL_HOTSPOT") criticalCount++;
    if (item.severity === "MAJOR_ANOMALY") majorCount++;
    if (item.deltaC > worstDelta) {
      worstDelta = item.deltaC;
      worstComponent = `${item.zone} - ${item.component}`;
    }
  }

  // Multi-Page Pagination
  const pageSize = Math.max(1, itemsPerPage);
  const totalPages = Math.ceil(evaluated.length / pageSize) || 1;
  const pages: ThermalAuditPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    const startIdx = i * pageSize;
    const pageRows = evaluated.slice(startIdx, startIdx + pageSize);
    const subtotal = pageRows.reduce((acc, row) => acc + row.estimatedAnnualLossUsd, 0);

    pages.push({
      pageNumber: i + 1,
      totalPages,
      rows: pageRows,
      subtotalAnnualLossUsd: Math.round(subtotal * 100) / 100
    });
  }

  return {
    reportId: meta.reportId,
    propertyAddress: meta.propertyAddress,
    inspectorName: meta.inspectorName,
    generatedAtIso: new Date().toISOString(),
    totalSurfacesAudited: evaluated.length,
    criticalAnomaliesCount: criticalCount,
    majorAnomaliesCount: majorCount,
    totalEstimatedAnnualLossUsd: Math.round(totalLossUsd * 100) / 100,
    worstDeltaC: worstDelta,
    worstDeltaComponent: worstComponent,
    pages,
    readings: evaluated
  };
}
