import { describe, it, expect } from "vitest";
import {
  MaterialTakeoffCostCalculator,
  DefectItemInput
} from "./material-takeoff-cost";

describe("SNAP-22: MaterialTakeoffCostCalculator Suite", () => {
  const calc = new MaterialTakeoffCostCalculator(90.0, 0.20, 0.15); // $90/hr, 20% O&P, 15% waste

  it("calculates roofing shingle takeoff and labor hours accurately", () => {
    const defect: DefectItemInput = {
      defectId: "d-roof-01",
      trade: "ROOFING",
      severity: "SEVERE",
      description: "Wind damage and missing shingles over master bedroom",
      quantity: 300, // 3 squares
      unitOfMeasure: "SQFT",
      location: "South Slope"
    };

    const res = calc.estimateDefect(defect);
    expect(res.materials.length).toBe(2);
    // 3 squares = 9 bundles, with 15% waste = 11 bundles
    const shingleMaterial = res.materials.find(m => m.unit === "bundle");
    expect(shingleMaterial?.wasteAdjustedQuantity).toBe(11);
    expect(res.laborHours).toBeGreaterThan(5);
    expect(res.overheadAndProfitUsd).toBeGreaterThan(0);
    expect(res.totalCostUsd).toBeGreaterThan(res.materialTotalUsd + res.laborTotalUsd);
  });

  it("computes drywall patch takeoff with sheet count and joint compound", () => {
    const defect: DefectItemInput = {
      defectId: "d-drywall-02",
      trade: "DRYWALL",
      severity: "MODERATE",
      description: "Water stain and sagging gypsum board",
      quantity: 64, // 2 sheets
      unitOfMeasure: "SQFT",
      location: "Living Room Ceiling"
    };

    const res = calc.estimateDefect(defect);
    expect(res.materials.some(m => m.materialName.includes("Gypsum Board"))).toBe(true);
    expect(res.materials.some(m => m.materialName.includes("Joint Compound"))).toBe(true);
    expect(res.totalCostUsd).toBeGreaterThan(200);
  });

  it("generates comprehensive multi-trade project report with cost intervals", () => {
    const defects: DefectItemInput[] = [
      {
        defectId: "d-01",
        trade: "ROOFING",
        severity: "CRITICAL",
        description: "Ridge cap blow-off",
        quantity: 150,
        unitOfMeasure: "SQFT",
        location: "Ridge"
      },
      {
        defectId: "d-02",
        trade: "PLUMBING",
        severity: "SEVERE",
        description: "Cracked PEX supply pipe",
        quantity: 25,
        unitOfMeasure: "LNFT",
        location: "Crawlspace"
      }
    ];

    const report = calc.generateProjectReport("PROJ-TEST-88", defects);
    expect(report.itemizedEstimates.length).toBe(2);
    expect(report.grandTotalUsd).toBeGreaterThan(0);
    expect(report.rangeLowEstimateUsd).toBeLessThan(report.grandTotalUsd);
    expect(report.rangeHighEstimateUsd).toBeGreaterThan(report.grandTotalUsd);
    expect(report.recommendedScopeSummary).toContain("PROJ-TEST-88");
  });
});
