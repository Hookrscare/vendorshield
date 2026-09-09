/**
 * SNAP-39: Drone LiDAR Rooftop Solar Panel Degradation & Soiling Scanner.
 * Part of SnapInspect AI Tactical CAD & Field Inspection Platform.
 *
 * Combines LiDAR surface reflectance intensity, multi-spectral thermal imaging,
 * and PV generation metrics to quantify soiling loss, identify hot-spot defects,
 * and calculate cleaning ROI dispatch economics.
 */

import { createHash } from "crypto";

export type SoilingUrgency = "IMMEDIATE_DISPATCH" | "SCHEDULE_CYCLE" | "NO_ACTION";

export interface SolarPanelTelemetry {
  stringId: string;
  panelId: string;
  ratedCapacityKw: number;
  lidarReflectanceRatio: number; // 0.0 - 1.0 (clean glass baseline ~ 0.95)
  hotspotDeltaTCelsius: number;   // Temperature difference vs string average
  actualYieldRatio: number;      // Actual kWh / expected theoretical kWh
}

export interface SolarArrayScanResult {
  panelId: string;
  defectType: "HEAVY_SOILING" | "BYPASS_DIODE_FAULT" | "HOTSPOT_SHADING" | "NORMAL_OPERATION";
  soilingLossPercentage: number;
  monthlyLostRevenueUsd: number;
  washPaybackDays: number;
  urgency: SoilingUrgency;
  recommendation: string;
}

export interface ArrayInspectionSummary {
  totalPanelsAudited: number;
  compromisedPanelsCount: number;
  meanArraySoilingLossPct: number;
  aggregateMonthlyLossUsd: number;
  cleaningRecommended: boolean;
  auditSha256: string;
  panelResults: SolarArrayScanResult[];
}

export class SolarSoilingDegradationScanner {
  constructor(
    private readonly electricityTariffPerKwh: number = 0.18,
    private readonly panelWashCostUsd: number = 8.50,
    private readonly peakSunHoursPerMonth: number = 150
  ) {}

  /**
   * Scrutinizes an individual solar panel telemetry point.
   */
  public scanPanel(panel: SolarPanelTelemetry): SolarArrayScanResult {
    let defectType: "HEAVY_SOILING" | "BYPASS_DIODE_FAULT" | "HOTSPOT_SHADING" | "NORMAL_OPERATION";
    let urgency: SoilingUrgency = "NO_ACTION";

    if (panel.hotspotDeltaTCelsius >= 20.0) {
      defectType = "HOTSPOT_SHADING";
      urgency = "IMMEDIATE_DISPATCH";
    } else if (panel.hotspotDeltaTCelsius >= 12.0 && panel.actualYieldRatio < 0.70) {
      defectType = "BYPASS_DIODE_FAULT";
      urgency = "IMMEDIATE_DISPATCH";
    } else if (panel.lidarReflectanceRatio < 0.75 || panel.actualYieldRatio < 0.88) {
      defectType = "HEAVY_SOILING";
      urgency = "SCHEDULE_CYCLE";
    } else {
      defectType = "NORMAL_OPERATION";
      urgency = "NO_ACTION";
    }

    const expectedKwhPerMonth = panel.ratedCapacityKw * this.peakSunHoursPerMonth;
    const soilingLossPercentage = Number(Math.max(0, (1.0 - panel.actualYieldRatio) * 100).toFixed(2));
    const lostKwhPerMonth = expectedKwhPerMonth * (soilingLossPercentage / 100.0);
    const monthlyLostRevenueUsd = Number((lostKwhPerMonth * this.electricityTariffPerKwh).toFixed(2));

    const dailyLostRevenue = monthlyLostRevenueUsd / 30.0;
    const washPaybackDays = dailyLostRevenue > 0
      ? Number((this.panelWashCostUsd / dailyLostRevenue).toFixed(1))
      : 999.0;

    let recommendation = "Panel operating within nominal performance thresholds.";
    if (defectType === "HOTSPOT_SHADING") {
      recommendation = "Severe localized thermal hotspot detected. Physical debris clearing required to prevent fire hazard.";
    } else if (defectType === "BYPASS_DIODE_FAULT") {
      recommendation = "Bypass diode thermal anomaly detected. Replace sub-module or junction box.";
    } else if (defectType === "HEAVY_SOILING") {
      recommendation = `Soiling causing ${soilingLossPercentage}% yield penalty. Wash payback estimated in ${washPaybackDays} days.`;
    }

    return {
      panelId: panel.panelId,
      defectType,
      soilingLossPercentage,
      monthlyLostRevenueUsd,
      washPaybackDays,
      urgency,
      recommendation
    };
  }

  /**
   * Evaluates array-wide PV health and compiles economic ROI summary.
   */
  public evaluateArray(panels: SolarPanelTelemetry[]): ArrayInspectionSummary {
    const results = panels.map(p => this.scanPanel(p));
    const compromised = results.filter(r => r.defectType !== "NORMAL_OPERATION");

    const totalLossPct = results.reduce((acc, r) => acc + r.soilingLossPercentage, 0);
    const meanLoss = panels.length > 0 ? Number((totalLossPct / panels.length).toFixed(2)) : 0;
    const aggregateRevenueLoss = results.reduce((acc, r) => acc + r.monthlyLostRevenueUsd, 0);

    const cleaningRecommended = compromised.some(
      r => r.urgency === "IMMEDIATE_DISPATCH" || r.soilingLossPercentage >= 20.0 || r.washPaybackDays <= 120.0
    );

    const digestPayload = `${panels.length}:${compromised.length}:${meanLoss}:${aggregateRevenueLoss}:${cleaningRecommended}`;
    const auditSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      totalPanelsAudited: panels.length,
      compromisedPanelsCount: compromised.length,
      meanArraySoilingLossPct: meanLoss,
      aggregateMonthlyLossUsd: Number(aggregateRevenueLoss.toFixed(2)),
      cleaningRecommended,
      auditSha256,
      panelResults: results
    };
  }
}
