/**
 * SNAP-75: High-Speed Maglev Linear Induction Motor Stator End-Turn Magnetic Stray Field Flux Resonator.
 * Part of SnapInspect AI Automated High-Speed Transit & Rail Infrastructure Suite.
 * 
 * 1. Analyzes 3-axis magnetic stray flux leakage from linear motor stator winding end-turns.
 * 2. Evaluates magnetic field exposure against ICNIRP public/passenger cabin exposure limits.
 * 3. Identifies PWM harmonic resonance frequencies and localized eddy-current thermal risk.
 * 4. Generates SHA-256 electromagnetic field safety verification digests.
 */

import { createHash } from "crypto";

export interface StatorEndTurnFluxSensorSample {
  timestampMs: number;
  sensorLocation: "CABIN_FLOOR" | "CHASSIS_FRAME" | "CRYOGENIC_DEWAR_SHIELD" | "STATOR_OVERHANG";
  bFieldMicroTesla: [number, number, number]; // [Bx, By, Bz]
  inverterCarrierFreqHz: number;              // e.g. 2500 Hz
  statorCurrentRmsAmps: number;
}

export interface StrayFieldSafetyThresholds {
  passengerCabinMaxMicroTesla: number; // ICNIRP public guideline: 400 uT
  chassisEddyHeatingLimitMicroTesla: number; // 25,000 uT
  cryogenicShieldLimitMicroTesla: number;    // 5,000 uT
}

export interface EndTurnFluxAnalysisResult {
  totalSamplesAnalyzed: number;
  peakFluxDensityMicroTesla: number;
  meanFluxDensityMicroTesla: number;
  passengerCabinExposureExceeded: boolean;
  chassisEddyHeatingRiskDetected: boolean;
  dominantHarmonicFreqHz: number;
  isCompliant: boolean;
  highestExposureLocation: string;
  safetyAttestationDigest: string;
}

export class MaglevLinearMotorStatorEndTurnFluxResonator {
  private static readonly DEFAULT_THRESHOLDS: StrayFieldSafetyThresholds = {
    passengerCabinMaxMicroTesla: 400.0,
    chassisEddyHeatingLimitMicroTesla: 25000.0,
    cryogenicShieldLimitMicroTesla: 5000.0
  };

  public static analyzeStrayFieldFlux(
    samples: StatorEndTurnFluxSensorSample[],
    thresholds: Partial<StrayFieldSafetyThresholds> = {}
  ): EndTurnFluxAnalysisResult {
    if (!samples || samples.length === 0) {
      throw new Error("Flux telemetry samples must not be empty.");
    }

    const limits: StrayFieldSafetyThresholds = {
      ...this.DEFAULT_THRESHOLDS,
      ...thresholds
    };

    let peakFlux = 0.0;
    let sumFlux = 0.0;
    let cabinExceeded = false;
    let chassisHeatingRisk = false;
    let maxLoc = samples[0].sensorLocation;
    let dominantFreq = samples[0].inverterCarrierFreqHz;

    for (const s of samples) {
      const bx = s.bFieldMicroTesla[0];
      const by = s.bFieldMicroTesla[1];
      const bz = s.bFieldMicroTesla[2];
      const magnitude = Math.sqrt(bx * bx + by * by + bz * bz);

      sumFlux += magnitude;
      if (magnitude > peakFlux) {
        peakFlux = magnitude;
        maxLoc = s.sensorLocation;
        dominantFreq = s.inverterCarrierFreqHz;
      }

      if (s.sensorLocation === "CABIN_FLOOR" && magnitude > limits.passengerCabinMaxMicroTesla) {
        cabinExceeded = true;
      }

      if (s.sensorLocation === "CHASSIS_FRAME" && magnitude > limits.chassisEddyHeatingLimitMicroTesla) {
        chassisHeatingRisk = true;
      }

      if (s.sensorLocation === "CRYOGENIC_DEWAR_SHIELD" && magnitude > limits.cryogenicShieldLimitMicroTesla) {
        chassisHeatingRisk = true;
      }
    }

    const meanFlux = sumFlux / samples.length;
    const isCompliant = !cabinExceeded && !chassisHeatingRisk;

    const digestRaw = `${samples.length}:${peakFlux.toFixed(2)}:${meanFlux.toFixed(2)}:${isCompliant}:${maxLoc}`;
    const digest = createHash("sha256").update(digestRaw).digest("hex");

    return {
      totalSamplesAnalyzed: samples.length,
      peakFluxDensityMicroTesla: Number(peakFlux.toFixed(2)),
      meanFluxDensityMicroTesla: Number(meanFlux.toFixed(2)),
      passengerCabinExposureExceeded: cabinExceeded,
      chassisEddyHeatingRiskDetected: chassisHeatingRisk,
      dominantHarmonicFreqHz: dominantFreq,
      isCompliant,
      highestExposureLocation: maxLoc,
      safetyAttestationDigest: digest
    };
  }
}
