/**
 * SNAP-22: Automated Defect Repair Cost Estimation & Material Takeoff Calculator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Computes itemized construction material takeoffs (BOM), regional labor hours,
 * equipment rentals, and contractor bid estimates directly from CAD defect geometries.
 */

export type TradeCategory = "COMMERCIAL_ROOFING" | "HVAC" | "STRUCTURAL_MASONRY" | "THERMAL_ENVELOPE";

export interface CadDefectItem {
  defectId: string;
  trade: TradeCategory;
  defectType: string;
  measuredQuantity: number;
  unit: "SQ_FT" | "LINEAR_FT" | "UNITS";
  severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface MaterialTakeoffLine {
  materialName: string;
  unitQuantity: number;
  unitCostUsd: number;
  extendedCostUsd: number;
}

export interface DefectRepairEstimate {
  defectId: string;
  defectType: string;
  trade: TradeCategory;
  materials: MaterialTakeoffLine[];
  totalMaterialsCostUsd: number;
  laborHours: number;
  laborCostUsd: number;
  subtotalCostUsd: number;
}

export interface TakeoffSummary {
  inspectionId: string;
  evaluatedAtIso: string;
  itemizedEstimates: DefectRepairEstimate[];
  totalMaterialsCostUsd: number;
  totalLaborCostUsd: number;
  contingencyPct: number;
  contingencyCostUsd: number;
  grandTotalEstimatedCostUsd: number;
}

export const HOURLY_LABOR_RATES: Record<TradeCategory, number> = {
  COMMERCIAL_ROOFING: 95.0,
  HVAC: 125.0,
  STRUCTURAL_MASONRY: 110.0,
  THERMAL_ENVELOPE: 85.0,
};

export function calculateSingleDefectTakeoff(defect: CadDefectItem): DefectRepairEstimate {
  const materials: MaterialTakeoffLine[] = [];
  let laborHours = 0;

  switch (defect.trade) {
    case "COMMERCIAL_ROOFING": {
      // e.g. TPO/EPDM membrane repair
      const membraneQty = Math.ceil(defect.measuredQuantity * 1.15); // 15% waste
      const adhesiveQty = Math.ceil(defect.measuredQuantity / 100);
      materials.push({
        materialName: "60-mil TPO Single-Ply Membrane (sq ft)",
        unitQuantity: membraneQty,
        unitCostUsd: 1.85,
        extendedCostUsd: Number((membraneQty * 1.85).toFixed(2)),
      });
      materials.push({
        materialName: "Bonding Adhesive (5-gal pail)",
        unitQuantity: adhesiveQty,
        unitCostUsd: 145.0,
        extendedCostUsd: Number((adhesiveQty * 145.0).toFixed(2)),
      });
      laborHours = Math.max(2.0, Number((defect.measuredQuantity * 0.08).toFixed(1)));
      break;
    }
    case "STRUCTURAL_MASONRY": {
      // e.g. Epoxy crack injection
      const tubes = Math.ceil(defect.measuredQuantity / 10);
      materials.push({
        materialName: "High-Modulus Epoxy Injection Gel (cartridge)",
        unitQuantity: tubes,
        unitCostUsd: 48.0,
        extendedCostUsd: Number((tubes * 48.0).toFixed(2)),
      });
      materials.push({
        materialName: "Surface Seal & Port Kit",
        unitQuantity: 1,
        unitCostUsd: 65.0,
        extendedCostUsd: 65.0,
      });
      laborHours = Math.max(1.5, Number((defect.measuredQuantity * 0.15).toFixed(1)));
      break;
    }
    case "THERMAL_ENVELOPE": {
      // e.g. Polyiso insulation replacement
      const boards = Math.ceil(defect.measuredQuantity / 32); // 4x8 sheet
      materials.push({
        materialName: "2.5-inch Polyiso Insulation Board 4x8",
        unitQuantity: boards,
        unitCostUsd: 52.0,
        extendedCostUsd: Number((boards * 52.0).toFixed(2)),
      });
      materials.push({
        materialName: "Insulation Fasteners & Sealing Tape",
        unitQuantity: 1,
        unitCostUsd: 40.0,
        extendedCostUsd: 40.0,
      });
      laborHours = Math.max(2.0, Number((defect.measuredQuantity * 0.05).toFixed(1)));
      break;
    }
    case "HVAC":
    default: {
      materials.push({
        materialName: "Mastic Sealant & Sheet Metal Patch",
        unitQuantity: defect.measuredQuantity,
        unitCostUsd: 25.0,
        extendedCostUsd: Number((defect.measuredQuantity * 25.0).toFixed(2)),
      });
      laborHours = Math.max(1.0, Number((defect.measuredQuantity * 0.5).toFixed(1)));
      break;
    }
  }

  const matTotal = materials.reduce((acc, m) => acc + m.extendedCostUsd, 0);
  const laborRate = HOURLY_LABOR_RATES[defect.trade] ?? 95.0;
  const laborTotal = Number((laborHours * laborRate).toFixed(2));
  const subtotal = Number((matTotal + laborTotal).toFixed(2));

  return {
    defectId: defect.defectId,
    defectType: defect.defectType,
    trade: defect.trade,
    materials,
    totalMaterialsCostUsd: Number(matTotal.toFixed(2)),
    laborHours,
    laborCostUsd: laborTotal,
    subtotalCostUsd: subtotal,
  };
}

export function generateTakeoffSummary(
  inspectionId: string,
  defects: CadDefectItem[],
  contingencyPct: number = 15.0
): TakeoffSummary {
  const estimates = defects.map(calculateSingleDefectTakeoff);
  const totalMat = estimates.reduce((acc, e) => acc + e.totalMaterialsCostUsd, 0);
  const totalLabor = estimates.reduce((acc, e) => acc + e.laborCostUsd, 0);
  const baseSubtotal = totalMat + totalLabor;
  const contingencyCost = Number(((baseSubtotal * contingencyPct) / 100).toFixed(2));
  const grandTotal = Number((baseSubtotal + contingencyCost).toFixed(2));

  return {
    inspectionId,
    evaluatedAtIso: new Date().toISOString(),
    itemizedEstimates: estimates,
    totalMaterialsCostUsd: Number(totalMat.toFixed(2)),
    totalLaborCostUsd: Number(totalLabor.toFixed(2)),
    contingencyPct,
    contingencyCostUsd: contingencyCost,
    grandTotalEstimatedCostUsd: grandTotal,
  };
}

export const DefectRepairTakeoffCalculator = {
  HOURLY_LABOR_RATES,
  calculateSingleDefectTakeoff,
  generateTakeoffSummary,
};
