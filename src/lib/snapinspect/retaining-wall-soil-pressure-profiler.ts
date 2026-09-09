/**
 * SNAP-43: Sub-Grade Geotechnical Retaining Wall Soil Lateral Pressure & Overturning Moment Profiler.
 * Part of SnapInspect AI Tactical Field Inspection Platform.
 *
 * Implements Rankine active earth pressure and geotechnical limit state equilibrium
 * to evaluate retaining wall overturning, sliding stability, and hydrostatic pore pressure risks.
 */

import { createHash } from "crypto";

export interface RetainingWallGeometry {
  wallHeightMeters: number;
  stemThicknessMeters: number;
  baseFootingWidthMeters: number;
  concreteDensityKnM3?: number; // default ~ 24.0 kN/m3
}

export interface BackfillGeotechnicalProps {
  soilFrictionAngleDeg: number;    // phi e.g. 30 - 36 deg
  soilUnitWeightKnM3: number;      // gamma e.g. 18.0 kN/m3
  waterTableHeightMeters: number;  // saturated hydrostatic height from base
  surchargeLoadKPa?: number;       // traffic or building surcharge q (kPa)
}

export interface WallStabilityAssessment {
  activeEarthPressureCoeffKa: number;
  totalLateralThrustKnM: number;
  overturningMomentKnMPerM: number;
  resistingMomentKnMPerM: number;
  factorOfSafetyOverturning: number;
  factorOfSafetySliding: number;
  drainageHydrostaticRisk: "HYDROSTATIC_ACCUMULATION_CRITICAL" | "MODERATE_PORE_PRESSURE" | "WELL_DRAINED";
  structuralSafetyRating: "SAFE_PASS" | "BORDERLINE_MONITORING" | "CRITICAL_COLLAPSE_HAZARD";
  remedialRecommendations: string[];
  auditDigestSha256: string;
}

export class RetainingWallSoilPressureProfiler {
  /**
   * Evaluates geotechnical lateral earth pressure, moments, and safety factors.
   */
  public static evaluateWallStability(
    geometry: RetainingWallGeometry,
    soil: BackfillGeotechnicalProps,
    baseFrictionCoeff: number = 0.50
  ): WallStabilityAssessment {
    const H = geometry.wallHeightMeters;
    const B = geometry.baseFootingWidthMeters;
    const t = geometry.stemThicknessMeters;
    const gammaC = geometry.concreteDensityKnM3 || 24.0;
    const q = soil.surchargeLoadKPa || 0.0;
    const Hw = Math.min(H, Math.max(0, soil.waterTableHeightMeters));

    // Rankine active lateral pressure coefficient Ka = (1 - sin(phi)) / (1 + sin(phi))
    const phiRad = (soil.soilFrictionAngleDeg * Math.PI) / 180.0;
    const Ka = (1.0 - Math.sin(phiRad)) / (1.0 + Math.sin(phiRad));

    // Effective lateral soil thrust Pa_soil = 0.5 * gamma * H^2 * Ka
    const PaSoil = 0.5 * soil.soilUnitWeightKnM3 * (H * H) * Ka;
    // Surcharge thrust Pa_q = q * H * Ka
    const PaQ = q * H * Ka;
    // Hydrostatic water thrust Pw = 0.5 * gamma_w * Hw^2 (gamma_w = 9.81 kN/m3)
    const gammaW = 9.81;
    const Pw = 0.5 * gammaW * (Hw * Hw);

    const totalLateralThrust = PaSoil + PaQ + Pw;

    // Overturning moments about wall toe:
    // Soil thrust acts at H/3
    // Surcharge acts at H/2
    // Water acts at Hw/3
    const MoSoil = PaSoil * (H / 3.0);
    const MoQ = PaQ * (H / 2.0);
    const MoW = Pw * (Hw / 3.0);
    const Mo = MoSoil + MoQ + MoW;

    // Resisting vertical weights and moments about toe:
    // 1. Concrete stem weight:
    const stemWeight = H * t * gammaC;
    const stemArm = B * 0.35; // typical toe width is 1/3 of base
    // 2. Concrete footing base weight:
    const footingThickness = t * 0.9;
    const baseWeight = B * footingThickness * gammaC;
    const baseArm = B * 0.5;
    // 3. Soil wedge on heel footing:
    const heelWidth = Math.max(0, B - stemArm - t);
    const soilHeelWeight = heelWidth * H * soil.soilUnitWeightKnM3;
    const soilHeelArm = B - heelWidth * 0.5;

    const totalWeight = stemWeight + baseWeight + soilHeelWeight;
    const Mr = (stemWeight * stemArm) + (baseWeight * baseArm) + (soilHeelWeight * soilHeelArm);

    const fsOverturning = Mo > 0 ? Mr / Mo : 99.0;
    const fsSliding = totalLateralThrust > 0 ? (totalWeight * baseFrictionCoeff) / totalLateralThrust : 99.0;

    const recommendations: string[] = [];
    let drainageRisk: WallStabilityAssessment["drainageHydrostaticRisk"] = "WELL_DRAINED";

    if (Hw > 0.5 * H) {
      drainageRisk = "HYDROSTATIC_ACCUMULATION_CRITICAL";
      recommendations.push("Immediate weephole unclogging or horizontal sub-drainage gravel pipe installation required");
    } else if (Hw > 0.1) {
      drainageRisk = "MODERATE_PORE_PRESSURE";
      recommendations.push("Inspect French drain backfill permeability");
    }

    let safetyRating: WallStabilityAssessment["structuralSafetyRating"] = "SAFE_PASS";

    if (fsOverturning < 1.5 || fsSliding < 1.5) {
      if (fsOverturning < 1.1 || fsSliding < 1.1) {
        safetyRating = "CRITICAL_COLLAPSE_HAZARD";
        recommendations.push("Evacuate zone immediately; install emergency raker shoring or deadman earth tieback anchors");
      } else {
        safetyRating = "BORDERLINE_MONITORING";
        recommendations.push("Install crack monitoring tell-tale displacement gauges and weekly tiltmeter survey");
      }
    }

    const payload = `${Ka.toFixed(4)}:${totalLateralThrust.toFixed(2)}:${fsOverturning.toFixed(2)}:${safetyRating}`;
    const auditDigestSha256 = createHash("sha256").update(payload).digest("hex");

    return {
      activeEarthPressureCoeffKa: Number(Ka.toFixed(4)),
      totalLateralThrustKnM: Number(totalLateralThrust.toFixed(2)),
      overturningMomentKnMPerM: Number(Mo.toFixed(2)),
      resistingMomentKnMPerM: Number(Mr.toFixed(2)),
      factorOfSafetyOverturning: Number(fsOverturning.toFixed(2)),
      factorOfSafetySliding: Number(fsSliding.toFixed(2)),
      drainageHydrostaticRisk: drainageRisk,
      structuralSafetyRating: safetyRating,
      remedialRecommendations: recommendations,
      auditDigestSha256
    };
  }
}
