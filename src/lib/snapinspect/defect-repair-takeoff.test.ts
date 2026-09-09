/**
 * Unit Test Suite for SNAP-22: Automated Defect Repair Cost Estimation & Material Takeoff Calculator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  calculateSingleDefectTakeoff,
  generateTakeoffSummary,
  CadDefectItem
} from "./defect-repair-takeoff";

describe("SNAP-22: Automated Defect Repair Cost Estimation & Material Takeoff Calculator", () => {
  it("calculates commercial roofing single-defect takeoff correctly", () => {
    const defect: CadDefectItem = {
      defectId: "d-roof-01",
      trade: "COMMERCIAL_ROOFING",
      defectType: "TPO Puncture Membrane Breach",
      measuredQuantity: 150, // 150 sq ft
      unit: "SQ_FT",
      severityLevel: "HIGH",
    };

    const takeoff = calculateSingleDefectTakeoff(defect);
    expect(takeoff.defectId).toBe("d-roof-01");
    expect(takeoff.materials.length).toBe(2);
    expect(takeoff.totalMaterialsCostUsd).toBeGreaterThan(300);
    expect(takeoff.laborHours).toBeGreaterThanOrEqual(2.0);
    expect(takeoff.subtotalCostUsd).toBeGreaterThan(takeoff.totalMaterialsCostUsd);
  });

  it("calculates structural masonry crack injection takeoff", () => {
    const crackDefect: CadDefectItem = {
      defectId: "d-crack-01",
      trade: "STRUCTURAL_MASONRY",
      defectType: "Shear Wall Diagonal Crack",
      measuredQuantity: 25, // 25 linear ft
      unit: "LINEAR_FT",
      severityLevel: "CRITICAL",
    };

    const takeoff = calculateSingleDefectTakeoff(crackDefect);
    expect(takeoff.defectType).toBe("Shear Wall Diagonal Crack");
    expect(takeoff.laborCostUsd).toBeGreaterThan(150);
    expect(takeoff.totalMaterialsCostUsd).toBeGreaterThan(100);
  });

  it("aggregates multi-trade defect list into comprehensive bid summary with contingency", () => {
    const defects: CadDefectItem[] = [
      {
        defectId: "d-1",
        trade: "COMMERCIAL_ROOFING",
        defectType: "Roof Blister",
        measuredQuantity: 100,
        unit: "SQ_FT",
        severityLevel: "MEDIUM",
      },
      {
        defectId: "d-2",
        trade: "THERMAL_ENVELOPE",
        defectType: "Wet Polyiso Board",
        measuredQuantity: 64,
        unit: "SQ_FT",
        severityLevel: "HIGH",
      }
    ];

    const summary = generateTakeoffSummary("insp-test-99", defects, 15.0);
    expect(summary.inspectionId).toBe("insp-test-99");
    expect(summary.itemizedEstimates).toHaveLength(2);
    expect(summary.contingencyPct).toBe(15.0);
    expect(summary.contingencyCostUsd).toBeGreaterThan(0);
    expect(summary.grandTotalEstimatedCostUsd).toBe(
      Number((summary.totalMaterialsCostUsd + summary.totalLaborCostUsd + summary.contingencyCostUsd).toFixed(2))
    );
  });
});
