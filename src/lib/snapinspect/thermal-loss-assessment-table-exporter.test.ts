import { describe, it, expect } from "vitest";
import {
  ThermalLossAssessmentTableExporter,
  ThermalAnomalyEntry
} from "./thermal-loss-assessment-table-exporter";

describe("ThermalLossAssessmentTableExporter (SNAP-11)", () => {
  const sampleAnomalies: ThermalAnomalyEntry[] = [
    {
      anomalyId: "ANOM-001",
      location: "North Wall Double Glazing",
      surfaceAreaM2: 12.0,
      measuredTempCelsius: 8.5,
      baselineTempCelsius: 21.0, // Delta T = 12.5C (Critical)
      uValueWPerM2K: 2.8
    },
    {
      anomalyId: "ANOM-002",
      location: "HVAC Return Plenary Duct",
      surfaceAreaM2: 5.0,
      measuredTempCelsius: 16.0,
      baselineTempCelsius: 21.0, // Delta T = 5.0C (Moderate)
      uValueWPerM2K: 1.2
    },
    {
      anomalyId: "ANOM-003",
      location: "Perimeter Baseboard Seal",
      surfaceAreaM2: 8.0,
      measuredTempCelsius: 19.5,
      baselineTempCelsius: 21.0, // Delta T = 1.5C (Normal)
      uValueWPerM2K: 0.9
    }
  ];

  it("calculates Delta-T, kWh loss, and paginates table rows", () => {
    const table = ThermalLossAssessmentTableExporter.generateAssessmentTable(sampleAnomalies, 2);

    expect(table.totalAnomaliesCount).toBe(3);
    expect(table.criticalAnomaliesCount).toBe(1);
    expect(table.totalPages).toBe(2);
    expect(table.pages[0].rows).toHaveLength(2);
    expect(table.pages[1].rows).toHaveLength(1);
    expect(table.pages[0].rows[0].severity).toBe("CRITICAL_RETROFIT_REQUIRED");
    expect(table.pages[0].rows[1].severity).toBe("MODERATE_HEAT_LOSS");
    expect(table.pages[1].rows[0].severity).toBe("NORMAL_VARIANCE");
    expect(table.totalDailyKwhLoss).toBeGreaterThan(0);
    expect(table.verificationDigest).toHaveLength(64);
  });

  it("rejects empty anomalies array", () => {
    expect(() => {
      ThermalLossAssessmentTableExporter.generateAssessmentTable([]);
    }).toThrow("Anomalies list must not be empty.");
  });
});
