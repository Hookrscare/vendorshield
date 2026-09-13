/**
 * SNAP-74: Superconducting Maglev Linear Induction Motor Rotor Airgap Dynamic Telemetry Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * 1. Evaluates dynamic mechanical propulsion airgaps between onboard rotor/reaction plates and track stators.
 * 2. Monitors multi-bogie clearance (forward, mid, aft) under high-speed aerodynamic buffet & curve banking.
 * 3. Detects exponential magnetic normal force attraction collapse (< critical limit) and thrust decoupling (> max limit).
 * 4. Generates automated emergency brake interlocks, harmonic vibration alerts, and SHA-256 inspection digests.
 */

import { createHash } from "crypto";

export type MotorArchitecture = "LINEAR_INDUCTION_MOTOR_LIM" | "LINEAR_SYNCHRONOUS_MOTOR_LSM";

export interface LinearMotorSpec {
  motorType: MotorArchitecture;
  nominalAirgapMm: number;        // e.g. 15.0 mm for LIM, 25.0 mm for LSM
  minSafetyAirgapMm: number;      // e.g. 8.0 mm critical contact pinch threshold
  maxThrustAirgapMm: number;      // e.g. 32.0 mm slip decoupling limit
  vehicleSpeedKmh: number;
}

export interface BogieAirgapTelemetryPoint {
  timestampMs: number;
  chainageKm: number;
  forwardBogieAirgapMm: number;
  midBogieAirgapMm: number;
  aftBogieAirgapMm: number;
  rollAngleDeg: number;
}

export interface MotorAirgapAnomalyAlert {
  timestampMs: number;
  chainageKm: number;
  severity: "EMERGENCY_INTERLOCK_TRIP" | "WARNING" | "ADVISORY";
  anomalyType: "ROTOR_AIRGAP_PINCH_COLLAPSE" | "THRUST_DECOUPLING_EXPANSION" | "PITCH_WAVE_OSCILLATION";
  description: string;
}

export interface LinearMotorAirgapProfileResult {
  totalTelemetrySamples: number;
  inspectedChainageSpanKm: number;
  minObservedAirgapMm: number;
  maxObservedAirgapMm: number;
  meanAirgapMm: number;
  isAirgapIntegrityCompliant: boolean;
  alerts: MotorAirgapAnomalyAlert[];
  telemetryDigest: string;
}

export class SuperconductingMaglevLinearMotorRotorAirgapProfiler {
  public static profileAirgapTelemetry(
    spec: LinearMotorSpec,
    telemetry: BogieAirgapTelemetryPoint[]
  ): LinearMotorAirgapProfileResult {
    if (!telemetry || telemetry.length === 0) {
      throw new Error("Linear motor telemetry data points cannot be empty.");
    }

    if (spec.nominalAirgapMm <= 0 || spec.minSafetyAirgapMm <= 0 || spec.maxThrustAirgapMm <= spec.minSafetyAirgapMm) {
      throw new Error("Invalid linear motor specification parameters.");
    }

    let minGap = Number.POSITIVE_INFINITY;
    let maxGap = Number.NEGATIVE_INFINITY;
    let sumGap = 0;
    let totalSamples = 0;
    const alerts: MotorAirgapAnomalyAlert[] = [];

    const startKm = telemetry[0].chainageKm;
    const endKm = telemetry[telemetry.length - 1].chainageKm;
    const spanKm = Math.abs(endKm - startKm);

    for (const pt of telemetry) {
      const gaps = [pt.forwardBogieAirgapMm, pt.midBogieAirgapMm, pt.aftBogieAirgapMm];

      for (const g of gaps) {
        if (g < minGap) minGap = g;
        if (g > maxGap) maxGap = g;
        sumGap += g;
        totalSamples++;
      }

      // Check pinch collapse (attraction force runaway risk)
      const minBogieGap = Math.min(...gaps);
      if (minBogieGap < spec.minSafetyAirgapMm) {
        alerts.push({
          timestampMs: pt.timestampMs,
          chainageKm: pt.chainageKm,
          severity: "EMERGENCY_INTERLOCK_TRIP",
          anomalyType: "ROTOR_AIRGAP_PINCH_COLLAPSE",
          description: `Rotor airgap ${minBogieGap.toFixed(1)}mm fell below safety floor ${spec.minSafetyAirgapMm}mm. Magnetic clamp hazard.`
        });
      }

      // Check thrust decoupling
      const maxBogieGap = Math.max(...gaps);
      if (maxBogieGap > spec.maxThrustAirgapMm) {
        alerts.push({
          timestampMs: pt.timestampMs,
          chainageKm: pt.chainageKm,
          severity: "WARNING",
          anomalyType: "THRUST_DECOUPLING_EXPANSION",
          description: `Rotor airgap ${maxBogieGap.toFixed(1)}mm exceeded thrust coupling ceiling ${spec.maxThrustAirgapMm}mm.`
        });
      }

      // Pitch wave oscillation (large difference between forward and aft bogie)
      if (Math.abs(pt.forwardBogieAirgapMm - pt.aftBogieAirgapMm) > 6.0) {
        alerts.push({
          timestampMs: pt.timestampMs,
          chainageKm: pt.chainageKm,
          severity: "WARNING",
          anomalyType: "PITCH_WAVE_OSCILLATION",
          description: `Excessive pitch gradient between forward (${pt.forwardBogieAirgapMm}mm) and aft (${pt.aftBogieAirgapMm}mm) bogies.`
        });
      }
    }

    const meanGap = totalSamples > 0 ? sumGap / totalSamples : spec.nominalAirgapMm;
    const compliant = alerts.filter(a => a.severity === "EMERGENCY_INTERLOCK_TRIP").length === 0;

    const rawDigest = `${spec.motorType}:${totalSamples}:${minGap.toFixed(2)}:${maxGap.toFixed(2)}:${compliant}`;
    const digest = createHash("sha256").update(rawDigest).digest("hex");

    return {
      totalTelemetrySamples: telemetry.length,
      inspectedChainageSpanKm: Number(spanKm.toFixed(3)),
      minObservedAirgapMm: Number(minGap.toFixed(2)),
      maxObservedAirgapMm: Number(maxGap.toFixed(2)),
      meanAirgapMm: Number(meanGap.toFixed(2)),
      isAirgapIntegrityCompliant: compliant,
      alerts,
      telemetryDigest: digest
    };
  }
}
