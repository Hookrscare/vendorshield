/**
 * SNAP-77: Cryogenic LNG Storage Tank Secondary Barrier Vacuum Permeability Monitor.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 * 
 * Monitors interbarrier insulation space (IBS) gas pressure, methane vapor concentration,
 * and secondary barrier seal integrity for cryogenic LNG carrier and containment tanks.
 */

import { createHash } from "crypto";

export interface LngInterbarrierTelemetry {
  tankId: string;
  ibsGasPressureMbar: number; // Nominal ~3 to 8 mbar
  nitrogenPurgeRateNm3Hr: number;
  methaneConcentrationVolPct: number; // Safe threshold < 1.0%
  oxygenConcentrationVolPct: number;  // Safe threshold < 0.5%
  interbarrierTempKelvin: number;    // Cryogenic gradient ~115K to 150K
  monitoringIntervalSec: number;
}

export interface LngBarrierIntegrityResult {
  tankId: string;
  primaryBarrierIntact: boolean;
  secondaryBarrierIntact: boolean;
  emergencyNitrogenSweepRequired: boolean;
  barrierRiskClassification: "NOMINAL_CRYOGENIC_CONTAINMENT" | "PRIMARY_BARRIER_LEAKAGE" | "SECONDARY_BARRIER_BREACH_ATMOSPHERIC";
  telemetryDigest: string;
}

export class CryogenicLngSecondaryBarrierMonitor {
  public static evaluateBarrierIntegrity(
    telemetry: LngInterbarrierTelemetry,
    methaneTripThresholdVolPct: number = 1.0,
    oxygenTripThresholdVolPct: number = 0.5
  ): LngBarrierIntegrityResult {
    if (!telemetry.tankId || telemetry.ibsGasPressureMbar < 0) {
      throw new Error("Invalid telemetry: tankId and non-negative pressure required.");
    }

    // 1. Primary barrier leak: methane gas migrates into nitrogen-purged insulation space
    const primaryLeak = telemetry.methaneConcentrationVolPct >= methaneTripThresholdVolPct;

    // 2. Secondary barrier leak: ambient air/oxygen ingresses into insulation space
    const secondaryBreach = telemetry.oxygenConcentrationVolPct >= oxygenTripThresholdVolPct ||
                            telemetry.ibsGasPressureMbar > 20.0;

    let classification: LngBarrierIntegrityResult["barrierRiskClassification"] = "NOMINAL_CRYOGENIC_CONTAINMENT";
    if (primaryLeak) {
      classification = "PRIMARY_BARRIER_LEAKAGE";
    } else if (secondaryBreach) {
      classification = "SECONDARY_BARRIER_BREACH_ATMOSPHERIC";
    }

    const emergencySweep = primaryLeak || secondaryBreach;

    const raw = `${telemetry.tankId}:${telemetry.ibsGasPressureMbar}:${primaryLeak}:${secondaryBreach}:${classification}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      tankId: telemetry.tankId,
      primaryBarrierIntact: !primaryLeak,
      secondaryBarrierIntact: !secondaryBreach,
      emergencyNitrogenSweepRequired: emergencySweep,
      barrierRiskClassification: classification,
      telemetryDigest: digest
    };
  }
}
