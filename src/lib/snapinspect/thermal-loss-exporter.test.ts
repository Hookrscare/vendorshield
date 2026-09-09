import { describe, it, expect } from "vitest";
import {
  computeThermalDelta,
  classifyThermalSeverity,
  calculateEnergyLoss,
  evaluateThermalReading,
  generateThermalAuditReport,
  type ThermalReadingInput,
  type PropertyThermalMeta
} from "./thermal-loss-exporter";

describe("SNAP-11: Multi-Page Thermal Delta-T Heating/Cooling Loss Assessment", () => {
  it("computes Delta-T in Celsius and Fahrenheit accurately", () => {
    // 35°C vs 20°C -> 15°C delta, 27°F delta
    const res = computeThermalDelta(35.0, 20.0);
    expect(res.deltaC).toBe(15.0);
    expect(res.deltaF).toBe(27.0);

    // Reversed order target vs ambient
    const res2 = computeThermalDelta(10.0, 25.0);
    expect(res2.deltaC).toBe(15.0);
  });

  it("classifies thermal anomaly severities according to ASTM standards", () => {
    expect(classifyThermalSeverity(18.5)).toBe("CRITICAL_HOTSPOT");
    expect(classifyThermalSeverity(15.0)).toBe("CRITICAL_HOTSPOT");
    expect(classifyThermalSeverity(10.2)).toBe("MAJOR_ANOMALY");
    expect(classifyThermalSeverity(8.0)).toBe("MAJOR_ANOMALY");
    expect(classifyThermalSeverity(4.5)).toBe("MODERATE_VARIATION");
    expect(classifyThermalSeverity(2.0)).toBe("NORMAL_BASELINE");
  });

  it("calculates BTU/hr and annual energy cost loss accurately", () => {
    // 100 sq ft, Delta-F = 20, R-10, $0.16/kWh, 2800 hours
    // BTU/hr = (100 * 20) / 10 = 200 BTU/hr
    // Total BTU = 200 * 2800 = 560,000 BTU
    // kWh = 560,000 / 3412.14 = 164.12 -> 164 kWh
    // Cost = 164 * $0.16 = $26.24
    const loss = calculateEnergyLoss(100, 20, 10, 0.16, 2800);
    expect(loss.btuPerHour).toBe(200);
    expect(loss.annualKwh).toBe(164);
    expect(loss.annualCostUsd).toBe(26.24);
  });

  it("evaluates single reading and generates recommended action", () => {
    const reading: ThermalReadingInput = {
      id: "th-01",
      zone: "Main Electrical Room",
      component: "400A Main Distribution Breaker Lug B",
      targetTempC: 78.0,
      ambientTempC: 22.0,
      surfaceAreaSqFt: 4.0,
      currentRValue: 1.0
    };

    const evaluated = evaluateThermalReading(reading);
    expect(evaluated.deltaC).toBe(56.0);
    expect(evaluated.severity).toBe("CRITICAL_HOTSPOT");
    expect(evaluated.recommendedAction).toContain("Urgent: Severe thermal defect");
  });

  it("generates paginated multi-page audit report with subtotals and worst component identification", () => {
    const meta: PropertyThermalMeta = {
      reportId: "REP-TH-2026-004",
      propertyAddress: "900 Industrial Parkway, Warehouse 3",
      inspectorName: "Marcus Vance, Level III Thermographer",
      electricityCostPerKwh: 0.18,
      heatingCoolingOperatingHours: 3200
    };

    // Create 12 readings
    const readings: ThermalReadingInput[] = [];
    for (let i = 1; i <= 12; i++) {
      readings.push({
        id: `th-${i.toString().padStart(2, "0")}`,
        zone: `Bay ${Math.ceil(i / 3)}`,
        component: `Exterior Wall Panel ${i}`,
        targetTempC: 20 + i * 2, // delta increases
        ambientTempC: 20,
        surfaceAreaSqFt: 150,
        currentRValue: 11,
        recommendedRValue: 38
      });
    }

    // 12 items with 5 per page -> 3 pages (5, 5, 2)
    const report = generateThermalAuditReport(readings, meta, 5);

    expect(report.reportId).toBe("REP-TH-2026-004");
    expect(report.totalSurfacesAudited).toBe(12);
    expect(report.pages.length).toBe(3);
    expect(report.pages[0].rows.length).toBe(5);
    expect(report.pages[1].rows.length).toBe(5);
    expect(report.pages[2].rows.length).toBe(2);

    expect(report.pages[0].pageNumber).toBe(1);
    expect(report.pages[0].totalPages).toBe(3);
    expect(report.pages[0].subtotalAnnualLossUsd).toBeGreaterThan(0);

    // Worst delta should be item 12 (targetTemp = 44, ambient = 20 -> deltaC = 24)
    expect(report.worstDeltaC).toBe(24.0);
    expect(report.worstDeltaComponent).toContain("Exterior Wall Panel 12");
    expect(report.criticalAnomaliesCount).toBeGreaterThan(0);
  });
});
