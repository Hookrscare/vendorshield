/**
 * SNAP-80: Sub-Surface Ground Penetrating Radar Ballast Void & Settlement Detector.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 *
 * Inverts multi-frequency GPR A-scans/B-scans over railway ballast beds to detect:
 * 1. Sub-surface ballast pockets and air voids (dielectric contrast).
 * 2. Fine particle clay fouling and subgrade moisture accumulation.
 * 3. Track geometry differential settlement risks.
 */

import { createHash } from "crypto";

export interface GprScanTrace {
  chainageMeters: number;
  twoWayTravelTimeNs: number; // e.g. 5.0 to 30.0 ns
  peakReflectedAmplitudeMv: number;
  phaseInversion: boolean; // True if dielectric goes from high to low (e.g., ballast -> air void)
  ballastRelativePermittivity: number; // Typical clean ballast: 3.0 to 4.5
}

export interface BallastAnomaly {
  chainageMeters: number;
  anomalyType: "SUB_SURFACE_VOID" | "BALLAST_FOULING_WET_SLURRY" | "HEALTHY_COMPACTED_BED";
  estimatedDepthMm: number;
  severity: "NORMAL" | "MODERATE" | "CRITICAL";
  recommendedAction: "NONE" | "SPOT_BALLAST_TAMPING" | "FULL_BALLAST_UNDERCUTTING_AND_RENEWAL";
}

export interface GprBallastInspectionReport {
  totalScansEvaluated: number;
  voidCount: number;
  fouledBedCount: number;
  trackQualityScore: number; // 0 to 100 scale
  anomalies: BallastAnomaly[];
  inspectionHash: string;
  timestamp: string;
}

export class GprBallastVoidSettlementDetector {
  private static readonly SPEED_OF_LIGHT_MM_PER_NS = 299.792; // c in mm/ns

  public static analyzeTrackBed(traces: GprScanTrace[]): GprBallastInspectionReport {
    if (!traces || traces.length === 0) {
      throw new Error("Must provide at least one GPR scan trace for ballast analysis.");
    }

    const anomalies: BallastAnomaly[] = [];
    let voidCount = 0;
    let fouledBedCount = 0;

    for (const trace of traces) {
      if (trace.twoWayTravelTimeNs <= 0) {
        throw new Error("twoWayTravelTimeNs must be positive.");
      }

      // Compute electromagnetic propagation velocity in ballast: v = c / sqrt(eps_r)
      const eps = Math.max(1.0, trace.ballastRelativePermittivity);
      const velocityMmPerNs = this.SPEED_OF_LIGHT_MM_PER_NS / Math.sqrt(eps);

      // Depth d = (v * t) / 2
      const estimatedDepthMm = Math.round((velocityMmPerNs * trace.twoWayTravelTimeNs) / 2);

      let anomalyType: BallastAnomaly["anomalyType"] = "HEALTHY_COMPACTED_BED";
      let severity: BallastAnomaly["severity"] = "NORMAL";
      let recommendedAction: BallastAnomaly["recommendedAction"] = "NONE";

      // Air void in ballast: phase inversion occurs at boundary, high reflection amplitude
      if (trace.phaseInversion && trace.peakReflectedAmplitudeMv > 350) {
        anomalyType = "SUB_SURFACE_VOID";
        voidCount += 1;
        if (trace.peakReflectedAmplitudeMv > 600 || estimatedDepthMm < 400) {
          severity = "CRITICAL";
          recommendedAction = "FULL_BALLAST_UNDERCUTTING_AND_RENEWAL";
        } else {
          severity = "MODERATE";
          recommendedAction = "SPOT_BALLAST_TAMPING";
        }
      }
      // High permittivity (>9.0) indicates water fouling / clay slurry intrusion
      else if (trace.ballastRelativePermittivity >= 9.0) {
        anomalyType = "BALLAST_FOULING_WET_SLURRY";
        fouledBedCount += 1;
        severity = trace.ballastRelativePermittivity > 15.0 ? "CRITICAL" : "MODERATE";
        recommendedAction = "FULL_BALLAST_UNDERCUTTING_AND_RENEWAL";
      }

      if (severity !== "NORMAL") {
        anomalies.push({
          chainageMeters: trace.chainageMeters,
          anomalyType,
          estimatedDepthMm,
          severity,
          recommendedAction
        });
      }
    }

    // Track Quality Score (100 - penalties)
    const penalty = (voidCount * 15) + (fouledBedCount * 10);
    const trackQualityScore = Math.max(0, Math.min(100, 100 - penalty));

    const rawDigest = `${traces.length}:${voidCount}:${fouledBedCount}:${trackQualityScore}`;
    const inspectionHash = createHash("sha256").update(rawDigest).digest("hex");

    return {
      totalScansEvaluated: traces.length,
      voidCount,
      fouledBedCount,
      trackQualityScore,
      anomalies,
      inspectionHash,
      timestamp: new Date().toISOString()
    };
  }
}
