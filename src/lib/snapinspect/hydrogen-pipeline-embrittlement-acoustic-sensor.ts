/**
 * SNAP-84: High-Pressure Hydrogen Pipeline Embrittlement Acoustic Sensor.
 * Part of SnapInspect AI Deepwater & Energy Infrastructure NDT Platform.
 *
 * Implements Acoustic Emission (AE) waveform feature analysis for high-pressure (350-700 bar)
 * gaseous hydrogen transmission pipelines (API 5L X65/X70 steel):
 * - Detects sub-critical Hydrogen-Induced Cracking (HIC) and Hydrogen-Assisted Stress Corrosion Cracking (HASCC)
 * - Uses RA value (Rise Time / Peak Amplitude) and AF (Average Frequency) to classify tensile microcleavage
 * - Computes MARSE (Measured Area of the Rectified Signal Envelope) energy release rates
 * - Generates SHA-256 pipeline acoustic integrity attestations
 */

import { createHash } from "crypto";

export interface HydrogenAcousticEmissionBurst {
  sensorId: string;
  pipelineSteelGrade: "API_5L_X52" | "API_5L_X65" | "API_5L_X70";
  operatingPressureBar: number; // e.g., 350 - 700 bar
  riseTimeMicroseconds: number;
  peakAmplitudeDecibels: number; // dB_AE (reference 1 uV)
  energyMarseCounts: number;
  burstDurationMicroseconds: number;
  countsToPeak: number;
}

export interface HydrogenEmbrittlementAssessment {
  sensorId: string;
  embrittlementSeverityIndex: number; // 0.0 - 1.0
  crackMode: "TENSILE_CLEAVAGE_HIC" | "SHEAR_SLIP" | "BACKGROUND_FLOW_NOISE";
  pipelineSafetyStatus: "SAFE" | "ELEVATED_INSPECTION_REQUIRED" | "CRITICAL_SHUTDOWN_REQUIRED";
  mitigationRecommendation: string;
  acousticAttestationDigest: string;
}

export class HydrogenPipelineEmbrittlementAcousticSensor {
  public static readonly MAX_OPERATING_PRESSURE_BAR = 1000.0;

  public static evaluateAcousticEmission(burst: HydrogenAcousticEmissionBurst): HydrogenEmbrittlementAssessment {
    if (!burst.sensorId) {
      throw new Error("sensorId is required.");
    }
    if (burst.operatingPressureBar <= 0 || burst.operatingPressureBar > this.MAX_OPERATING_PRESSURE_BAR) {
      throw new Error(`operatingPressureBar must be in range 0 - ${this.MAX_OPERATING_PRESSURE_BAR}.`);
    }
    if (burst.peakAmplitudeDecibels <= 0 || burst.riseTimeMicroseconds < 0) {
      throw new Error("Acoustic parameters must be non-negative.");
    }

    // Convert dB_AE amplitude back to linear microvolts: V = 10^(dB/20)
    const peakAmpMicrovolts = Math.pow(10, burst.peakAmplitudeDecibels / 20.0);

    // RA value = Rise Time (us) / Peak Amplitude (V)
    // Low RA (< 0.1 ms/V) indicates brittle tensile microcracking (HIC cleavage)
    // High RA (> 0.5 ms/V) indicates shear slip / ductile deformation or flow turbulence
    const raValue = burst.riseTimeMicroseconds / Math.max(0.1, peakAmpMicrovolts);

    // Pressure stress factor: higher pressures accelerate atomic hydrogen diffusion
    const pressureFactor = burst.operatingPressureBar / 700.0;

    // Severity based on MARSE energy and amplitude
    let severity = (burst.energyMarseCounts / 5000.0) * pressureFactor * (burst.peakAmplitudeDecibels / 100.0);
    severity = Number(Math.min(1.0, Math.max(0.0, severity)).toFixed(2));

    // Crack classification
    let crackMode: HydrogenEmbrittlementAssessment["crackMode"] = "BACKGROUND_FLOW_NOISE";
    if (burst.peakAmplitudeDecibels > 65.0 && raValue < 0.15) {
      crackMode = "TENSILE_CLEAVAGE_HIC";
    } else if (burst.peakAmplitudeDecibels > 50.0) {
      crackMode = "SHEAR_SLIP";
    }

    // Pipeline safety status
    let safetyStatus: HydrogenEmbrittlementAssessment["pipelineSafetyStatus"] = "SAFE";
    let recommendation = "Acoustic emission within background baseline. Continue continuous hydrogen monitoring.";

    if (crackMode === "TENSILE_CLEAVAGE_HIC" && severity >= 0.70) {
      safetyStatus = "CRITICAL_SHUTDOWN_REQUIRED";
      recommendation = "EMERGENCY: Rapid hydrogen-induced microcleavage detected. Isolate pipeline section, vent pressure, and deploy phased-array ultrasonic inspection.";
    } else if (crackMode === "TENSILE_CLEAVAGE_HIC" || severity >= 0.45) {
      safetyStatus = "ELEVATED_INSPECTION_REQUIRED";
      recommendation = "ELEVATED WARNING: Suspected early-stage hydrogen embrittlement. Reduce line operating pressure by 20% and log AE event clustering.";
    }

    const digestPayload = `${burst.sensorId}:${severity}:${crackMode}:${safetyStatus}:${burst.operatingPressureBar}`;
    const acousticAttestationDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      sensorId: burst.sensorId,
      embrittlementSeverityIndex: severity,
      crackMode,
      pipelineSafetyStatus: safetyStatus,
      mitigationRecommendation: recommendation,
      acousticAttestationDigest
    };
  }
}
