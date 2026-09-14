/**
 * SNAP-90: Hydroelectric Penstock Acoustic Resonance & Hydraulic Transient Water-Hammer Sensor.
 * Part of SnapInspect AI Heavy Infrastructure & Geotechnical Platform.
 *
 * Implements ASME PTC 18 & IEC 60041 Hydroelectric Penstock Structural Integrity Monitoring:
 * - Joukowsky equation hydraulic transient water-hammer pressure spike modeling (dP = rho * a * dv)
 * - Acoustic resonance harmonics of closed/throttled turbine wicket gate penstocks (fn = n * a / 4L)
 * - Cavitation acoustic emission (AE) pitting detection (high-frequency ultrasonic spikes)
 * - Automated emergency turbine bypass valve governor mitigation with SHA-256 integrity digests.
 */

import { createHash } from "crypto";

export interface PenstockTelemetry {
  penstockId: string;
  penstockLengthMeters: number;         // e.g. 850.0 m
  innerDiameterMeters: number;          // e.g. 3.2 m
  wallThicknessMm: number;              // e.g. 38.0 mm (high-strength quenched steel)
  waterAcousticWaveSpeedMps: number;    // Acoustic wave velocity 'a' (typically 1000 - 1300 m/s)
  initialFlowVelocityMps: number;       // Steady-state velocity before valve motion (e.g. 4.5 m/s)
  emergencyValveClosureTimeSec: number; // e.g. 3.5 s (rapid closure)
  measuredCavitationAcousticEnergyDb: number; // Ultrasonic AE energy (dB re 1 uV)
}

export interface PenstockStructuralAssessment {
  penstockId: string;
  fundamentalResonanceFreqHz: number;
  joukowskyWaterHammerPressureBar: number;
  pipeHoopStressMpa: number;
  transientSeverity: "NOMINAL_OPERATING" | "MODERATE_PRESSURE_SURGE" | "CRITICAL_WATER_HAMMER_RUPTURE_RISK";
  cavitationDamageRisk: "LOW_NORMAL" | "ELEVATED_EROSION" | "SEVERE_PITTING_IMMINENT_LEAK";
  emergencySurgeReliefTriggered: boolean;
  penstockSafetyCertificate: string;
}

export class HydroelectricPenstockAcousticResonanceSensor {
  private static readonly WATER_DENSITY_KG_M3 = 1000.0;
  // Standard high-strength penstock steel allowable hoop stress (e.g. 250 MPa)
  private static readonly MAX_SAFE_HOOP_STRESS_MPA = 240.0;

  public static evaluatePenstockIntegrity(telemetry: PenstockTelemetry): PenstockStructuralAssessment {
    if (!telemetry.penstockId) {
      throw new Error("penstockId cannot be empty.");
    }
    if (telemetry.penstockLengthMeters <= 0 || telemetry.innerDiameterMeters <= 0 || telemetry.wallThicknessMm <= 0) {
      throw new Error("Penstock geometric dimensions must be strictly positive.");
    }
    if (telemetry.emergencyValveClosureTimeSec <= 0) {
      throw new Error("emergencyValveClosureTimeSec must be strictly positive.");
    }

    const a = telemetry.waterAcousticWaveSpeedMps;
    const L = telemetry.penstockLengthMeters;
    const dv = telemetry.initialFlowVelocityMps;

    // 1. Fundamental acoustic quarter-wave resonance frequency f1 = a / (4 * L)
    const fundamentalFreq = Math.round((a / (4.0 * L)) * 1000) / 1000;

    // 2. Critical valve closure time 2L / a (wave reflection round-trip)
    const roundTripTime = (2.0 * L) / a;

    // 3. Joukowsky water hammer pressure surge dP = rho * a * dv
    // If closure time Tc <= 2L/a, full Joukowsky surge occurs; otherwise scaled by (roundTripTime / Tc)
    let deltaP_pascals: number;
    if (telemetry.emergencyValveClosureTimeSec <= roundTripTime) {
      deltaP_pascals = this.WATER_DENSITY_KG_M3 * a * dv;
    } else {
      deltaP_pascals = this.WATER_DENSITY_KG_M3 * a * dv * (roundTripTime / telemetry.emergencyValveClosureTimeSec);
    }

    const deltaP_bar = Math.round((deltaP_pascals / 1e5) * 100) / 100;

    // 4. Barlow hoop stress: sigma_h = (P * D) / (2 * t)
    const thicknessMeters = telemetry.wallThicknessMm / 1000.0;
    const hoopStressMpa = Math.round(((deltaP_pascals * telemetry.innerDiameterMeters) / (2.0 * thicknessMeters * 1e6)) * 100) / 100;

    let severity: "NOMINAL_OPERATING" | "MODERATE_PRESSURE_SURGE" | "CRITICAL_WATER_HAMMER_RUPTURE_RISK";
    let triggerSurgeRelief = false;

    if (hoopStressMpa >= this.MAX_SAFE_HOOP_STRESS_MPA || deltaP_bar > 45.0) {
      severity = "CRITICAL_WATER_HAMMER_RUPTURE_RISK";
      triggerSurgeRelief = true;
    } else if (hoopStressMpa >= 140.0 || deltaP_bar > 20.0) {
      severity = "MODERATE_PRESSURE_SURGE";
    } else {
      severity = "NOMINAL_OPERATING";
    }

    // 5. Cavitation acoustic emission evaluation (dB)
    let cavitationRisk: "LOW_NORMAL" | "ELEVATED_EROSION" | "SEVERE_PITTING_IMMINENT_LEAK";
    if (telemetry.measuredCavitationAcousticEnergyDb >= 85.0) {
      cavitationRisk = "SEVERE_PITTING_IMMINENT_LEAK";
      triggerSurgeRelief = true;
    } else if (telemetry.measuredCavitationAcousticEnergyDb >= 65.0) {
      cavitationRisk = "ELEVATED_EROSION";
    } else {
      cavitationRisk = "LOW_NORMAL";
    }

    const payload = `${telemetry.penstockId}:${deltaP_bar}:${hoopStressMpa}:${severity}:${cavitationRisk}`;
    const digest = createHash("sha256").update(payload).digest("hex");

    return {
      penstockId: telemetry.penstockId,
      fundamentalResonanceFreqHz: fundamentalFreq,
      joukowskyWaterHammerPressureBar: deltaP_bar,
      pipeHoopStressMpa: hoopStressMpa,
      transientSeverity: severity,
      cavitationDamageRisk: cavitationRisk,
      emergencySurgeReliefTriggered: triggerSurgeRelief,
      penstockSafetyCertificate: digest,
    };
  }
}
