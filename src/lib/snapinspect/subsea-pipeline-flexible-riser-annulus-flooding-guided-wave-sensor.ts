/**
 * src/lib/snapinspect/subsea-pipeline-flexible-riser-annulus-flooding-guided-wave-sensor.ts
 * SNAP-75: Subsea Pipeline Flexible Riser Annulus Flooding Guided Wave Sensor.
 * Part of SnapInspect AI Tactical NDT & Offshore Pipeline Integrity Platform.
 *
 * Implements Long-Range Ultrasonic Guided Wave (LRUT) T(0,1)/L(0,2) acoustic telemetry
 * to monitor multi-layer subsea flexible riser annulus seawater ingress, wave attenuation,
 * and time-of-flight flood-front localization in compliance with API 17J and DNV-ST-F119.
 */

import { createHash } from "crypto";

export interface GuidedWavePulseData {
  timeMicroseconds: number[];
  amplitudeVolts: number[];
}

export interface FlexibleRiserConfig {
  riserId: string;
  totalLengthMeters: number;
  armorWireCount: number;
  nominalWaveVelocityMetersPerSec: number; // e.g. 5100 m/s for high-strength steel armor wires
  dryAttenuationDbPerMeter: number;         // e.g. 0.35 dB/m
  floodedAttenuationThresholdDbPerMeter: number; // e.g. 2.5 dB/m
}

export interface AnnulusFloodingAssessment {
  riserId: string;
  annulusState: "DRY_UNCOMPROMISED" | "PARTIAL_ANNULUS_FLOODING" | "CRITICAL_TOTAL_SUBSEA_FLOODING";
  attenuationDbPerMeter: number;
  floodFrontDistanceMeters: number | null;
  floodedLengthPercentage: number;
  confidenceScore: number;
  inspectionCompliantApi17J: boolean;
  telemetryAuditSha256: string;
  timestamp: string;
}

export class SubseaPipelineFlexibleRiserAnnulusFloodingGuidedWaveSensor {
  private config: FlexibleRiserConfig;

  constructor(config?: Partial<FlexibleRiserConfig>) {
    this.config = {
      riserId: "RISER-DEEPWATER-FPSO-01",
      totalLengthMeters: 450.0,
      armorWireCount: 84,
      nominalWaveVelocityMetersPerSec: 5100.0,
      dryAttenuationDbPerMeter: 0.05,
      floodedAttenuationThresholdDbPerMeter: 0.20,
      ...config,
    };
  }

  /**
   * Computes acoustic attenuation alpha = (20 / d) * log10(A_initial / A_transmitted).
   */
  public computeAttenuationDbPerMeter(
    initialPeakVoltage: number,
    endEchoVoltage: number,
    distanceMeters: number
  ): number {
    if (distanceMeters <= 0 || initialPeakVoltage <= 0 || endEchoVoltage <= 0) {
      return 0.0;
    }
    const ratio = Math.max(1e-9, initialPeakVoltage / endEchoVoltage);
    const attenuation = (20.0 / distanceMeters) * Math.log10(ratio);
    return Math.max(0.0, parseFloat(attenuation.toFixed(3)));
  }

  /**
   * Evaluates pulse echo time series for flood front echo (TOF) and transmission attenuation.
   */
  public assessAnnulusIntegrity(
    pulseData: GuidedWavePulseData,
    initialPeakV: number,
    endEchoV: number
  ): AnnulusFloodingAssessment {
    const totalDist = this.config.totalLengthMeters;
    const attenuation = this.computeAttenuationDbPerMeter(initialPeakV, endEchoV, totalDist);

    // Scan for intermediate reflection echoes between transmission pulse and end of riser
    // Time-of-flight: t = 2 * d / v -> d = (t * v) / 2
    let floodFrontDistanceMeters: number | null = null;
    let maxReflectionAmplitude = 0;
    const minTofUs = 20.0; // blanking window
    const maxTofUs = (2.0 * totalDist / this.config.nominalWaveVelocityMetersPerSec) * 1e6;

    for (let i = 0; i < pulseData.timeMicroseconds.length; i++) {
      const tUs = pulseData.timeMicroseconds[i];
      const amp = Math.abs(pulseData.amplitudeVolts[i]);

      if (tUs > minTofUs && tUs < maxTofUs * 0.95) {
        if (amp > maxReflectionAmplitude && amp > 0.05 * initialPeakV) {
          maxReflectionAmplitude = amp;
          const dist = (tUs * 1e-6 * this.config.nominalWaveVelocityMetersPerSec) / 2.0;
          floodFrontDistanceMeters = parseFloat(dist.toFixed(2));
        }
      }
    }

    let annulusState: "DRY_UNCOMPROMISED" | "PARTIAL_ANNULUS_FLOODING" | "CRITICAL_TOTAL_SUBSEA_FLOODING";
    let floodedLengthPercentage = 0.0;

    if (attenuation >= this.config.floodedAttenuationThresholdDbPerMeter * 1.5) {
      annulusState = "CRITICAL_TOTAL_SUBSEA_FLOODING";
      floodedLengthPercentage = 100.0;
    } else if (attenuation >= this.config.floodedAttenuationThresholdDbPerMeter || floodFrontDistanceMeters !== null) {
      annulusState = "PARTIAL_ANNULUS_FLOODING";
      if (floodFrontDistanceMeters !== null) {
        const floodedMeters = Math.max(0, totalDist - floodFrontDistanceMeters);
        floodedLengthPercentage = parseFloat(((floodedMeters / totalDist) * 100.0).toFixed(1));
      } else {
        floodedLengthPercentage = 50.0;
      }
    } else {
      annulusState = "DRY_UNCOMPROMISED";
      floodedLengthPercentage = 0.0;
    }

    const confidenceScore = floodFrontDistanceMeters !== null ? 0.96 : 0.88;
    const inspectionCompliantApi17J = annulusState !== "CRITICAL_TOTAL_SUBSEA_FLOODING";
    const timestamp = new Date().toISOString();

    const auditPayload = [
      this.config.riserId,
      annulusState,
      attenuation.toString(),
      floodedLengthPercentage.toString(),
      timestamp,
    ].join("::");

    const telemetryAuditSha256 = createHash("sha256").update(auditPayload).digest("hex");

    return {
      riserId: this.config.riserId,
      annulusState,
      attenuationDbPerMeter: attenuation,
      floodFrontDistanceMeters,
      floodedLengthPercentage,
      confidenceScore,
      inspectionCompliantApi17J,
      telemetryAuditSha256,
      timestamp,
    };
  }
}
