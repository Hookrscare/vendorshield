/**
 * tbm-cutterhead-vibration-geotechnical-radar-classifier.ts
 * SNAP-86: Underground Tunnel Excavation TBM Cutterhead Vibration & Geotechnical Face Void Radar Classifier.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 * 
 * Processes tri-axial TBM cutterhead vibration telemetry and forward-looking Ground Penetrating
 * Radar (GPR) / face radar scans to classify geotechnical voids, karst cavities, and cutter chipping risks.
 */

import { createHash } from 'crypto';

export interface TbmCutterheadTelemetry {
  tbmId: string;
  chainageMeters: number; // Position along tunnel alignment
  cutterheadRpm: number;
  thrustForceKiloNewtons: number;
  vibrationRmsG: number; // Root-mean-square acceleration in g
  peakVibrationG: number;
  dominantFrequencyHz: number;
}

export interface GeotechnicalFaceRadarScan {
  radarLookaheadMeters: number; // Distance ahead of cutter face (e.g. 0 to 15m)
  detectedVoidVolumeM3: number;
  dielectricPermittivity: number; // Water ~ 80, air ~ 1, solid granite ~ 5-7
  estimatedRmr: number; // Rock Mass Rating (0 - 100)
}

export interface TbmExcavationClassification {
  tbmId: string;
  chainageMeters: number;
  excavationSafetyStatus: 'NORMAL_STABLE_EXCAVATION' | 'DISC_CUTTER_CHIPPING_WARNING' | 'KARST_CAVITY_IMMEDIATE_STOP';
  cutterWearRiskScore: number; // 0 to 100
  waterInrushProbability: number; // 0.0 to 1.0
  recommendedThrustAdjustmentPct: number; // e.g. -40% to reduce impact
  inspectionDigest: string;
}

export class TbmCutterheadGeotechnicalClassifier {
  public static classifyFaceExcavation(
    telemetry: TbmCutterheadTelemetry,
    radar: GeotechnicalFaceRadarScan
  ): TbmExcavationClassification {
    if (telemetry.cutterheadRpm < 0 || telemetry.thrustForceKiloNewtons < 0) {
      throw new Error('Invalid TBM mechanical telemetry: negative RPM or thrust.');
    }

    // 1. Water Inrush & Karst Cavity Assessment
    // High dielectric permittivity (> 25) indicates saturated clay or water-filled void
    let waterInrushProbability = 0.0;
    if (radar.dielectricPermittivity > 25.0) {
      waterInrushProbability = Math.min(1.0, (radar.dielectricPermittivity - 25.0) / 55.0);
    }

    // 2. Cutter Chipping / Excessive Vibration Risk
    let cutterWearRiskScore = 0;
    if (telemetry.vibrationRmsG > 4.0) {
      cutterWearRiskScore += Math.min(60, (telemetry.vibrationRmsG - 4.0) * 15);
    }
    if (telemetry.peakVibrationG > 12.0) {
      cutterWearRiskScore += 25;
    }
    if (radar.estimatedRmr < 20 || radar.estimatedRmr > 85) {
      // Extremely fractured or ultra-hard abrasive granite transitions
      cutterWearRiskScore += 15;
    }
    cutterWearRiskScore = Math.min(100, Math.round(cutterWearRiskScore));

    // 3. Safety Classification & Thrust Adjustment
    let excavationSafetyStatus: TbmExcavationClassification['excavationSafetyStatus'] = 'NORMAL_STABLE_EXCAVATION';
    let recommendedThrustAdjustmentPct = 0;

    if (radar.detectedVoidVolumeM3 > 5.0 && radar.radarLookaheadMeters <= 3.0 && waterInrushProbability > 0.4) {
      excavationSafetyStatus = 'KARST_CAVITY_IMMEDIATE_STOP';
      recommendedThrustAdjustmentPct = -100; // Full stop
    } else if (telemetry.vibrationRmsG > 7.0 || cutterWearRiskScore > 65) {
      excavationSafetyStatus = 'DISC_CUTTER_CHIPPING_WARNING';
      recommendedThrustAdjustmentPct = -35; // Ease off thrust to protect cutter discs
    }

    const payload = `${telemetry.tbmId}:${telemetry.chainageMeters}:${excavationSafetyStatus}:${cutterWearRiskScore}:${waterInrushProbability}:${radar.radarLookaheadMeters}`;
    const inspectionDigest = createHash('sha256').update(payload).digest('hex');

    return {
      tbmId: telemetry.tbmId,
      chainageMeters: telemetry.chainageMeters,
      excavationSafetyStatus,
      cutterWearRiskScore,
      waterInrushProbability: Number(waterInrushProbability.toFixed(3)),
      recommendedThrustAdjustmentPct,
      inspectionDigest,
    };
  }
}
