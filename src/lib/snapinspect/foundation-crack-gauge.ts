/**
 * SNAP-19: Foundation Structural Crack Width & Settlement Displacement Gauge.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Evaluates foundation structural crack severity according to civil engineering criteria
 * (BRE Digest 251 / ACI 224R), computes displacement rates across inspection intervals,
 * and generates actionable repair recommendations.
 */

export type CrackOrientation = "VERTICAL" | "HORIZONTAL" | "DIAGONAL" | "STAIR_STEP";

export type FoundationSubstrate = "POURED_CONCRETE" | "CONCRETE_BLOCK_CMU" | "BRICK_MASONRY" | "STONE_RUBBLE";

export type StructuralDamageCategory =
  | "CATEGORY_0_NEGLIGIBLE"   // < 0.1mm Hairline
  | "CATEGORY_1_VERY_SLIGHT"  // 0.1mm - 1.0mm
  | "CATEGORY_2_SLIGHT"       // 1.0mm - 5.0mm
  | "CATEGORY_3_MODERATE"     // 5.0mm - 15.0mm
  | "CATEGORY_4_SEVERE"       // 15.0mm - 25.0mm
  | "CATEGORY_5_VERY_SEVERE"; // > 25.0mm

export interface CrackMeasurement {
  id: string;
  locationLabel: string;
  widthMm: number;
  depthMm?: number;
  lengthMeters: number;
  orientation: CrackOrientation;
  substrate: FoundationSubstrate;
  measuredAtIso: string;
  hasWaterIntrusion: boolean;
  hasShearDisplacement: boolean; // Out-of-plane horizontal shift
}

export interface CrackEvaluation {
  id: string;
  locationLabel: string;
  damageCategory: StructuralDamageCategory;
  categoryNumber: number; // 0 to 5
  isStructuralConcern: boolean;
  actionPriority: "ROUTINE_MONITORING" | "MAINTENANCE_REPAIR" | "STRUCTURAL_ENGINEER_REVIEW" | "IMMEDIATE_SHORING";
  summary: string;
  recommendedRemediation: string;
}

export interface ProgressiveDisplacementTrend {
  initialWidthMm: number;
  latestWidthMm: number;
  elapsedMonths: number;
  velocityMmPerMonth: number;
  isProgressiveActiveSettlement: boolean;
  warningText: string;
}

export class FoundationCrackGauge {
  /**
   * Evaluates a single foundation crack measurement.
   */
  public static evaluateMeasurement(m: CrackMeasurement): CrackEvaluation {
    let damageCategory: StructuralDamageCategory = "CATEGORY_0_NEGLIGIBLE";
    let categoryNumber = 0;
    let isStructuralConcern = false;
    let actionPriority: CrackEvaluation["actionPriority"] = "ROUTINE_MONITORING";
    let summary = "Superficial hairline shrinkage crack.";
    let recommendedRemediation = "Cosmetic surface sealant or ongoing baseline observation.";

    const w = m.widthMm;

    if (w < 0.1) {
      damageCategory = "CATEGORY_0_NEGLIGIBLE";
      categoryNumber = 0;
    } else if (w < 1.0) {
      damageCategory = "CATEGORY_1_VERY_SLIGHT";
      categoryNumber = 1;
      summary = "Slight hairline crack, typical concrete curing shrinkage.";
      recommendedRemediation = "Apply flexible polyurethane or epoxy surface coat.";
    } else if (w <= 5.0) {
      damageCategory = "CATEGORY_2_SLIGHT";
      categoryNumber = 2;
      summary = "Slight fracture, doors/windows in vicinity may experience minor sticking.";
      recommendedRemediation = "Hydraulic cement patching or elastomeric masonry caulking.";
    } else if (w <= 15.0) {
      damageCategory = "CATEGORY_3_MODERATE";
      categoryNumber = 3;
      isStructuralConcern = true;
      actionPriority = "MAINTENANCE_REPAIR";
      summary = "Moderate structural fracture with potential differential settlement.";
      recommendedRemediation = "Epoxy pressure injection and carbon fiber structural reinforcement stitches.";
    } else if (w <= 25.0) {
      damageCategory = "CATEGORY_4_SEVERE";
      categoryNumber = 4;
      isStructuralConcern = true;
      actionPriority = "STRUCTURAL_ENGINEER_REVIEW";
      summary = "Severe displacement fracture indicating significant foundation deflection or lateral earth pressure.";
      recommendedRemediation = "Professional structural engineer inspection, helical tiebacks, or steel I-beam bracing.";
    } else {
      damageCategory = "CATEGORY_5_VERY_SEVERE";
      categoryNumber = 5;
      isStructuralConcern = true;
      actionPriority = "IMMEDIATE_SHORING";
      summary = "Catastrophic structural failure risk with wall deflection > 25mm.";
      recommendedRemediation = "Immediate shoring/underpinning and full engineering restoration.";
    }

    // Secondary risk escalation factors:
    // Shear displacement or stair-step cracks on CMU/brick indicate foundation wall rotational failure
    if (m.hasShearDisplacement || (m.orientation === "STAIR_STEP" && w >= 3.0)) {
      isStructuralConcern = true;
      if (categoryNumber <= 3) {
        actionPriority = "STRUCTURAL_ENGINEER_REVIEW";
      }
    }

    if (m.hasWaterIntrusion && categoryNumber >= 2) {
      recommendedRemediation += " Waterproofing membrane and exterior perimeter drain tile repair required.";
    }

    return {
      id: m.id,
      locationLabel: m.locationLabel,
      damageCategory,
      categoryNumber,
      isStructuralConcern,
      actionPriority,
      summary,
      recommendedRemediation
    };
  }

  /**
   * Computes progressive displacement rate between two historical measurements of the same crack.
   */
  public static calculateProgressiveRate(
    initial: CrackMeasurement,
    latest: CrackMeasurement
  ): ProgressiveDisplacementTrend {
    const tInit = new Date(initial.measuredAtIso).getTime();
    const tLate = new Date(latest.measuredAtIso).getTime();
    const elapsedDays = Math.max(1, (tLate - tInit) / (1000 * 60 * 60 * 24));
    const elapsedMonths = elapsedDays / 30.4375;

    const deltaMm = Math.max(0, latest.widthMm - initial.widthMm);
    const velocityMmPerMonth = deltaMm / elapsedMonths;

    // Rate exceeding 0.2 mm / month (2.4 mm/year) indicates active ongoing foundation movement
    const isProgressive = velocityMmPerMonth >= 0.15;
    const warningText = isProgressive
      ? `Active settlement detected at ${velocityMmPerMonth.toFixed(2)} mm/month. Immediate stabilization required.`
      : `Settlement appears dormant or stable (${velocityMmPerMonth.toFixed(2)} mm/month).`;

    return {
      initialWidthMm: initial.widthMm,
      latestWidthMm: latest.widthMm,
      elapsedMonths,
      velocityMmPerMonth,
      isProgressiveActiveSettlement: isProgressive,
      warningText
    };
  }
}
