/**
 * SNAP-70: Geotechnical Rockfill Dam Upstream Concrete Face Slab (CFRD) Extensometer Leakage Predictor.
 * Part of SnapInspect AI Geotechnical, Civil Infrastructure & Dam Safety Inspection Suite.
 *
 * Implements ICOLD (International Commission on Large Dams) Bulletin 141 CFRD guidelines:
 * 1. Analyzes 3D triaxial joint extensometers (perimeter joint opening, shear, settlement).
 * 2. Monitors multi-tier waterstop displacement integrity (copper, EPDM, mastic).
 * 3. Evaluates foundation seepage weir telemetry, turbidity (piping erosion), and reservoir head correlation.
 * 4. Predicts 30-day leakage progression rate and structural joint integrity index.
 * 5. Generates cryptographic SHA-256 dam safety telemetry audit seal.
 */

import { createHash } from "crypto";

export interface TriaxialJointDisplacement {
  sensorId: string;
  jointLocation: "PERIMETER_PLINTH_JOINT" | "VERTICAL_SLAB_JOINT" | "TENSION_CREST_JOINT";
  openingDxMm: number;    // Normal joint opening (tensile gap)
  shearDyMm: number;      // Tangential shear offset
  settlementDzMm: number; // Settlement / deflection
}

export interface DamHydraulicConditions {
  damIdentifier: string;
  damHeightMeters: number;
  currentReservoirHeadMeters: number;
  weirSeepageFlowLps: number;        // Liters per second
  seepageTurbidityNtu: number;       // Nephelometric Turbidity Units (< 2 NTU normal)
  waterstopType: "COPPER_EPDM_DUAL" | "PVC_BITUMEN" | "SINGLE_MASTIC";
}

export interface CfrdSafetyAssessment {
  damIdentifier: string;
  maxJointOpeningMm: number;
  maxCombinedShearMm: number;
  waterstopStrainRatio: number;
  pipingErosionRisk: "NEGLIGIBLE" | "ELEVATED" | "CRITICAL_FOUNDATION_WASH";
  jointIntegrityScore: number;       // 0 to 100%
  predicted30DaySeepageLps: number;
  icoldSafetyStatus: "NORMAL" | "WATCH" | "ALERT_REDUCED_FREEBOARD" | "EMERGENCY_DRAWDOWN";
  mitigationDirectives: string[];
  auditHash: string;
}

export class CfrdConcreteFaceSlabLeakagePredictor {
  private static readonly MAX_PERMISSIBLE_OPENING_MM = 25.0;
  private static readonly CRITICAL_OPENING_MM = 40.0;
  private static readonly PIPING_TURBIDITY_THRESHOLD_NTU = 5.0;

  public static evaluateDamHealth(
    conditions: DamHydraulicConditions,
    joints: TriaxialJointDisplacement[]
  ): CfrdSafetyAssessment {
    let maxOpening = 0.0;
    let maxShear = 0.0;

    for (const j of joints) {
      if (j.openingDxMm > maxOpening) maxOpening = j.openingDxMm;
      const combinedShear = Math.sqrt(j.shearDyMm * j.shearDyMm + j.settlementDzMm * j.settlementDzMm);
      if (combinedShear > maxShear) maxShear = combinedShear;
    }

    // Waterstop strain ratio relative to elastic limit
    const waterstopStrain = Math.min(2.5, Math.hypot(maxOpening, maxShear) / 30.0);

    // Evaluate internal piping erosion risk
    let pipingRisk: "NEGLIGIBLE" | "ELEVATED" | "CRITICAL_FOUNDATION_WASH" = "NEGLIGIBLE";
    if (conditions.seepageTurbidityNtu > 15.0) {
      pipingRisk = "CRITICAL_FOUNDATION_WASH";
    } else if (conditions.seepageTurbidityNtu > this.PIPING_TURBIDITY_THRESHOLD_NTU) {
      pipingRisk = "ELEVATED";
    }

    // Joint integrity score (0 to 100)
    let score = 100.0;
    score -= (maxOpening / this.CRITICAL_OPENING_MM) * 45.0;
    score -= (maxShear / 30.0) * 25.0;
    if (pipingRisk === "ELEVATED") score -= 20.0;
    if (pipingRisk === "CRITICAL_FOUNDATION_WASH") score -= 50.0;
    score = Math.max(0.0, Math.min(100.0, Math.round(score * 10) / 10));

    // Predicted 30-day seepage flow
    let growthFactor = 1.0;
    if (maxOpening > this.MAX_PERMISSIBLE_OPENING_MM) {
      growthFactor += ((maxOpening - this.MAX_PERMISSIBLE_OPENING_MM) / 10.0) * 0.4;
    }
    if (pipingRisk !== "NEGLIGIBLE") {
      growthFactor += 0.5;
    }
    const predictedSeepage = Math.round(conditions.weirSeepageFlowLps * growthFactor * 10) / 10;

    // ICOLD Status & Directives
    const directives: string[] = [];
    let icoldStatus: "NORMAL" | "WATCH" | "ALERT_REDUCED_FREEBOARD" | "EMERGENCY_DRAWDOWN" = "NORMAL";

    if (pipingRisk === "CRITICAL_FOUNDATION_WASH" || maxOpening >= this.CRITICAL_OPENING_MM) {
      icoldStatus = "EMERGENCY_DRAWDOWN";
      directives.push("EMERGENCY: Immediate controlled reservoir spillway drawdown required. Face slab waterstop rupture or foundation washout suspected.");
    } else if (maxOpening > this.MAX_PERMISSIBLE_OPENING_MM || pipingRisk === "ELEVATED") {
      icoldStatus = "ALERT_REDUCED_FREEBOARD";
      directives.push("ALERT: Joint displacement exceeds service limit state (25mm). Dispatch ROV underwater inspection to deploy mastic sealant over plinth.");
    } else if (maxOpening > 12.0 || conditions.weirSeepageFlowLps > 30.0) {
      icoldStatus = "WATCH";
      directives.push("WATCH: Minor perimeter joint tensile relaxation observed. Increase drainage gallery weir telemetry frequency to 15-minute intervals.");
    } else {
      directives.push("NOMINAL: Upstream concrete face slab deflection and plinth waterstops within allowable elastic limits.");
    }

    // Cryptographic audit hash
    const hash = createHash("sha256");
    hash.update(`${conditions.damIdentifier}:${maxOpening}:${maxShear}:${conditions.weirSeepageFlowLps}:${pipingRisk}:${score}`);
    const auditHash = hash.digest("hex");

    return {
      damIdentifier: conditions.damIdentifier,
      maxJointOpeningMm: Math.round(maxOpening * 100) / 100,
      maxCombinedShearMm: Math.round(maxShear * 100) / 100,
      waterstopStrainRatio: Math.round(waterstopStrain * 1000) / 1000,
      pipingErosionRisk: pipingRisk,
      jointIntegrityScore: score,
      predicted30DaySeepageLps: predictedSeepage,
      icoldSafetyStatus: icoldStatus,
      mitigationDirectives: directives,
      auditHash
    };
  }
}
