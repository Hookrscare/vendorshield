/**
 * SNAP-55: Retaining Wall Deep Inclinometer Shear Plane Displacement Velocity Profiler
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Implements ASTM D6230 / Eurocode 7 deep geotechnical inclinometer time-series analysis.
 * Analyzes multi-epoch borehole inclinometer profiles to:
 * 1. Compute multi-depth displacement velocities (mm/day) and acceleration gradients.
 * 2. Detect localized shear plane rupture zones where shear strain rate (dv/dz) concentrates.
 * 3. Model progressive creep using the inverse velocity method (Saito formulation) for time-to-failure estimation.
 * 4. Trigger geotechnical hazard alerts (STABLE, VELOCITY_ANOMALY, ACCELERATING_CREEP, IMMINENT_SLIP_FAILURE).
 * 5. Emit cryptographic audit digests for civil engineering and forensic inspection reporting.
 */

import { createHash } from "crypto";

export interface InclinometerEpochSurvey {
  epochId: string;
  surveyTimestampIso: string;
  readings: {
    depthMeters: number;
    cumulativeDisplacementMm: number;
  }[];
}

export interface BoreholeShearPlaneSpec {
  boreholeId: string;
  wallId: string;
  wallHeightMeters: number;
  criticalVelocityMmPerDay: number; // e.g. 1.0 - 2.5 mm/day
  criticalShearGradientMmPerM: number; // e.g. 0.8 mm/m/day
}

export type GeotechnicalHazardLevel =
  | "STABLE_SUB_THRESHOLD"
  | "CREEP_VELOCITY_ELEVATED"
  | "LOCALIZED_SHEAR_RUPTURE_WARNING"
  | "IMMINENT_SLOPE_COLLAPSE_CRITICAL";

export interface ShearPlaneZone {
  depthStartM: number;
  depthEndM: number;
  peakDisplacementVelocityMmPerDay: number;
  peakShearStrainGradient: number; // (dv/dz)
  shearPlaneSeverity: "MODERATE" | "SEVERE" | "CRITICAL_RUPTURE";
}

export interface InclinometerVelocityProfileReport {
  boreholeId: string;
  wallId: string;
  timeDeltaDays: number;
  maxDisplacementVelocityMmPerDay: number;
  criticalDepthM: number;
  shearPlanesDetected: ShearPlaneZone[];
  accelerationMmPerDaySq: number;
  projectedTimeToRuptureDays: number | null; // null if stable or decelerating
  hazardLevel: GeotechnicalHazardLevel;
  engineeringRecommendations: string[];
  auditDigest: string;
  generatedAt: string;
}

export class InclinometerShearPlaneVelocityProfiler {
  /**
   * Evaluates displacement velocity, shear strain concentration, and creep acceleration across two or more survey epochs.
   */
  public static analyzeVelocityProfile(
    spec: BoreholeShearPlaneSpec,
    epochBaseline: InclinometerEpochSurvey,
    epochCurrent: InclinometerEpochSurvey,
    epochPrior?: InclinometerEpochSurvey
  ): InclinometerVelocityProfileReport {
    const tBase = new Date(epochBaseline.surveyTimestampIso).getTime();
    const tCurr = new Date(epochCurrent.surveyTimestampIso).getTime();

    if (tCurr <= tBase) {
      throw new Error("Current epoch survey timestamp must be strictly after baseline epoch.");
    }

    const timeDeltaDays = (tCurr - tBase) / (1000 * 60 * 60 * 24);
    if (timeDeltaDays <= 0) {
      throw new Error("Invalid survey time delta between epochs.");
    }

    // Map depths and calculate displacement deltas
    const baseMap = new Map<number, number>();
    for (const r of epochBaseline.readings) {
      baseMap.set(r.depthMeters, r.cumulativeDisplacementMm);
    }

    const depthVelocities: { depthM: number; velocityMmDay: number }[] = [];

    for (const r of epochCurrent.readings) {
      const baseDisp = baseMap.get(r.depthMeters) ?? 0.0;
      const deltaDisp = r.cumulativeDisplacementMm - baseDisp;
      const velocity = deltaDisp / timeDeltaDays;
      depthVelocities.push({
        depthM: r.depthMeters,
        velocityMmDay: velocity
      });
    }

    // Sort by depth ascending
    depthVelocities.sort((a, b) => a.depthM - b.depthM);

    // Find peak velocity
    let maxVelocity = 0.0;
    let criticalDepth = depthVelocities[0]?.depthM ?? 0;
    for (const dv of depthVelocities) {
      if (Math.abs(dv.velocityMmDay) > Math.abs(maxVelocity)) {
        maxVelocity = dv.velocityMmDay;
        criticalDepth = dv.depthM;
      }
    }

    // Calculate shear plane zones based on localized gradient (dv/dz)
    const shearPlanes: ShearPlaneZone[] = [];
    for (let i = 0; i < depthVelocities.length - 1; i++) {
      const d1 = depthVelocities[i];
      const d2 = depthVelocities[i + 1];
      const dz = Math.abs(d2.depthM - d1.depthM);
      if (dz === 0) continue;

      const dv = Math.abs(d2.velocityMmDay - d1.velocityMmDay);
      const gradient = dv / dz;

      if (gradient >= spec.criticalShearGradientMmPerM) {
        let severity: "MODERATE" | "SEVERE" | "CRITICAL_RUPTURE" = "MODERATE";
        if (gradient > spec.criticalShearGradientMmPerM * 2.5) {
          severity = "CRITICAL_RUPTURE";
        } else if (gradient > spec.criticalShearGradientMmPerM * 1.5) {
          severity = "SEVERE";
        }

        shearPlanes.push({
          depthStartM: d1.depthM,
          depthEndM: d2.depthM,
          peakDisplacementVelocityMmPerDay: Math.max(Math.abs(d1.velocityMmDay), Math.abs(d2.velocityMmDay)),
          peakShearStrainGradient: Math.round(gradient * 1000) / 1000,
          shearPlaneSeverity: severity
        });
      }
    }

    // Acceleration analysis if prior epoch is provided
    let acceleration = 0.0;
    let projectedTimeToRupture: number | null = null;

    if (epochPrior) {
      const tPrior = new Date(epochPrior.surveyTimestampIso).getTime();
      const deltaPriorDays = (tBase - tPrior) / (1000 * 60 * 60 * 24);
      if (deltaPriorDays > 0) {
        // Calculate prior velocity at critical depth
        const priorMatch = epochPrior.readings.find(r => r.depthMeters === criticalDepth);
        const baseMatch = epochBaseline.readings.find(r => r.depthMeters === criticalDepth);
        if (priorMatch && baseMatch) {
          const priorVelocity = (baseMatch.cumulativeDisplacementMm - priorMatch.cumulativeDisplacementMm) / deltaPriorDays;
          acceleration = (maxVelocity - priorVelocity) / timeDeltaDays;

          // Saito inverse velocity failure projection if accelerating
          if (acceleration > 0 && maxVelocity > spec.criticalVelocityMmPerDay * 0.5) {
            // Linear inverse-velocity extrapolation to 1/v = 0: time = v / a
            projectedTimeToRupture = Math.max(1.0, Math.round((maxVelocity / acceleration) * 10) / 10);
          }
        }
      }
    }

    // Determine hazard tier
    let hazardLevel: GeotechnicalHazardLevel = "STABLE_SUB_THRESHOLD";
    const recommendations: string[] = [];

    const absMaxVel = Math.abs(maxVelocity);
    const hasCriticalRupture = shearPlanes.some(sp => sp.shearPlaneSeverity === "CRITICAL_RUPTURE");

    if (absMaxVel >= spec.criticalVelocityMmPerDay * 2.0 || (hasCriticalRupture && acceleration > 0.1)) {
      hazardLevel = "IMMINENT_SLOPE_COLLAPSE_CRITICAL";
      recommendations.push("URGENT: Evacuate perimeter zone below retaining wall structure.");
      recommendations.push("Deploy emergency ground tiebacks or rock anchor underpinning within 24h.");
      recommendations.push("Automate continuous 15-minute telemetry polling on all borehole sensors.");
    } else if (hasCriticalRupture || absMaxVel >= spec.criticalVelocityMmPerDay) {
      hazardLevel = "LOCALIZED_SHEAR_RUPTURE_WARNING";
      recommendations.push("Active shear plane rupture detected in borehole stratigraphy.");
      recommendations.push("Install supplementary vibrating wire piezometers to monitor pore water pressures.");
      recommendations.push("Restrict heavy vehicular surcharge load along the wall crest.");
    } else if (absMaxVel >= spec.criticalVelocityMmPerDay * 0.5 || shearPlanes.length > 0) {
      hazardLevel = "CREEP_VELOCITY_ELEVATED";
      recommendations.push("Soil creep movement velocity elevated above baseline thresholds.");
      recommendations.push("Increase inclinometer survey frequency to weekly intervals.");
    } else {
      hazardLevel = "STABLE_SUB_THRESHOLD";
      recommendations.push("Borehole inclinometer displacement rates remain within safe design tolerances.");
      recommendations.push("Maintain standard quarterly geotechnical surveillance.");
    }

    const auditDigest = createHash("sha256")
      .update(`${spec.boreholeId}:${spec.wallId}:${maxVelocity}:${hazardLevel}:${timeDeltaDays}`)
      .digest("hex");

    return {
      boreholeId: spec.boreholeId,
      wallId: spec.wallId,
      timeDeltaDays: Math.round(timeDeltaDays * 100) / 100,
      maxDisplacementVelocityMmPerDay: Math.round(maxVelocity * 1000) / 1000,
      criticalDepthM: criticalDepth,
      shearPlanesDetected: shearPlanes,
      accelerationMmPerDaySq: Math.round(acceleration * 1000) / 1000,
      projectedTimeToRuptureDays: projectedTimeToRupture,
      hazardLevel,
      engineeringRecommendations: recommendations,
      auditDigest,
      generatedAt: new Date().toISOString()
    };
  }
}
