/**
 * SNAP-09: Multi-Trade Defect Severity Matrix Auto-Scorer.
 * Evaluates multi-trade defect risk scores, building code violation hazards,
 * remediation SLAs, and overall facility health index (0-100).
 */

export type TradeCategory =
  | "COMMERCIAL_ROOFING"
  | "HVAC_MECHANICAL"
  | "ELECTRICAL"
  | "PLUMBING"
  | "STRUCTURAL";

export type BaseSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "LIFE_SAFETY_HAZARD";

export type FacilityOccupancy =
  | "VACANT"
  | "WAREHOUSE"
  | "COMMERCIAL_OFFICE"
  | "RESIDENTIAL"
  | "HEALTHCARE_CRITICAL";

export type RemediationSla =
  | "IMMEDIATE_24H"
  | "URGENT_48H"
  | "PRIORITY_7D"
  | "SCHEDULED_30D"
  | "ROUTINE_MONITORING";

export interface InspectionDefectInput {
  id: string;
  trade: TradeCategory;
  defectName: string;
  baseSeverity: BaseSeverity;
  hasWaterIntrusion?: boolean;
  thermalDeltaTCelsius?: number;
  occupancy?: FacilityOccupancy;
  codeReference?: string; // e.g. "IBC 1507.2", "NFPA 70 110.12"
}

export interface DefectRiskAssessment {
  defectId: string;
  trade: TradeCategory;
  defectName: string;
  riskScore: number; // 0 to 100
  effectiveSeverity: BaseSeverity;
  remediationSla: RemediationSla;
  codeReference?: string;
  multipliersApplied: string[];
}

export interface InspectionHealthReport {
  totalDefects: number;
  facilityHealthIndex: number; // 0 to 100 (100 = perfect, 0 = condemned)
  healthGrade: "EXCELLENT" | "SATISFACTORY" | "MARGINAL" | "CRITICAL_DEFICIT";
  tradeBreakdowns: Record<
    TradeCategory,
    { defectCount: number; averageRiskScore: number }
  >;
  urgentActionItems: DefectRiskAssessment[];
}

const BASE_SEVERITY_POINTS: Record<BaseSeverity, number> = {
  LOW: 15,
  MEDIUM: 35,
  HIGH: 65,
  CRITICAL: 85,
  LIFE_SAFETY_HAZARD: 100,
};

const OCCUPANCY_MULTIPLIER: Record<FacilityOccupancy, number> = {
  VACANT: 0.9,
  WAREHOUSE: 1.0,
  COMMERCIAL_OFFICE: 1.15,
  RESIDENTIAL: 1.25,
  HEALTHCARE_CRITICAL: 1.5,
};

export function calculateDefectRisk(
  defect: InspectionDefectInput
): DefectRiskAssessment {
  let score = BASE_SEVERITY_POINTS[defect.baseSeverity];
  const multipliers: string[] = [];

  // Occupancy impact
  const occ = defect.occupancy || "COMMERCIAL_OFFICE";
  const occMult = OCCUPANCY_MULTIPLIER[occ];
  if (occMult !== 1.0) {
    score *= occMult;
    multipliers.push(`OCCUPANCY_${occ}_x${occMult.toFixed(2)}`);
  }

  // Active water intrusion
  if (defect.hasWaterIntrusion) {
    score *= 1.35;
    multipliers.push("WATER_INTRUSION_x1.35");
  }

  // Thermal anomaly delta-T
  if (defect.thermalDeltaTCelsius && defect.thermalDeltaTCelsius >= 15) {
    score *= 1.25;
    multipliers.push(`THERMAL_DELTA_${defect.thermalDeltaTCelsius}C_x1.25`);
  }

  const boundedScore = Math.min(100, Math.max(0, Math.round(score)));

  let effectiveSeverity = defect.baseSeverity;
  let sla: RemediationSla = "ROUTINE_MONITORING";

  if (boundedScore >= 90 || defect.baseSeverity === "LIFE_SAFETY_HAZARD") {
    effectiveSeverity = "LIFE_SAFETY_HAZARD";
    sla = "IMMEDIATE_24H";
  } else if (boundedScore >= 75 || defect.baseSeverity === "CRITICAL") {
    effectiveSeverity = "CRITICAL";
    sla = "URGENT_48H";
  } else if (boundedScore >= 55 || defect.baseSeverity === "HIGH") {
    effectiveSeverity = "HIGH";
    sla = "PRIORITY_7D";
  } else if (boundedScore >= 30 || defect.baseSeverity === "MEDIUM") {
    effectiveSeverity = "MEDIUM";
    sla = "SCHEDULED_30D";
  }

  return {
    defectId: defect.id,
    trade: defect.trade,
    defectName: defect.defectName,
    riskScore: boundedScore,
    effectiveSeverity,
    remediationSla: sla,
    codeReference: defect.codeReference,
    multipliersApplied: multipliers,
  };
}

export function evaluateInspectionHealth(
  defects: InspectionDefectInput[]
): InspectionHealthReport {
  const tradeStats: Record<
    TradeCategory,
    { defectCount: number; totalScore: number }
  > = {
    COMMERCIAL_ROOFING: { defectCount: 0, totalScore: 0 },
    HVAC_MECHANICAL: { defectCount: 0, totalScore: 0 },
    ELECTRICAL: { defectCount: 0, totalScore: 0 },
    PLUMBING: { defectCount: 0, totalScore: 0 },
    STRUCTURAL: { defectCount: 0, totalScore: 0 },
  };

  const urgentItems: DefectRiskAssessment[] = [];
  let cumulativePenalty = 0;

  for (const d of defects) {
    const assessment = calculateDefectRisk(d);
    tradeStats[d.trade].defectCount++;
    tradeStats[d.trade].totalScore += assessment.riskScore;

    if (
      assessment.effectiveSeverity === "CRITICAL" ||
      assessment.effectiveSeverity === "LIFE_SAFETY_HAZARD"
    ) {
      urgentItems.push(assessment);
    }

    // Weight penalty toward health degradation
    cumulativePenalty += assessment.riskScore * 0.25;
  }

  const rawHealth = Math.max(0, Math.min(100, Math.round(100 - cumulativePenalty)));

  let healthGrade: "EXCELLENT" | "SATISFACTORY" | "MARGINAL" | "CRITICAL_DEFICIT" =
    "EXCELLENT";
  if (urgentItems.some((u) => u.effectiveSeverity === "LIFE_SAFETY_HAZARD") || rawHealth < 50) {
    healthGrade = "CRITICAL_DEFICIT";
  } else if (rawHealth < 70) {
    healthGrade = "MARGINAL";
  } else if (rawHealth < 85) {
    healthGrade = "SATISFACTORY";
  }

  const tradeBreakdowns: Record<
    TradeCategory,
    { defectCount: number; averageRiskScore: number }
  > = {} as any;

  for (const [trade, stats] of Object.entries(tradeStats)) {
    const t = trade as TradeCategory;
    tradeBreakdowns[t] = {
      defectCount: stats.defectCount,
      averageRiskScore:
        stats.defectCount > 0 ? Math.round(stats.totalScore / stats.defectCount) : 0,
    };
  }

  // Sort urgent items highest risk first
  urgentItems.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalDefects: defects.length,
    facilityHealthIndex: rawHealth,
    healthGrade,
    tradeBreakdowns,
    urgentActionItems: urgentItems,
  };
}
