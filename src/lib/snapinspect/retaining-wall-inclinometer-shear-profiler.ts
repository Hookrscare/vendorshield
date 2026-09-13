/**
 * SNAP-55: Retaining Wall Deep Inclinometer Shear Plane Displacement Velocity Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Complies with ASTM D6230 (Standard Test Method for Monitoring Ground Movement Using Probe Inclinometers):
 * 1. Analyzes cumulative horizontal displacement along casing depth intervals.
 * 2. Identifies subsurface shear slip zones via localized angular deflection gradients.
 * 3. Calculates displacement velocities (mm/30 days) across baseline and current epochs.
 * 4. Issues geotechnical alarm thresholds for excavation retention systems and slope stability.
 */

import { createHash } from "crypto";

export interface InclinometerDepthReading {
  depthMeters: number; // e.g. 0.0m (crest) down to 20.0m (toe/bedrock)
  lateralDeviationMm: number; // Measured incremental horizontal deviation
}

export interface InclinometerSurveyRequest {
  inclinometerId: string; // e.g. "INC-WALL-04B"
  wallHeightMeters: number;
  daysBetweenSurveys: number;
  baselineReadings: InclinometerDepthReading[];
  currentReadings: InclinometerDepthReading[];
}

export interface InclinometerProfileResult {
  inclinometerId: string;
  totalDepthMeters: number;
  maxCumulativeDisplacementMm: number;
  criticalShearPlaneDepthMeters: number;
  maxDisplacementRateMmPerMonth: number;
  stabilityVerdict: "STABLE_ELASTIC" | "CREEP_MONITORING_ALERT" | "ACTIVE_SHEAR_FAILURE_PLANE";
  geotechnicalRiskHash: string;
}

export class RetainingWallInclinometerShearProfiler {
  public static analyzeSurvey(request: InclinometerSurveyRequest): InclinometerProfileResult {
    if (!request.currentReadings || request.currentReadings.length < 3) {
      throw new Error("Inclinometer survey requires at least 3 depth interval readings.");
    }
    if (request.daysBetweenSurveys <= 0) {
      throw new Error("Days between surveys must be positive.");
    }

    // Sort depths descending (bottom-up integration from fixed toe)
    const sortedCurrent = [...request.currentReadings].sort((a, b) => b.depthMeters - a.depthMeters);
    const sortedBaseline = [...request.baselineReadings].sort((a, b) => b.depthMeters - a.depthMeters);

    let cumulativeCurrent = 0;
    let cumulativeBaseline = 0;
    let maxDisplacementMm = 0;
    let maxStrainGradient = 0;
    let criticalShearDepth = sortedCurrent[0].depthMeters;

    for (let i = 0; i < sortedCurrent.length; i++) {
      cumulativeCurrent += sortedCurrent[i].lateralDeviationMm;
      const baseDev = sortedBaseline[i] ? sortedBaseline[i].lateralDeviationMm : 0;
      cumulativeBaseline += baseDev;

      const netDisplacement = Math.abs(cumulativeCurrent - cumulativeBaseline);
      if (netDisplacement > maxDisplacementMm) {
        maxDisplacementMm = netDisplacement;
      }

      // Check localized differential gradient (strain concentration)
      if (i > 0) {
        const deltaZ = Math.abs(sortedCurrent[i].depthMeters - sortedCurrent[i - 1].depthMeters) || 0.5;
        const deltaDev = Math.abs(sortedCurrent[i].lateralDeviationMm - sortedCurrent[i - 1].lateralDeviationMm);
        const gradient = deltaDev / deltaZ;
        if (gradient > maxStrainGradient) {
          maxStrainGradient = gradient;
          criticalShearDepth = sortedCurrent[i].depthMeters;
        }
      }
    }

    // Velocity in mm per 30-day month
    const velocityPerDay = maxDisplacementMm / request.daysBetweenSurveys;
    const monthlyRate = Number((velocityPerDay * 30.0).toFixed(2));

    let verdict: InclinometerProfileResult["stabilityVerdict"] = "STABLE_ELASTIC";
    if (monthlyRate > 5.0 || maxStrainGradient > 8.0) {
      verdict = "ACTIVE_SHEAR_FAILURE_PLANE";
    } else if (monthlyRate > 1.5 || maxDisplacementMm > 15.0) {
      verdict = "CREEP_MONITORING_ALERT";
    }

    const raw = `${request.inclinometerId}:${maxDisplacementMm.toFixed(2)}:${criticalShearDepth}:${monthlyRate}:${verdict}`;
    const geotechnicalRiskHash = createHash("sha256").update(raw).digest("hex");

    return {
      inclinometerId: request.inclinometerId,
      totalDepthMeters: sortedCurrent[0].depthMeters,
      maxCumulativeDisplacementMm: Number(maxDisplacementMm.toFixed(2)),
      criticalShearPlaneDepthMeters: criticalShearDepth,
      maxDisplacementRateMmPerMonth: monthlyRate,
      stabilityVerdict: verdict,
      geotechnicalRiskHash
    };
  }
}
