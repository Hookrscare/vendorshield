/**
 * SNAP-81: Deepwater Subsea Blowout Preventer (BOP) Shear Ram Acoustic Emission & Hydraulic Fatigue Profiler.
 * Part of SnapInspect AI Tactical Field Inspection & Subsea Reliability Suite.
 *
 * Implements API Standard 53 & API 16A compliance monitoring for subsea Blind Shear Rams (BSR):
 * 1. Hydraulic actuation dynamics (pressure drawdown, closing time < 30s).
 * 2. High-frequency Acoustic Emission (AE) burst energy for blade shearing stress & seal galling.
 * 3. Cumulative fatigue damage accumulation via Palmgren-Miner linear damage hypothesis.
 */

import { createHash } from "crypto";

export interface BopShearRamActuationEvent {
  actuationId: string;
  waterDepthMeters: number; // e.g. 1500 to 3000 m
  closingPressurePsi: number; // Nominal ~3000 to 5000 psi
  closureTimeSeconds: number; // API 53 requires < 30s closure
  pipeShearedOdInches: number; // e.g. 5.5 inch drillpipe, casing
  acousticEmissionEnergyJoules: number; // Sensor AE energy (gall/crack indicator)
  priorCumulativeCycles: number;
}

export interface BopFatigueAssessment {
  actuationId: string;
  isApi53CompliantClosure: boolean;
  closingTimeSeconds: number;
  shearingForceKilonewtons: number;
  gallingDetected: boolean;
  incrementalFatigueDamage: number; // Miner's D increment
  cumulativeFatigueDamage: number;
  remainingUsefulCycles: number;
  status: "OPERATIONAL" | "INSPECTION_RECOMMENDED" | "CRITICAL_MAINTENANCE_REQUIRED";
  telemetrySignature: string;
  timestamp: string;
}

export class DeepwaterBopShearRamFatigueProfiler {
  private static readonly MAX_DESIGN_FATIGUE_CYCLES = 250; // Heavy shear cycles design limit
  private static readonly AE_GALLING_THRESHOLD_JOULES = 450.0;

  public static profileActuation(event: BopShearRamActuationEvent): BopFatigueAssessment {
    if (event.closingPressurePsi < 1000 || event.closureTimeSeconds <= 0) {
      throw new Error("Invalid actuation parameters: closingPressurePsi and closureTimeSeconds must be valid positive numbers.");
    }

    // API 53 standard: Blind shear rams on subsea BOP must close and seal in under 30 seconds
    const isApi53CompliantClosure = event.closureTimeSeconds <= 30.0;

    // Approximate shearing force F = P_hyd * Area_piston (approx 800-2500 kN for heavy drill pipe)
    const shearingForceKilonewtons = Math.round((event.closingPressurePsi * 0.00689476) * 35.0);

    // AE energy spikes indicate high friction/metal galling or micro-cracking in blade carrier
    const gallingDetected = event.acousticEmissionEnergyJoules > this.AE_GALLING_THRESHOLD_JOULES;

    // Incremental Miner's fatigue damage: heavy pipe shear inflicts higher stress amplitude
    const severityFactor = 1.0 + (event.pipeShearedOdInches / 5.0) + (gallingDetected ? 0.8 : 0.0);
    const incrementalFatigueDamage = Number((severityFactor / this.MAX_DESIGN_FATIGUE_CYCLES).toFixed(4));

    const cumulativeFatigueDamage = Number(
      ((event.priorCumulativeCycles / this.MAX_DESIGN_FATIGUE_CYCLES) + incrementalFatigueDamage).toFixed(4)
    );

    const remainingUsefulCycles = Math.max(
      0,
      Math.round((1.0 - cumulativeFatigueDamage) * this.MAX_DESIGN_FATIGUE_CYCLES)
    );

    let status: BopFatigueAssessment["status"] = "OPERATIONAL";
    if (cumulativeFatigueDamage >= 0.85 || !isApi53CompliantClosure) {
      status = "CRITICAL_MAINTENANCE_REQUIRED";
    } else if (cumulativeFatigueDamage >= 0.65 || gallingDetected) {
      status = "INSPECTION_RECOMMENDED";
    }

    const rawPayload = `${event.actuationId}:${status}:${cumulativeFatigueDamage}:${isApi53CompliantClosure}`;
    const telemetrySignature = createHash("sha256").update(rawPayload).digest("hex");

    return {
      actuationId: event.actuationId,
      isApi53CompliantClosure,
      closingTimeSeconds: event.closureTimeSeconds,
      shearingForceKilonewtons,
      gallingDetected,
      incrementalFatigueDamage,
      cumulativeFatigueDamage,
      remainingUsefulCycles,
      status,
      telemetrySignature,
      timestamp: new Date().toISOString()
    };
  }
}
