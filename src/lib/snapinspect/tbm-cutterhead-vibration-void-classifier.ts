/**
 * SNAP-86: Underground Tunnel Excavation TBM Cutterhead Vibration & Geotechnical Face Void Radar Classifier.
 * Part of SnapInspect AI Heavy Infrastructure & NDT Platform.
 *
 * Implements real-time Tunnel Boring Machine (TBM) excavation analytics:
 * - Cutterhead multi-axis vibration spectrum & disc cutter wear monitoring
 * - Look-ahead geotechnical radar / seismic profiling ahead of the tunnel face
 * - Detects geological anomalies: karst cavities, water-bearing fault zones, boulder collisions
 * - Evaluates rock penetration index and catastrophic face instability risks
 * - Emits cryptographic SHA-256 geotechnical excavation attestations.
 */

import { createHash } from "crypto";

export interface TbmExcavationTelemetry {
  tbmId: string;
  chainageMeter: number; // e.g. 1420.5 m along tunnel alignment
  cutterheadRpm: number; // e.g. 3.2 RPM
  thrustForceMegaNewtons: number; // e.g. 24.5 MN
  torqueMegaNewtonMeters: number; // e.g. 6.8 MN*m
  vibrationRmsAccelerationG: number; // e.g. 4.2 G
  lookAheadRadarVoidDistanceMeters?: number; // Distance to detected void ahead (if any)
  lookAheadRadarPermittivityContrast?: number; // Dielectric permittivity shift (water cavity indicator)
}

export interface GeotechnicalHazardEvaluation {
  tbmId: string;
  chainageMeter: number;
  cutterDiscWearIndex: number; // 0.0 (pristine) - 1.0 (imminent ring spallation)
  geologicalHazardLevel: "NOMINAL_STRATA" | "BOULDER_IMPACT_WARNING" | "WATER_BEARING_VOID_CRITICAL";
  stopExcavationRecommended: boolean;
  penetrationIndexMPerHrPerMn: number;
  recommendationNote: string;
  attestationToken: string;
}

export class TbmCutterheadVibrationVoidClassifier {
  public static evaluateTunnelFace(telemetry: TbmExcavationTelemetry): GeotechnicalHazardEvaluation {
    if (!telemetry.tbmId) {
      throw new Error("tbmId is required.");
    }
    if (telemetry.cutterheadRpm <= 0 || telemetry.thrustForceMegaNewtons <= 0) {
      raiseInvalidTelemetry("cutterheadRpm and thrustForceMegaNewtons must be strictly positive.");
    }
    if (telemetry.chainageMeter < 0) {
      raiseInvalidTelemetry("chainageMeter cannot be negative.");
    }

    // Disc cutter wear model based on severe vibration acceleration
    // Normal RMS vibration: 0.5 - 2.5 G; > 5.0 G indicates severe impact shock
    const cutterDiscWearIndex = Math.min(
      1.0,
      (telemetry.vibrationRmsAccelerationG / 8.0) * (telemetry.cutterheadRpm / 4.0)
    );

    // Penetration Index: penetration efficiency per unit thrust force
    // (torque / thrust ratio scaled by RPM)
    const penetrationIndex = Number(
      ((telemetry.torqueMegaNewtonMeters / telemetry.thrustForceMegaNewtons) * telemetry.cutterheadRpm).toFixed(3)
    );

    let hazardLevel: "NOMINAL_STRATA" | "BOULDER_IMPACT_WARNING" | "WATER_BEARING_VOID_CRITICAL" = "NOMINAL_STRATA";
    let stopExcavation = false;
    let recommendation = "Strata conditions stable. Continue advance at programmed thrust profile.";

    // Look-ahead radar void detection
    const voidDist = telemetry.lookAheadRadarVoidDistanceMeters;
    const permittivityShift = telemetry.lookAheadRadarPermittivityContrast ?? 1.0;

    if (voidDist !== undefined && voidDist > 0 && voidDist <= 5.0 && permittivityShift > 3.0) {
      hazardLevel = "WATER_BEARING_VOID_CRITICAL";
      stopExcavation = true;
      recommendation = `HALT TBM ADVANCE: Water-bearing cavity or fault zone detected ${voidDist.toFixed(1)}m ahead of cutterhead face. Initiate probe drilling & pre-grouting.`;
    } else if (telemetry.vibrationRmsAccelerationG > 6.0) {
      hazardLevel = "BOULDER_IMPACT_WARNING";
      stopExcavation = false;
      recommendation = "Severe cutterhead shock detected (likely hard boulder or mixed face transition). Reduce RPM by 35% to protect disc cutters.";
    }

    const digestRaw = `${telemetry.tbmId}:${telemetry.chainageMeter}:${telemetry.vibrationRmsAccelerationG}:${hazardLevel}:${stopExcavation}`;
    const token = createHash("sha256").update(digestRaw).digest("hex");

    return {
      tbmId: telemetry.tbmId,
      chainageMeter: telemetry.chainageMeter,
      cutterDiscWearIndex: Number(cutterDiscWearIndex.toFixed(3)),
      geologicalHazardLevel: hazardLevel,
      stopExcavationRecommended: stopExcavation,
      penetrationIndexMPerHrPerMn: penetrationIndex,
      recommendationNote: recommendation,
      attestationToken: token
    };
  }
}

function raiseInvalidTelemetry(msg: string): never {
  throw new Error(msg);
}
