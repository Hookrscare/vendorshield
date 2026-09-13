/**
 * SNAP-11: Multi-Page Infrared Thermal Delta-T Heating/Cooling Loss Assessment PDF Table Exporter.
 * Part of SnapInspect AI Tactical CAD & Field Inspection Suite.
 * 
 * Aggregates infrared inspection anomalies, calculates thermal Delta-T and building envelope
 * heat loss (kWh/day), and structures paginated multi-page report tables.
 */

import { createHash } from "crypto";

export interface ThermalAnomalyEntry {
  anomalyId: string;
  location: string;
  surfaceAreaM2: number;
  measuredTempCelsius: number;
  baselineTempCelsius: number;
  uValueWPerM2K: number; // Overall heat transfer coefficient
}

export interface PaginatedThermalTable {
  totalPages: number;
  totalAnomaliesCount: number;
  criticalAnomaliesCount: number;
  totalDailyKwhLoss: number;
  pages: Array<{
    pageNumber: number;
    rows: Array<{
      anomalyId: string;
      location: string;
      deltaTCelsius: number;
      severity: "NORMAL_VARIANCE" | "MODERATE_HEAT_LOSS" | "CRITICAL_RETROFIT_REQUIRED";
      estimatedDailyLossKwh: number;
    }>;
  }>;
  verificationDigest: string;
}

export class ThermalLossAssessmentTableExporter {
  public static generateAssessmentTable(
    anomalies: ThermalAnomalyEntry[],
    rowsPerPage: number = 5
  ): PaginatedThermalTable {
    if (!anomalies || anomalies.length === 0) {
      throw new Error("Anomalies list must not be empty.");
    }
    if (rowsPerPage <= 0) {
      throw new Error("rowsPerPage must be positive.");
    }

    let criticalCount = 0;
    let totalKwh = 0;

    const processedRows = anomalies.map(entry => {
      const deltaT = Math.abs(entry.measuredTempCelsius - entry.baselineTempCelsius);
      
      let severity: "NORMAL_VARIANCE" | "MODERATE_HEAT_LOSS" | "CRITICAL_RETROFIT_REQUIRED" = "NORMAL_VARIANCE";
      if (deltaT > 8.0) {
        severity = "CRITICAL_RETROFIT_REQUIRED";
        criticalCount++;
      } else if (deltaT >= 3.0) {
        severity = "MODERATE_HEAT_LOSS";
      }

      // Q (Watts) = U * A * DeltaT
      // Daily kWh = (Q * 24h) / 1000
      const heatFluxWatts = entry.uValueWPerM2K * entry.surfaceAreaM2 * deltaT;
      const dailyKwh = (heatFluxWatts * 24) / 1000.0;
      totalKwh += dailyKwh;

      return {
        anomalyId: entry.anomalyId,
        location: entry.location,
        deltaTCelsius: Number(deltaT.toFixed(1)),
        severity,
        estimatedDailyLossKwh: Number(dailyKwh.toFixed(2))
      };
    });

    const pages = [];
    for (let i = 0; i < processedRows.length; i += rowsPerPage) {
      pages.push({
        pageNumber: Math.floor(i / rowsPerPage) + 1,
        rows: processedRows.slice(i, i + rowsPerPage)
      });
    }

    const raw = `${anomalies.length}:${criticalCount}:${totalKwh.toFixed(2)}:${pages.length}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      totalPages: pages.length,
      totalAnomaliesCount: anomalies.length,
      criticalAnomaliesCount: criticalCount,
      totalDailyKwhLoss: Number(totalKwh.toFixed(2)),
      pages,
      verificationDigest: digest
    };
  }
}
