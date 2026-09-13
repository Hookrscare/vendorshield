/**
 * SNAP-77: Maglev Cryogenic Superconducting Magnet Quench Detection & Fast Dump Resistor Inverter.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 * 
 * Detects normal-zone resistive phase transitions in maglev superconducting magnets
 * and triggers millisecond fast-dump energy extraction to prevent thermal coil destruction.
 */

import { createHash } from "crypto";

export interface SuperconductingMagnetTelemetry {
  magnetId: string;
  coilCurrentAmperes: number;
  coilInductanceHenries: number;
  bridgeVoltageUnbalanceMv: number;
  cryogenicTempKelvin: number;
  criticalTempKelvin: number; // e.g. 9.2 K for NbTi, 93 K for YBCO
  dewarPressureBar: number;
  sampleDurationMs: number;
}

export interface QuenchProtectionResult {
  magnetId: string;
  quenchDetected: boolean;
  triggerFastEnergyDump: boolean;
  storedMagneticEnergyJoules: number;
  dumpResistorRequiredOhms: number;
  dischargeDecayTimeTauSec: number;
  quenchRiskClassification: "STABLE_SUPERCONDUCTING" | "CRYOGENIC_THERMAL_EXCURSION" | "CRITICAL_MAGNET_QUENCH_EXTRACT";
  telemetryDigest: string;
}

export class MaglevCryogenicQuenchProtectionEngine {
  public static evaluateMagnetQuench(
    telemetry: SuperconductingMagnetTelemetry,
    voltageThresholdMv: number = 100.0,
    maxHotspotDurationMs: number = 20.0
  ): QuenchProtectionResult {
    if (!telemetry.magnetId || telemetry.coilCurrentAmperes < 0 || telemetry.coilInductanceHenries <= 0) {
      throw new Error("Invalid magnet telemetry: magnetId, non-negative current, and positive inductance required.");
    }

    // 1. Calculate stored magnetic inductive energy: E = 0.5 * L * I^2
    const storedEnergy = 0.5 * telemetry.coilInductanceHenries * Math.pow(telemetry.coilCurrentAmperes, 2);

    // 2. Assess resistive transition conditions
    const voltageUnbalanceTrip = Math.abs(telemetry.bridgeVoltageUnbalanceMv) >= voltageThresholdMv &&
                                telemetry.sampleDurationMs >= maxHotspotDurationMs;
    const thermalExcursionTrip = telemetry.cryogenicTempKelvin >= telemetry.criticalTempKelvin;
    const pressureSpikeTrip = telemetry.dewarPressureBar >= 3.5; // Cryogenic boil-off spike

    const isQuench = voltageUnbalanceTrip || (thermalExcursionTrip && pressureSpikeTrip);
    const triggerDump = isQuench && telemetry.coilCurrentAmperes > 50.0;

    // 3. Size fast dump resistor (target decay time tau = 0.5 sec to prevent dielectric arc-over)
    const targetTauSec = 0.5;
    const dumpResistorOhms = telemetry.coilInductanceHenries / targetTauSec;

    let classification: QuenchProtectionResult["quenchRiskClassification"] = "STABLE_SUPERCONDUCTING";
    if (isQuench) {
      classification = "CRITICAL_MAGNET_QUENCH_EXTRACT";
    } else if (telemetry.cryogenicTempKelvin > (telemetry.criticalTempKelvin * 0.85)) {
      classification = "CRYOGENIC_THERMAL_EXCURSION";
    }

    const raw = `${telemetry.magnetId}:${storedEnergy.toFixed(1)}:${isQuench}:${triggerDump}:${classification}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      magnetId: telemetry.magnetId,
      quenchDetected: isQuench,
      triggerFastEnergyDump: triggerDump,
      storedMagneticEnergyJoules: Math.round(storedEnergy),
      dumpResistorRequiredOhms: Number(dumpResistorOhms.toFixed(2)),
      dischargeDecayTimeTauSec: targetTauSec,
      quenchRiskClassification: classification,
      telemetryDigest: digest
    };
  }
}
