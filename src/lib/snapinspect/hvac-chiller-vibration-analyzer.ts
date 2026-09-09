/**
 * SNAP-36: Automated HVAC Chiller Vibration Spectral Harmonics Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Platform.
 * 
 * Evaluates commercial chiller and compressor vibration telemetry conforming to
 * ISO 10816-3 and ISO 20816-1 vibration severity standards:
 * - Computes overall vibration velocity (RMS mm/s) and peak acceleration (g).
 * - Classifies vibration severity into ISO 10816-3 zones (A: Good, B: Acceptable, C: Alert, D: Danger).
 * - Identifies spectral harmonics (1x RPM Unbalance, 2x RPM Misalignment, 3x+ Looseness, Bearing HF).
 * - Emits field inspection defect recommendations and cryptographic SHA-256 evidence tokens.
 */

import { createHash } from "crypto";

export type Iso10816Zone = "ZONE_A_GOOD" | "ZONE_B_ACCEPTABLE" | "ZONE_C_ALERT" | "ZONE_D_DANGER";
export type MechanicalFaultType = "UNBALANCE_1X" | "MISALIGNMENT_2X" | "MECHANICAL_LOOSENESS" | "BEARING_DEFECT_HF" | "NORMAL_OPERATION";

export interface VibrationPeak {
  frequencyHz: number;
  amplitudeMmS: number;
  orderRelativeRpm: number;
}

export interface ChillerVibrationTelemetry {
  equipmentId: string;
  nominalRpm: number;
  overallVelocityRmsMmS: number;
  peakAccelerationG: number;
  spectralPeaks: VibrationPeak[];
  isRigidFoundation?: boolean;
}

export interface ChillerVibrationDiagnosticResult {
  equipmentId: string;
  isoZone: Iso10816Zone;
  primaryFault: MechanicalFaultType;
  confidenceScore: number;
  isOperable: boolean;
  recommendedMaintenanceAction: string;
  dominantHarmonicOrder: number;
  attestationToken: string;
}

export class HvacChillerVibrationAnalyzer {
  /**
   * Evaluates vibration telemetry against ISO 10816-3 severity thresholds.
   * Standard threshold for Class III/IV large industrial machines (>300 kW, rigid foundation):
   * Zone A: <= 2.8 mm/s
   * Zone B: 2.8 - 4.5 mm/s
   * Zone C: 4.5 - 7.1 mm/s
   * Zone D: > 7.1 mm/s
   */
  public evaluateVibration(telemetry: ChillerVibrationTelemetry): ChillerVibrationDiagnosticResult {
    const v = telemetry.overallVelocityRmsMmS;
    let isoZone: Iso10816Zone = "ZONE_A_GOOD";
    let isOperable = true;

    if (v > 7.1) {
      isoZone = "ZONE_D_DANGER";
      isOperable = false;
    } else if (v > 4.5) {
      isoZone = "ZONE_C_ALERT";
      isOperable = true;
    } else if (v > 2.8) {
      isoZone = "ZONE_B_ACCEPTABLE";
      isOperable = true;
    } else {
      isoZone = "ZONE_A_GOOD";
      isOperable = true;
    }

    // Identify dominant mechanical fault from spectral peaks
    let primaryFault: MechanicalFaultType = "NORMAL_OPERATION";
    let dominantOrder = 1.0;
    let maxAmp = 0.0;

    for (const peak of telemetry.spectralPeaks) {
      if (peak.amplitudeMmS > maxAmp) {
        maxAmp = peak.amplitudeMmS;
        dominantOrder = peak.orderRelativeRpm;
      }
    }

    if (isoZone === "ZONE_A_GOOD") {
      primaryFault = "NORMAL_OPERATION";
    } else if (Math.abs(dominantOrder - 1.0) <= 0.1) {
      primaryFault = "UNBALANCE_1X";
    } else if (Math.abs(dominantOrder - 2.0) <= 0.15) {
      primaryFault = "MISALIGNMENT_2X";
    } else if (dominantOrder >= 2.8 && dominantOrder <= 4.2) {
      primaryFault = "MECHANICAL_LOOSENESS";
    } else if (dominantOrder > 5.0) {
      primaryFault = "BEARING_DEFECT_HF";
    }

    let recommendedAction = "CONTINUE_NORMAL_ROUTINE_MONITORING";
    if (isoZone === "ZONE_D_DANGER") {
      recommendedAction = `IMMEDIATE_SHUTDOWN: ${primaryFault} detected at ${v.toFixed(2)} mm/s RMS exceeding ISO Danger threshold (7.1 mm/s). Lockout/tagout chiller.`;
    } else if (isoZone === "ZONE_C_ALERT") {
      recommendedAction = `SCHEDULE_MAINTENANCE_WINDOW: Address ${primaryFault} during next scheduled downtime (within 14 days).`;
    } else if (isoZone === "ZONE_B_ACCEPTABLE") {
      recommendedAction = `MONITOR_ELEVATED_VIBRATION: Re-test in 30 days to verify stability.`;
    }

    const confidenceScore = Math.min(0.99, Number((0.75 + (maxAmp / (v + 1e-6)) * 0.2).toFixed(2)));

    const tokenSource = `${telemetry.equipmentId}:${v}:${isoZone}:${primaryFault}:${Date.now()}`;
    const attestationToken = createHash("sha256").update(tokenSource).digest("hex");

    return {
      equipmentId: telemetry.equipmentId,
      isoZone,
      primaryFault,
      confidenceScore,
      isOperable,
      recommendedMaintenanceAction: recommendedAction,
      dominantHarmonicOrder: dominantOrder,
      attestationToken
    };
  }
}
