/**
 * SNAP-60: Deep Foundation Diaphragm Wall Slurry Trench Ultrasonic Hydrophone Verticality Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Analyzes ultrasonic echo caliper soundings in bentonite slurry trenches:
 * 1. Computes 4-axis orthogonal trench boundaries (X+, X-, Y+, Y-) through dense bentonite slurry.
 * 2. Calculates trench centerline trajectory and verticality plumb deviation: (delta_r / depth) * 100%.
 * 3. Enforces EN 1538 / ASTM D6230 verticality tolerance thresholds (<= 0.50%).
 * 4. Issues geotechnical slurry trench stability verdicts and cryptographic inspection seal.
 */

import { createHash } from "crypto";

export interface DepthSoundingData {
  depthMeters: number;
  echoTimeMicrosecXPos: number;
  echoTimeMicrosecXNeg: number;
  echoTimeMicrosecYPos: number;
  echoTimeMicrosecYNeg: number;
}

export interface DiaphragmWallSurveyRequest {
  panelId: string;
  nominalThicknessMeters: number; // e.g. 1.0 meter
  slurryAcousticVelocityMetersPerSec?: number; // default ~1450 m/s in bentonite
  verticalityTolerancePercent?: number; // default 0.50%
  soundings: DepthSoundingData[];
}

export interface DiaphragmWallSurveyResult {
  panelId: string;
  totalDepthMeters: number;
  maxCenterlineOffsetMeters: number;
  maxVerticalityDeviationPercent: number;
  isWithinTolerance: boolean;
  verdict: "COMPLIANT_PLUMB_EXCAVATION" | "VERTICALITY_EXCEEDED_REPAIR_REQUIRED";
  surveyDigest: string;
}

export class DiaphragmWallUltrasonicProfiler {
  public static analyzeTrench(request: DiaphragmWallSurveyRequest): DiaphragmWallSurveyResult {
    if (!request.soundings || request.soundings.length < 3) {
      throw new Error("Survey requires at least 3 depth sounding levels.");
    }

    const c = request.slurryAcousticVelocityMetersPerSec || 1450.0;
    const tolerance = request.verticalityTolerancePercent || 0.50;

    let maxOffset = 0.0;
    let maxVerticalityPercent = 0.0;
    let deepestDepth = 0.0;

    for (const s of request.soundings) {
      if (s.depthMeters > deepestDepth) {
        deepestDepth = s.depthMeters;
      }

      // Convert echo microsecond travel time (roundtrip) to radius: r = (t * 1e-6 * c) / 2
      const rXPos = (s.echoTimeMicrosecXPos * 1e-6 * c) / 2.0;
      const rXNeg = (s.echoTimeMicrosecXNeg * 1e-6 * c) / 2.0;
      const rYPos = (s.echoTimeMicrosecYPos * 1e-6 * c) / 2.0;
      const rYNeg = (s.echoTimeMicrosecYNeg * 1e-6 * c) / 2.0;

      // Centerline offset from tool origin
      const deltaX = (rXPos - rXNeg) / 2.0;
      const deltaY = (rYPos - rYNeg) / 2.0;
      const netOffset = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (netOffset > maxOffset) {
        maxOffset = netOffset;
      }

      if (s.depthMeters > 0) {
        const vertPercent = (netOffset / s.depthMeters) * 100.0;
        if (vertPercent > maxVerticalityPercent) {
          maxVerticalityPercent = vertPercent;
        }
      }
    }

    const isWithinTolerance = maxVerticalityPercent <= tolerance;
    const verdict = isWithinTolerance
      ? "COMPLIANT_PLUMB_EXCAVATION"
      : "VERTICALITY_EXCEEDED_REPAIR_REQUIRED";

    const raw = `${request.panelId}:${deepestDepth.toFixed(2)}:${maxOffset.toFixed(3)}:${maxVerticalityPercent.toFixed(3)}:${verdict}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      panelId: request.panelId,
      totalDepthMeters: deepestDepth,
      maxCenterlineOffsetMeters: Math.round(maxOffset * 1000) / 1000,
      maxVerticalityDeviationPercent: Math.round(maxVerticalityPercent * 1000) / 1000,
      isWithinTolerance,
      verdict,
      surveyDigest: digest
    };
  }
}
