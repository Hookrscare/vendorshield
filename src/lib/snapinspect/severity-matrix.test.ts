import { describe, it, expect } from "vitest";
import {
  calculateDefectRisk,
  evaluateInspectionHealth,
  InspectionDefectInput,
} from "./severity-matrix";

describe("SNAP-09: Multi-Trade Defect Severity Matrix Auto-Scorer", () => {
  it("should calculate base defect risks and assign appropriate remediation SLAs", () => {
    const lowDefect: InspectionDefectInput = {
      id: "D-01",
      trade: "COMMERCIAL_ROOFING",
      defectName: "Minor gravel displacement",
      baseSeverity: "LOW",
      occupancy: "WAREHOUSE",
    };
    const resLow = calculateDefectRisk(lowDefect);
    expect(resLow.riskScore).toBe(15);
    expect(resLow.remediationSla).toBe("ROUTINE_MONITORING");

    const highDefect: InspectionDefectInput = {
      id: "D-02",
      trade: "HVAC_MECHANICAL",
      defectName: "Refrigerant line freeze",
      baseSeverity: "HIGH",
      occupancy: "WAREHOUSE",
    };
    const resHigh = calculateDefectRisk(highDefect);
    expect(resHigh.riskScore).toBe(65);
    expect(resHigh.remediationSla).toBe("PRIORITY_7D");
  });

  it("should escalate severity when water intrusion and thermal anomalies are present", () => {
    const roofDefect: InspectionDefectInput = {
      id: "D-03",
      trade: "COMMERCIAL_ROOFING",
      defectName: "EPDM Membrane Tear",
      baseSeverity: "HIGH", // base 65
      hasWaterIntrusion: true, // x1.35 -> ~88
      thermalDeltaTCelsius: 18, // x1.25 -> capped at 100
      occupancy: "COMMERCIAL_OFFICE",
    };
    const res = calculateDefectRisk(roofDefect);

    expect(res.riskScore).toBe(100);
    expect(res.effectiveSeverity).toBe("LIFE_SAFETY_HAZARD");
    expect(res.remediationSla).toBe("IMMEDIATE_24H");
    expect(res.multipliersApplied.some((m) => m.includes("WATER_INTRUSION"))).toBe(true);
    expect(res.multipliersApplied.some((m) => m.includes("THERMAL_DELTA"))).toBe(true);
  });

  it("should amplify risk in healthcare critical facilities", () => {
    const electricalDefect: InspectionDefectInput = {
      id: "D-04",
      trade: "ELECTRICAL",
      defectName: "Corroded Emergency Generator Transfer Switch",
      baseSeverity: "MEDIUM", // base 35
      occupancy: "HEALTHCARE_CRITICAL", // x1.5 -> ~53
    };
    const res = calculateDefectRisk(electricalDefect);
    expect(res.riskScore).toBe(53);
    expect(res.multipliersApplied).toContain("OCCUPANCY_HEALTHCARE_CRITICAL_x1.50");
  });

  it("should evaluate overall facility health index and grade", () => {
    // 1. Pristine facility with 0 defects
    const emptyHealth = evaluateInspectionHealth([]);
    expect(emptyHealth.facilityHealthIndex).toBe(100);
    expect(emptyHealth.healthGrade).toBe("EXCELLENT");
    expect(emptyHealth.urgentActionItems).toHaveLength(0);

    // 2. Severe facility with life safety hazard
    const defects: InspectionDefectInput[] = [
      {
        id: "D-10",
        trade: "STRUCTURAL",
        defectName: "Severe load-bearing beam deflection",
        baseSeverity: "LIFE_SAFETY_HAZARD",
        codeReference: "IBC 1604.2",
      },
      {
        id: "D-11",
        trade: "PLUMBING",
        defectName: "Leaking P-trap in mechanical closet",
        baseSeverity: "LOW",
      },
    ];

    const report = evaluateInspectionHealth(defects);
    expect(report.totalDefects).toBe(2);
    expect(report.healthGrade).toBe("CRITICAL_DEFICIT");
    expect(report.urgentActionItems).toHaveLength(1);
    expect(report.urgentActionItems[0].defectId).toBe("D-10");
    expect(report.tradeBreakdowns.STRUCTURAL.defectCount).toBe(1);
    expect(report.tradeBreakdowns.PLUMBING.defectCount).toBe(1);
  });
});
