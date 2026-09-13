/**
 * SNAP-86: Underground Tunnel Excavation TBM Cutterhead Vibration & Geotechnical Face Void Radar Classifier.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Platform.
 * 
 * Fuses triaxial cutterhead vibration telemetry with look-ahead GPR dielectric permittivity
 * to detect geological face voids, boulder impacts, and water ingress hazards in mechanized tunneling.
 */

import { createHash } from "crypto";

export interface TbmExcavationTelemetry {
  tunnelChainageMeters: number;
  cutterheadRpm: number;
  thrustForceKiloNewtons: number;
  triaxialVibrationRmsG: number;
  vibrationCrestFactor: number;
  lookAheadGprDielectricConstant: number; // e.g. 81 for water, 1 for air/void, 4-8 for dry rock
  faceRadarReflectionAttenuationDb: number;
}

export interface TbmGeotechnicalAssessment {
  tunnelChainageMeters: number;
  geotechnicalFaceCondition: 
    | "HOMOGENEOUS_MASS" 
    | "UNCONSOLIDATED_GEOTECHNICAL_VOID" 
    | "HIGH_PRESSURE_AQUIFER_INFLOW" 
    | "BOULDER_IMPACT_RISK";
  cutterDiscWearRisk: "LOW" | "MODERATE" | "SEVERE";
  recommendedThrustReductionPercent: number;
  recommendedPenetrationSpeedLimitMmMin: number;
  operatorActionCode: "PROCEED_STANDARD" | "REDUCE_ADVANCE_RATE" | "EMERGENCY_GROUTING_INTERVENTION";
  verificationDigest: string;
}

export class TbmCutterheadVoidRadarClassifier {
  public static classifyFace(telemetry: TbmExcavationTelemetry): TbmGeotechnicalAssessment {
    if (telemetry.tunnelChainageMeters < 0 || telemetry.cutterheadRpm <= 0) {
      throw new Error("Invalid TBM parameters: chainage and RPM must be valid positive values.");
    }

    let condition: TbmGeotechnicalAssessment["geotechnicalFaceCondition"] = "HOMOGENEOUS_MASS";
    let wearRisk: TbmGeotechnicalAssessment["cutterDiscWearRisk"] = "LOW";
    let thrustReduction = 0;
    let speedLimit = 35.0; // mm/min nominal
    let action: TbmGeotechnicalAssessment["operatorActionCode"] = "PROCEED_STANDARD";

    // 1. Check for Water / High-Pressure Aquifer (Dielectric > 60)
    if (telemetry.lookAheadGprDielectricConstant > 60.0 && telemetry.faceRadarReflectionAttenuationDb > 25.0) {
      condition = "HIGH_PRESSURE_AQUIFER_INFLOW";
      thrustReduction = 50;
      speedLimit = 5.0;
      action = "EMERGENCY_GROUTING_INTERVENTION";
    }
    // 2. Check for Air / Geological Void (Dielectric < 2.0 with high vibration crest factor)
    else if (telemetry.lookAheadGprDielectricConstant < 2.2) {
      condition = "UNCONSOLIDATED_GEOTECHNICAL_VOID";
      thrustReduction = 60;
      speedLimit = 8.0;
      action = "EMERGENCY_GROUTING_INTERVENTION";
    }
    // 3. Check for Boulder Impact / Erratic hard inclusions (High vibration RMS & crest factor)
    else if (telemetry.triaxialVibrationRmsG > 4.5 || telemetry.vibrationCrestFactor > 6.0) {
      condition = "BOULDER_IMPACT_RISK";
      wearRisk = "SEVERE";
      thrustReduction = 35;
      speedLimit = 12.0;
      action = "REDUCE_ADVANCE_RATE";
    } else if (telemetry.triaxialVibrationRmsG > 2.5) {
      wearRisk = "MODERATE";
      thrustReduction = 15;
      speedLimit = 22.0;
      action = "REDUCE_ADVANCE_RATE";
    }

    const payload = `${telemetry.tunnelChainageMeters}:${condition}:${wearRisk}:${thrustReduction}:${action}`;
    const digest = createHash("sha256").update(payload).digest("hex");

    return {
      tunnelChainageMeters: telemetry.tunnelChainageMeters,
      geotechnicalFaceCondition: condition,
      cutterDiscWearRisk: wearRisk,
      recommendedThrustReductionPercent: thrustReduction,
      recommendedPenetrationSpeedLimitMmMin: speedLimit,
      operatorActionCode: action,
      verificationDigest: digest
    };
  }
}
