/**
 * SNAP-22: Automated Defect Repair Cost Estimation & Material Takeoff Calculator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Computes material quantities, RSMeans-aligned labor productivity, waste factor adjustments,
 * and contractor overhead & profit (O&P) to produce defensible repair cost estimates.
 */

export type InspectionTrade = "ROOFING" | "DRYWALL" | "PLUMBING" | "ELECTRICAL" | "HVAC" | "MASONRY";
export type DefectSeverity = "MINOR" | "MODERATE" | "SEVERE" | "CRITICAL";

export interface DefectItemInput {
  defectId: string;
  trade: InspectionTrade;
  severity: DefectSeverity;
  description: string;
  quantity: number; // square feet, linear feet, or unit count
  unitOfMeasure: "SQFT" | "LNFT" | "UNIT";
  location: string;
}

export interface MaterialCostItem {
  materialName: string;
  requiredQuantity: number;
  wasteAdjustedQuantity: number;
  unit: string;
  unitPriceUsd: number;
  subtotalUsd: number;
}

export interface DefectEstimateSummary {
  defectId: string;
  trade: InspectionTrade;
  severity: DefectSeverity;
  materials: MaterialCostItem[];
  materialTotalUsd: number;
  laborHours: number;
  laborTotalUsd: number;
  overheadAndProfitUsd: number;
  totalCostUsd: number;
}

export interface ProjectTakeoffReport {
  projectId: string;
  itemizedEstimates: DefectEstimateSummary[];
  grandMaterialTotalUsd: number;
  grandLaborTotalUsd: number;
  grandOverheadAndProfitUsd: number;
  grandTotalUsd: number;
  rangeLowEstimateUsd: number;  // -15%
  rangeHighEstimateUsd: number; // +20%
  recommendedScopeSummary: string;
}

export class MaterialTakeoffCostCalculator {
  private baseHourlyLaborRate: number;
  private contractorOpPercentage: number; // default 0.20 (20%)
  private wasteFactorPercentage: number;  // default 0.12 (12%)

  constructor(
    baseHourlyLaborRate: number = 85.0,
    contractorOpPercentage: number = 0.20,
    wasteFactorPercentage: number = 0.12
  ) {
    this.baseHourlyLaborRate = baseHourlyLaborRate;
    this.contractorOpPercentage = contractorOpPercentage;
    this.wasteFactorPercentage = wasteFactorPercentage;
  }

  public estimateDefect(defect: DefectItemInput): DefectEstimateSummary {
    const qty = Math.max(1, defect.quantity);
    const materials: MaterialCostItem[] = [];
    let laborHours = 0;

    const severityMultiplier = defect.severity === "CRITICAL" ? 1.5 :
                               defect.severity === "SEVERE" ? 1.3 :
                               defect.severity === "MODERATE" ? 1.1 : 1.0;

    switch (defect.trade) {
      case "ROOFING": {
        // Roofing shingles (3 bundles per square = 100 sqft)
        const squares = qty / 100;
        const bundlesNeeded = Math.ceil(squares * 3);
        const wasteQty = Math.ceil(bundlesNeeded * (1 + this.wasteFactorPercentage));
        materials.push({
          materialName: "Architectural Asphalt Shingles (Bundle)",
          requiredQuantity: bundlesNeeded,
          wasteAdjustedQuantity: wasteQty,
          unit: "bundle",
          unitPriceUsd: 38.0,
          subtotalUsd: Math.round(wasteQty * 38.0 * 100) / 100
        });
        materials.push({
          materialName: "Synthetic Underlayment & Fasteners",
          requiredQuantity: Math.ceil(squares),
          wasteAdjustedQuantity: Math.ceil(squares * (1 + this.wasteFactorPercentage)),
          unit: "roll_portion",
          unitPriceUsd: 25.0,
          subtotalUsd: Math.round(Math.ceil(squares * (1 + this.wasteFactorPercentage)) * 25.0 * 100) / 100
        });
        laborHours = Math.round((squares * 2.2 * severityMultiplier) * 10) / 10;
        break;
      }

      case "DRYWALL": {
        // 4x8 drywall sheet = 32 sqft
        const sheetsNeeded = Math.ceil(qty / 32);
        const wasteQty = Math.ceil(sheetsNeeded * (1 + this.wasteFactorPercentage));
        materials.push({
          materialName: "1/2-in Mold-Resistant Gypsum Board (4x8)",
          requiredQuantity: sheetsNeeded,
          wasteAdjustedQuantity: wasteQty,
          unit: "sheet",
          unitPriceUsd: 16.50,
          subtotalUsd: Math.round(wasteQty * 16.50 * 100) / 100
        });
        materials.push({
          materialName: "Joint Compound & Fiber Tape",
          requiredQuantity: 1,
          wasteAdjustedQuantity: 1,
          unit: "pail",
          unitPriceUsd: 22.0,
          subtotalUsd: 22.0
        });
        laborHours = Math.round((sheetsNeeded * 1.5 * severityMultiplier) * 10) / 10;
        break;
      }

      case "PLUMBING": {
        const wasteQty = Math.ceil(qty * (1 + this.wasteFactorPercentage));
        materials.push({
          materialName: "PEX-A Pipe & Brass Crimp Fittings",
          requiredQuantity: qty,
          wasteAdjustedQuantity: wasteQty,
          unit: defect.unitOfMeasure.toLowerCase(),
          unitPriceUsd: 3.25,
          subtotalUsd: Math.round(wasteQty * 3.25 * 100) / 100
        });
        laborHours = Math.round((Math.max(2.0, qty * 0.4) * severityMultiplier) * 10) / 10;
        break;
      }

      default: {
        const wasteQty = Math.ceil(qty * (1 + this.wasteFactorPercentage));
        materials.push({
          materialName: `Standard ${defect.trade.toLowerCase()} repair kit`,
          requiredQuantity: qty,
          wasteAdjustedQuantity: wasteQty,
          unit: defect.unitOfMeasure.toLowerCase(),
          unitPriceUsd: 20.0,
          subtotalUsd: Math.round(wasteQty * 20.0 * 100) / 100
        });
        laborHours = Math.round((Math.max(1.5, qty * 0.25) * severityMultiplier) * 10) / 10;
        break;
      }
    }

    const materialTotalUsd = Math.round(materials.reduce((sum, m) => sum + m.subtotalUsd, 0) * 100) / 100;
    const laborTotalUsd = Math.round(laborHours * this.baseHourlyLaborRate * 100) / 100;
    const subtotal = materialTotalUsd + laborTotalUsd;
    const overheadAndProfitUsd = Math.round(subtotal * this.contractorOpPercentage * 100) / 100;
    const totalCostUsd = Math.round((subtotal + overheadAndProfitUsd) * 100) / 100;

    return {
      defectId: defect.defectId,
      trade: defect.trade,
      severity: defect.severity,
      materials,
      materialTotalUsd,
      laborHours,
      laborTotalUsd,
      overheadAndProfitUsd,
      totalCostUsd
    };
  }

  public generateProjectReport(projectId: string, defects: DefectItemInput[]): ProjectTakeoffReport {
    const estimates = defects.map(d => this.estimateDefect(d));
    const grandMaterial = Math.round(estimates.reduce((s, e) => s + e.materialTotalUsd, 0) * 100) / 100;
    const grandLabor = Math.round(estimates.reduce((s, e) => s + e.laborTotalUsd, 0) * 100) / 100;
    const grandOp = Math.round(estimates.reduce((s, e) => s + e.overheadAndProfitUsd, 0) * 100) / 100;
    const grandTotal = Math.round((grandMaterial + grandLabor + grandOp) * 100) / 100;

    const rangeLow = Math.round(grandTotal * 0.85 * 100) / 100;
    const rangeHigh = Math.round(grandTotal * 1.20 * 100) / 100;

    const summary = `Inspection ${projectId}: ${defects.length} items evaluated across trades. Baseline cost: $${grandTotal} (Low: $${rangeLow}, High: $${rangeHigh}) with ${this.contractorOpPercentage * 100}% contractor O&P included.`;

    return {
      projectId,
      itemizedEstimates: estimates,
      grandMaterialTotalUsd: grandMaterial,
      grandLaborTotalUsd: grandLabor,
      grandOverheadAndProfitUsd: grandOp,
      grandTotalUsd: grandTotal,
      rangeLowEstimateUsd: rangeLow,
      rangeHighEstimateUsd: rangeHigh,
      recommendedScopeSummary: summary
    };
  }
}
