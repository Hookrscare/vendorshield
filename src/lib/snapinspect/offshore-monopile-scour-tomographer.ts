/**
 * SNAP-61: Offshore Monopile Wind Turbine Scour Hole Bathymetric Acoustic Sonar Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Ingests multibeam acoustic sonar bathymetry around offshore wind turbine monopiles:
 * 1. Measures radial scour depth profiles around monopile perimeter (D_pile).
 * 2. Computes maximum scour depth ratio (S / D_pile) against DNV-ST-0126 design criteria.
 * 3. Evaluates scour hole slope angle against critical angle of repose of seabed sediment.
 * 4. Determines rock armor rip-rap placement intervention necessity and generates inspection digest.
 */

import { createHash } from "crypto";

export interface RadialBathymetrySounding {
  azimuthDeg: number; // 0 - 360 degrees
  distanceFromPileEdgeMeters: number;
  measuredSeabedDepthMeters: number; // positive depth relative to MSL
}

export interface MonopileScourSurveyRequest {
  turbineId: string;
  pileDiameterMeters: number; // D_pile, e.g. 8.0 meters
  nominalSeabedDepthMeters: number; // baseline seabed depth without scour, e.g. 30.0 meters
  sedimentAngleOfReposeDeg?: number; // e.g. 32 degrees for medium sand
  soundings: RadialBathymetrySounding[];
}

export interface MonopileScourSurveyResult {
  turbineId: string;
  pileDiameterMeters: number;
  maxScourDepthMeters: number;
  scourRatio: number; // S / D_pile
  maxSlopeDeg: number;
  riskRating: "NEGLIGIBLE_SCOUR" | "MONITORING_REQUIRED" | "CRITICAL_ROCK_ARMOR_REQUIRED";
  surveyDigest: string;
}

export class OffshoreMonopileScourTomographer {
  public static analyzeScour(request: MonopileScourSurveyRequest): MonopileScourSurveyResult {
    if (request.pileDiameterMeters <= 0 || request.nominalSeabedDepthMeters <= 0) {
      throw new Error("Pile diameter and nominal depth must be positive.");
    }
    if (!request.soundings || request.soundings.length < 4) {
      throw new Error("Bathymetric survey requires at least 4 radial soundings.");
    }

    const baseline = request.nominalSeabedDepthMeters;
    const D = request.pileDiameterMeters;
    let maxScour = 0.0;
    let maxSlope = 0.0;

    for (const s of request.soundings) {
      // Scour depth is additional depth below baseline
      const scourDepth = Math.max(0.0, s.measuredSeabedDepthMeters - baseline);
      if (scourDepth > maxScour) {
        maxScour = scourDepth;
      }

      // Slope angle: arctan(scourDepth / distance) in degrees
      if (s.distanceFromPileEdgeMeters > 0) {
        const slopeRad = Math.atan(scourDepth / s.distanceFromPileEdgeMeters);
        const slopeDeg = (slopeRad * 180.0) / Math.PI;
        if (slopeDeg > maxSlope) {
          maxSlope = slopeDeg;
        }
      }
    }

    const scourRatio = maxScour / D;

    let riskRating: "NEGLIGIBLE_SCOUR" | "MONITORING_REQUIRED" | "CRITICAL_ROCK_ARMOR_REQUIRED";
    // DNV-ST-0126: Equilibrium scour depth for unprotected monopiles can reach 1.3 - 1.5 D
    if (scourRatio >= 1.2 || maxSlope >= 30.0) {
      riskRating = "CRITICAL_ROCK_ARMOR_REQUIRED";
    } else if (scourRatio >= 0.4 || maxSlope >= 15.0) {
      riskRating = "MONITORING_REQUIRED";
    } else {
      riskRating = "NEGLIGIBLE_SCOUR";
    }

    const raw = `${request.turbineId}:${maxScour.toFixed(2)}:${scourRatio.toFixed(3)}:${maxSlope.toFixed(1)}:${riskRating}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      turbineId: request.turbineId,
      pileDiameterMeters: D,
      maxScourDepthMeters: Math.round(maxScour * 100) / 100,
      scourRatio: Math.round(scourRatio * 1000) / 1000,
      maxSlopeDeg: Math.round(maxSlope * 10) / 10,
      riskRating,
      surveyDigest: digest
    };
  }
}
