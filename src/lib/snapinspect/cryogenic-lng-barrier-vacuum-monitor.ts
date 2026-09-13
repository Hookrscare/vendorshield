/**
 * SNAP-77: Cryogenic LNG Storage Tank Secondary Barrier Vacuum Permeability Monitor.
 * Part of SnapInspect AI Tactical NDT & Field Inspection Suite.
 * 
 * Evaluates vacuum pressure dynamics, methane molecular effusion, and Knudsen diffusion flux
 * across primary and secondary barrier interspaces in cryogenic LNG tanks (-162°C)
 * to detect pinhole membrane breaches, perlite insulation vacuum decay, and outer jacket breaches.
 */

import { createHash } from "crypto";

export type LngBarrierIntegrityStatus =
  | "NORMAL_STABLE"
  | "PRIMARY_BARRIER_PINHOLE_LEAK"
  | "OUTER_JACKET_VACUUM_DEGRADATION"
  | "CRITICAL_INTER_BARRIER_BREACH";

export interface LngInterBarrierTelemetry {
  tankId: string;
  timestampEpochMs: number;
  secondarySpaceVacuumMbar: number; // Normal < 0.05 mbar
  methaneConcentrationPpm: number;  // Normal < 5 ppm
  secondarySpaceTempKelvin: number; // Normal ~ 115K - 160K
  nitrogenPurgeFlowM3h: number;     // Purge sweep rate
}

export interface LngBarrierAssessment {
  tankId: string;
  status: LngBarrierIntegrityStatus;
  isAlarmActive: boolean;
  knudsenEffusionIndex: number; // Relative molecular effusion rate
  insulationThermalConductivityMwPerMk: number;
  recommendedAction: string;
  auditHash: string;
  timestampIso: string;
}

export class CryogenicLngBarrierVacuumMonitor {
  // Threshold constants
  private static readonly NORMAL_VACUUM_MBAR_MAX = 0.05;
  private static readonly VACUUM_DEGRADE_MBAR_MIN = 0.30;
  private static readonly CRITICAL_VACUUM_MBAR = 1.50;

  private static readonly METHANE_PINHOLE_PPM_MIN = 50.0;
  private static readonly METHANE_CRITICAL_PPM = 500.0;

  /**
   * Evaluates sensor readings and determines barrier containment status.
   */
  public static evaluateIntegrity(
    telemetry: LngInterBarrierTelemetry
  ): LngBarrierAssessment {
    if (telemetry.secondarySpaceVacuumMbar < 0) {
      throw new Error("Vacuum pressure cannot be negative.");
    }
    if (telemetry.methaneConcentrationPpm < 0) {
      throw new Error("Methane concentration cannot be negative.");
    }
    if (telemetry.secondarySpaceTempKelvin <= 0) {
      throw new Error("Temperature must be strictly positive Kelvin.");
    }

    const {
      secondarySpaceVacuumMbar: vac,
      methaneConcentrationPpm: ch4,
      secondarySpaceTempKelvin: tempK,
    } = telemetry;

    // Estimate insulation thermal conductivity (apparent lambda in mW/(m*K))
    // Pure vacuum perlite ~ 1.5 mW/(m*K), degraded vacuum perlite rises to ~ 15-30 mW/(m*K)
    const thermalCond = Math.round((1.5 + (vac * 8.5) + ((tempK - 110) * 0.05)) * 100) / 100;

    // Molecular Knudsen effusion proxy: J ~ P_ch4 / sqrt(T)
    const effusionIndex = Math.round(((ch4 * 0.001) / Math.sqrt(tempK)) * 1000) / 1000;

    let status: LngBarrierIntegrityStatus;
    let action: string;
    let isAlarmActive: boolean;

    if (ch4 >= this.METHANE_CRITICAL_PPM || vac >= this.CRITICAL_VACUUM_MBAR) {
      status = "CRITICAL_INTER_BARRIER_BREACH";
      action = "Initiate immediate high-volume dry nitrogen emergency purge, notify chief engineer, and isolate tank bunkering lines.";
      isAlarmActive = true;
    } else if (ch4 >= this.METHANE_PINHOLE_PPM_MIN) {
      status = "PRIMARY_BARRIER_PINHOLE_LEAK";
      action = "Primary membrane micro-perforation suspected. Increase N2 sweep flow, schedule optical boroscope inspection.";
      isAlarmActive = true;
    } else if (vac >= this.VACUUM_DEGRADE_MBAR_MIN) {
      status = "OUTER_JACKET_VACUUM_DEGRADATION";
      action = "Secondary vacuum degradation without hydrocarbons. Connect external turbomolecular vacuum pumping skid.";
      isAlarmActive = true;
    } else {
      status = "NORMAL_STABLE";
      action = "Maintain continuous nominal nitrogen baseline sweep and perlite vacuum telemetry.";
      isAlarmActive = false;
    }

    const raw = `${telemetry.tankId}:${status}:${vac.toFixed(3)}:${ch4.toFixed(1)}:${tempK.toFixed(1)}`;
    const auditHash = createHash("sha256").update(raw).digest("hex");

    return {
      tankId: telemetry.tankId,
      status,
      isAlarmActive,
      knudsenEffusionIndex: effusionIndex,
      insulationThermalConductivityMwPerMk: thermalCond,
      recommendedAction: action,
      auditHash,
      timestampIso: new Date(telemetry.timestampEpochMs).toISOString(),
    };
  }
}
