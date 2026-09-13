/**
 * src/lib/snapinspect/tbm-cutterhead-vibration-geotechnical-radar.ts
 * Part of SnapInspect AI Tactical NDT & Heavy Civil Underground Suite.
 *
 * SNAP-86: Underground Tunnel Excavation TBM Cutterhead Vibration & Geotechnical Face Void Radar Classifier.
 * Real-time geotechnical hazard prediction for mechanized tunneling (EPB / Slurry TBMs):
 * - Analyzes cutterhead triaxial vibration telemetry (RMS velocity, crest factor, torque variance).
 * - Interprets look-ahead ground-penetrating radar (GPR) dielectric reflections up to 30m ahead of face.
 * - Detects water-bearing karst voids, air cavities, fault zones, and mixed-face boulder impacts.
 * - Enforces ITA / DAUB tunneling safety protocols and provides automated TBM advance rate throttling.
 */

import { createHash } from "crypto";

export interface CutterheadVibrationTelemetry {
  tbmId: string;
  chainageMeters: number;
  rotationRpm: number;
  rmsVibrationVelocityMmPerSec: number; // ISO 10816 threshold (> 18 mm/s is severe)
  crestFactor: number;                  // Peak / RMS (> 4.5 indicates cutter impact / broken disc)
  torqueVariancePercentage: number;
}

export interface LookAheadRadarReflection {
  distanceAheadMeters: number;         // 1.0 to 30.0 meters ahead
  reflectionAmplitudeDb: number;        // e.g. -10 dB to -60 dB
  estimatedDielectricPermittivity: number; // Air ~ 1.0, dry rock ~ 4-8, water/karst ~ 70-81
}

export interface GeotechnicalHazardAssessment {
  tbmId: string;
  chainageMeters: number;
  cutterheadVibrationSeverity: "NORMAL_SMOOTH" | "ELEVATED_CHATTER" | "SEVERE_DISC_IMPACT_OR_JAMMED";
  detectedFaceHazard:
    | "HOMOGENEOUS_STABLE_GROUND_SAFE_EXCAVATION"
    | "AHEAD_WATER_INFLOW_KARST_CAVITY_RISK"
    | "AHEAD_AIR_VOID_SINKHOLE_COLLAPSE_RISK"
    | "MIXED_FACE_BOULDER_DISC_DAMAGE_RISK";
  hazardDistanceAheadMeters: number | null;
  recommendedMaxAdvanceSpeedMmPerMin: number;
  emergencyFaceGroutingRequired: boolean;
  anomalyFlags: string[];
  tamperEvidentDigest: string;
}

export class TbmCutterheadVibrationFaceVoidClassifier {
  private static readonly NOMINAL_ADVANCE_RATE_MM_MIN = 35.0;

  /**
   * Evaluates synchronized cutterhead vibration telemetry and look-ahead radar signals.
   */
  public static evaluateTunnelFaceConditions(
    vibe: CutterheadVibrationTelemetry,
    radarReflections: LookAheadRadarReflection[]
  ): GeotechnicalHazardAssessment {
    if (!vibe.tbmId || vibe.chainageMeters < 0 || vibe.rotationRpm <= 0) {
      throw new Error("Invalid TBM telemetry: valid tbmId, non-negative chainage, and positive RPM required.");
    }

    const anomalyFlags: string[] = [];

    // 1. Cutterhead vibration severity
    let vibrationSeverity: GeotechnicalHazardAssessment["cutterheadVibrationSeverity"] = "NORMAL_SMOOTH";
    if (vibe.rmsVibrationVelocityMmPerSec >= 18.0 || vibe.crestFactor >= 4.8) {
      vibrationSeverity = "SEVERE_DISC_IMPACT_OR_JAMMED";
      anomalyFlags.push(`SEVERE_CUTTERHEAD_VIBRATION_${vibe.rmsVibrationVelocityMmPerSec.toFixed(1)}MM_S`);
    } else if (vibe.rmsVibrationVelocityMmPerSec >= 10.0 || vibe.crestFactor >= 3.5) {
      vibrationSeverity = "ELEVATED_CHATTER";
      anomalyFlags.push("ELEVATED_DISC_CUTTER_CHATTER");
    }

    // 2. Look-ahead radar hazard detection
    let detectedHazard: GeotechnicalHazardAssessment["detectedFaceHazard"] =
      "HOMOGENEOUS_STABLE_GROUND_SAFE_EXCAVATION";
    let hazardDistance: number | null = null;
    let emergencyGrouting = false;
    let recommendedSpeed = this.NOMINAL_ADVANCE_RATE_MM_MIN;

    // Sort reflections by proximity to face
    const sortedReflections = [...radarReflections].sort(
      (a, b) => a.distanceAheadMeters - b.distanceAheadMeters
    );

    for (const ref of sortedReflections) {
      if (ref.reflectionAmplitudeDb > -30.0) {
        // High reflection amplitude indicates significant dielectric boundary
        if (ref.estimatedDielectricPermittivity >= 60.0) {
          detectedHazard = "AHEAD_WATER_INFLOW_KARST_CAVITY_RISK";
          hazardDistance = ref.distanceAheadMeters;
          emergencyGrouting = true;
          recommendedSpeed = 5.0; // Throttle to creeping speed for probe drilling
          anomalyFlags.push(
            `AHEAD_HIGH_DIELECTRIC_WATER_CAVITY_AT_${ref.distanceAheadMeters.toFixed(1)}M`
          );
          break;
        } else if (ref.estimatedDielectricPermittivity <= 2.0) {
          detectedHazard = "AHEAD_AIR_VOID_SINKHOLE_COLLAPSE_RISK";
          hazardDistance = ref.distanceAheadMeters;
          emergencyGrouting = true;
          recommendedSpeed = 8.0;
          anomalyFlags.push(
            `AHEAD_LOW_DIELECTRIC_AIR_VOID_AT_${ref.distanceAheadMeters.toFixed(1)}M`
          );
          break;
        }
      }
    }

    // If no ahead void but severe cutterhead chatter, mixed-face boulder condition
    if (
      detectedHazard === "HOMOGENEOUS_STABLE_GROUND_SAFE_EXCAVATION" &&
      vibrationSeverity === "SEVERE_DISC_IMPACT_OR_JAMMED"
    ) {
      detectedHazard = "MIXED_FACE_BOULDER_DISC_DAMAGE_RISK";
      recommendedSpeed = 12.0;
      anomalyFlags.push("MIXED_FACE_UNEXPECTED_BOULDERS_DETECTED");
    } else if (vibrationSeverity === "ELEVATED_CHATTER" && recommendedSpeed > 20.0) {
      recommendedSpeed = 20.0;
    }

    const payload = {
      tbmId: vibe.tbmId,
      chainageMeters: Math.round(vibe.chainageMeters * 10) / 10,
      vibrationSeverity,
      detectedHazard,
      hazardDistance,
      recommendedSpeed,
      emergencyGrouting,
      anomalyFlags
    };

    const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    return {
      tbmId: vibe.tbmId,
      chainageMeters: vibe.chainageMeters,
      cutterheadVibrationSeverity: vibrationSeverity,
      detectedFaceHazard: detectedHazard,
      hazardDistanceAheadMeters: hazardDistance,
      recommendedMaxAdvanceSpeedMmPerMin: recommendedSpeed,
      emergencyFaceGroutingRequired: emergencyGrouting,
      anomalyFlags,
      tamperEvidentDigest: digest
    };
  }
}
