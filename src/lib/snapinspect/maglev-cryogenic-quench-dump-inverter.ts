/**
 * SNAP-77 / SNAP-78: Maglev Cryogenic Superconducting Magnet Quench Detection & Fast Dump Resistor Inverter.
 * Part of SnapInspect AI Tactical Field NDT & High-Speed Rail Bogie Infrastructure Sensor Suite.
 * 
 * Monitors cryogenic superconducting electromagnet coil resistive balance voltage (V_resistive = V - L * dI/dt),
 * triggers sub-10ms fast quench detection, and activates the dump resistor commutation inverter to safely
 * extract multi-megajoule magnetic energy while preventing thermal thermal-runaway coil burnout.
 */

import { createHash } from "crypto";

export interface MaglevCoilTelemetry {
  coilId: string;
  coilInductanceHenries: number; // L
  nominalCurrentAmps: number;    // I0
  measuredTerminalVoltage: number; // V_total
  currentDerivativeAmpPerSec: number; // dI/dt
  cryoTemperatureKelvin: number; // T_cryo
  heliumPressureBar: number;
}

export interface QuenchProtectionConfig {
  resistiveVoltageThresholdVolts: number; // e.g. 0.15 V
  maxAllowedCryoTempKelvin: number;       // e.g. 5.5 K for NbTi / 85 K for YBCO
  dumpResistorOhms: number;               // R_dump
  maxAllowedMiits: number;                // Mega-Amp^2 seconds threshold
}

export interface QuenchDumpResult {
  coilId: string;
  isQuenchDetected: boolean;
  resistiveVoltage: number;
  fastDumpInverterTriggered: boolean;
  decayTimeConstantMs: number; // tau = L / R_dump in ms
  storedMagneticEnergyJoules: number; // 0.5 * L * I^2
  estimatedHotSpotTemperatureKelvin: number;
  heliumBoilOffReliefVentingActive: boolean;
  telemetryProofHash: string;
}

export class MaglevCryogenicQuenchDumpInverter {
  /**
   * Evaluates inductive vs resistive coil balance and triggers fast dump inverter if quench is confirmed.
   */
  public static evaluateQuenchState(
    telemetry: MaglevCoilTelemetry,
    config: QuenchProtectionConfig = {
      resistiveVoltageThresholdVolts: 0.15,
      maxAllowedCryoTempKelvin: 5.2,
      dumpResistorOhms: 0.5,
      maxAllowedMiits: 2.5,
    }
  ): QuenchDumpResult {
    if (!telemetry.coilId) {
      throw new Error("Invalid telemetry: coilId must be specified.");
    }
    if (telemetry.coilInductanceHenries <= 0) {
      throw new Error("Coil inductance must be strictly positive.");
    }

    // 1. Calculate purely inductive voltage drop: V_inductive = L * (dI/dt)
    const inductiveVoltage = telemetry.coilInductanceHenries * telemetry.currentDerivativeAmpPerSec;

    // 2. Derive resistive voltage: V_resistive = |V_terminal - V_inductive|
    const resistiveVoltage = Math.abs(telemetry.measuredTerminalVoltage - inductiveVoltage);

    // 3. Quench condition: resistive voltage exceeds micro-quench threshold OR cryo temperature breakdown
    const isVoltageQuench = resistiveVoltage >= config.resistiveVoltageThresholdVolts;
    const isThermalQuench = telemetry.cryoTemperatureKelvin >= config.maxAllowedCryoTempKelvin;
    const isQuenchDetected = isVoltageQuench || isThermalQuench;

    // 4. If quench detected, activate fast dump resistor commutation
    const fastDumpInverterTriggered = isQuenchDetected;

    // Time constant tau = L / R_dump in milliseconds
    const tauMs = (telemetry.coilInductanceHenries / config.dumpResistorOhms) * 1000;

    // Stored magnetic energy E = 0.5 * L * I^2
    const storedEnergyJoules = 0.5 * telemetry.coilInductanceHenries * Math.pow(telemetry.nominalCurrentAmps, 2);

    // Hotspot temperature model: adiabatic heating approximation
    let estimatedHotSpotTemp = telemetry.cryoTemperatureKelvin;
    if (isQuenchDetected) {
      // Hot spot scales with delayed energy dissipation before full dump
      const dissipationDelaySec = 0.008; // 8ms detection + switch time
      const energyDissipatedInCoil = Math.min(storedEnergyJoules, 0.02 * storedEnergyJoules + resistiveVoltage * telemetry.nominalCurrentAmps * dissipationDelaySec);
      estimatedHotSpotTemp = telemetry.cryoTemperatureKelvin + (energyDissipatedInCoil / 450.0);
    }

    // Cryostat overpressure relief valve: trigger if pressure > 1.35 bar or quench detected
    const heliumBoilOffReliefVentingActive = isQuenchDetected || telemetry.heliumPressureBar >= 1.35;

    const raw = `${telemetry.coilId}:${isQuenchDetected}:${resistiveVoltage.toFixed(4)}:${storedEnergyJoules.toFixed(1)}:${heliumBoilOffReliefVentingActive}`;
    const telemetryProofHash = createHash("sha256").update(raw).digest("hex");

    return {
      coilId: telemetry.coilId,
      isQuenchDetected,
      resistiveVoltage: Math.round(resistiveVoltage * 10000) / 10000,
      fastDumpInverterTriggered,
      decayTimeConstantMs: Math.round(tauMs * 100) / 100,
      storedMagneticEnergyJoules: Math.round(storedEnergyJoules * 10) / 10,
      estimatedHotSpotTemperatureKelvin: Math.round(estimatedHotSpotTemp * 100) / 100,
      heliumBoilOffReliefVentingActive,
      telemetryProofHash,
    };
  }
}
