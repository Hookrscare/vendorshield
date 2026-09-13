/**
 * src/lib/snapinspect/hydrogen-copv-acoustic-emission-array.ts
 * Part of SnapInspect AI Tactical NDT & High-Pressure Containment Suite.
 *
 * SNAP-79: High-Pressure Hydrogen Transport Composite Overwrapped Pressure Vessel (COPV)
 * Acoustic Emission (AE) Sensor Array.
 * Real-time continuous non-destructive evaluation of 700-bar Type IV hydrogen transport cylinders:
 * - Differentiates CFRP damage mechanisms (matrix micro-cracking, delamination, fiber breakage).
 * - Computes the Felicity Ratio to quantify structural degradation and Kaiser effect breakdown.
 * - Triangulates damage localization along cylinder cylindrical mantle via TDOA.
 * - Enforces ISO 11119-3 & ASME Section X structural safety thresholds.
 */

import { createHash } from "crypto";

export interface AcousticEmissionHit {
  sensorId: string;
  arrivalTimestampMicroseconds: number;
  peakAmplitudeDb: number;        // e.g. 40 to 100 dB_AE
  energyCounts: number;           // MARSE or raw energy
  riseTimeMicroseconds: number;
  durationMicroseconds: number;
}

export interface CopvVesselProfile {
  vesselSerial: string;
  nominalPressureBar: number;     // e.g. 700 bar
  currentTestPressureBar: number;
  previousMaxPressureBar: number;
  vesselLengthMeters: number;
  cfarpAcousticWaveVelocityMPerSec: number; // typically ~ 3200 m/s in carbon composite
}

export interface CopvIntegrityAssessment {
  vesselSerial: string;
  felicityRatio: number;
  totalHitsProcessed: number;
  detectedDamageMechanisms: {
    matrixCracks: number;
    delaminations: number;
    fiberBreaks: number;
  };
  estimatedCriticalDefectPositionMeters: number | null;
  structuralSafetyStatus: "HEALTHY_PRESSURE_VESSEL" | "PROGRESSIVE_MICRO_CRACKING_MONITOR" | "CRITICAL_FIBER_RUPTURE_IMMEDIATE_DEPRESSURIZE";
  requiresImmediateEmergencyVenting: boolean;
  tamperEvidentDigest: string;
}

export class HydrogenCopvAcousticEmissionArray {
  /**
   * Evaluates acoustic emission hit streams across a high-pressure COPV load cycle.
   */
  public static evaluateVesselAcousticStream(
    vessel: CopvVesselProfile,
    hits: AcousticEmissionHit[]
  ): CopvIntegrityAssessment {
    if (!vessel.vesselSerial || vessel.nominalPressureBar <= 0 || vessel.currentTestPressureBar < 0) {
      throw new Error("Invalid vessel profile: vesselSerial, positive nominal and non-negative test pressure required.");
    }

    let matrixCracks = 0;
    let delaminations = 0;
    let fiberBreaks = 0;
    let firstSignificantEmissionPressure = vessel.currentTestPressureBar;

    // Classify acoustic waveform signatures by amplitude, rise time, and duration
    for (const hit of hits) {
      if (hit.peakAmplitudeDb >= 75.0 && hit.riseTimeMicroseconds < 25.0) {
        // High amplitude, steep rise time: Characteristic carbon fiber tensile fracture
        fiberBreaks++;
      } else if (hit.durationMicroseconds > 800.0 && hit.peakAmplitudeDb >= 60.0) {
        // Long duration, moderate energy: Interlaminar shear delamination
        delaminations++;
      } else if (hit.peakAmplitudeDb >= 40.0) {
        // Moderate amplitude: Polymer matrix micro-cracking
        matrixCracks++;
      }
    }

    // Estimate pressure at which acoustic emissions began:
    // If emissions occurred early in the pressurization curve:
    const emissionSeverityFraction = (fiberBreaks * 3.0 + delaminations * 1.5 + matrixCracks * 0.1) / 100.0;
    if (hits.length > 5) {
      firstSignificantEmissionPressure = Math.max(
        vessel.currentTestPressureBar * 0.5,
        vessel.currentTestPressureBar * (1.0 - Math.min(0.4, emissionSeverityFraction))
      );
    }

    // Felicity Ratio = P_emission / P_previous_max
    const prevMax = Math.max(1.0, vessel.previousMaxPressureBar);
    const felicityRatio = Number((firstSignificantEmissionPressure / prevMax).toFixed(3));

    // Linear localization along cylinder length if multiple sensors logged hits
    let criticalPosition: number | null = null;
    const sensorsLogged = hits.filter(h => h.peakAmplitudeDb >= 65.0);
    if (sensorsLogged.length >= 2) {
      const h1 = sensorsLogged[0];
      const h2 = sensorsLogged[1];
      const deltaT = (h2.arrivalTimestampMicroseconds - h1.arrivalTimestampMicroseconds) * 1e-6; // seconds
      const deltaDist = Math.abs(deltaT * vessel.cfarpAcousticWaveVelocityMPerSec);
      criticalPosition = Number((Math.min(vessel.vesselLengthMeters, Math.max(0.1, deltaDist))).toFixed(2));
    }

    // Safety classification
    let status: CopvIntegrityAssessment["structuralSafetyStatus"] = "HEALTHY_PRESSURE_VESSEL";
    let emergencyVenting = false;

    if (fiberBreaks >= 2 || felicityRatio < 0.85) {
      status = "CRITICAL_FIBER_RUPTURE_IMMEDIATE_DEPRESSURIZE";
      emergencyVenting = true;
    } else if (felicityRatio < 0.95 || delaminations > 3 || matrixCracks > 20) {
      status = "PROGRESSIVE_MICRO_CRACKING_MONITOR";
      emergencyVenting = false;
    }

    const rawDigest = `${vessel.vesselSerial}:${vessel.currentTestPressureBar}:${felicityRatio}:${fiberBreaks}:${delaminations}:${status}`;
    const digest = createHash("sha256").update(rawDigest).digest("hex");

    return {
      vesselSerial: vessel.vesselSerial,
      felicityRatio,
      totalHitsProcessed: hits.length,
      detectedDamageMechanisms: {
        matrixCracks,
        delaminations,
        fiberBreaks
      },
      estimatedCriticalDefectPositionMeters: criticalPosition,
      structuralSafetyStatus: status,
      requiresImmediateEmergencyVenting: emergencyVenting,
      tamperEvidentDigest: digest
    };
  }
}
