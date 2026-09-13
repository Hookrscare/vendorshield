import { describe, it, expect } from "vitest";
import {
  MaglevCryogenicQuenchDumpInverter,
  MaglevCoilTelemetry,
} from "./maglev-cryogenic-quench-dump-inverter";

describe("SNAP-77 / SNAP-78: MaglevCryogenicQuenchDumpInverter", () => {
  it("verifies nominal superconducting state without quench when coil is balanced", () => {
    const telemetry: MaglevCoilTelemetry = {
      coilId: "BOGIE-1-COIL-A",
      coilInductanceHenries: 0.25,
      nominalCurrentAmps: 600,
      measuredTerminalVoltage: 5.0, // pure inductive V = L * dI/dt = 0.25 * 20 = 5.0V
      currentDerivativeAmpPerSec: 20.0,
      cryoTemperatureKelvin: 4.2,
      heliumPressureBar: 1.10,
    };

    const res = MaglevCryogenicQuenchDumpInverter.evaluateQuenchState(telemetry);

    expect(res.coilId).toBe("BOGIE-1-COIL-A");
    expect(res.isQuenchDetected).toBe(false);
    expect(res.resistiveVoltage).toBe(0.0);
    expect(res.fastDumpInverterTriggered).toBe(false);
    expect(res.decayTimeConstantMs).toBe(500); // 0.25 / 0.5 * 1000 = 500ms
    expect(res.storedMagneticEnergyJoules).toBe(45000); // 0.5 * 0.25 * 600^2 = 45,000 J
    expect(res.heliumBoilOffReliefVentingActive).toBe(false);
    expect(res.telemetryProofHash).toHaveLength(64);
  });

  it("detects resistive quench and actuates fast dump inverter with helium venting", () => {
    const telemetry: MaglevCoilTelemetry = {
      coilId: "BOGIE-2-COIL-B",
      coilInductanceHenries: 0.30,
      nominalCurrentAmps: 750,
      measuredTerminalVoltage: 1.25, // expected inductive: 0.30 * 2.0 = 0.60V -> V_res = 0.65V (> 0.15V threshold)
      currentDerivativeAmpPerSec: 2.0,
      cryoTemperatureKelvin: 4.8,
      heliumPressureBar: 1.20,
    };

    const res = MaglevCryogenicQuenchDumpInverter.evaluateQuenchState(telemetry);

    expect(res.isQuenchDetected).toBe(true);
    expect(res.resistiveVoltage).toBe(0.65);
    expect(res.fastDumpInverterTriggered).toBe(true);
    expect(res.heliumBoilOffReliefVentingActive).toBe(true);
    expect(res.estimatedHotSpotTemperatureKelvin).toBeGreaterThan(4.8);
  });

  it("triggers thermal quench if cryo bath temperature exceeds threshold even without voltage imbalance", () => {
    const telemetry: MaglevCoilTelemetry = {
      coilId: "BOGIE-3-COIL-C",
      coilInductanceHenries: 0.10,
      nominalCurrentAmps: 400,
      measuredTerminalVoltage: 0.0,
      currentDerivativeAmpPerSec: 0.0,
      cryoTemperatureKelvin: 6.5, // > 5.2K threshold
      heliumPressureBar: 1.45,
    };

    const res = MaglevCryogenicQuenchDumpInverter.evaluateQuenchState(telemetry);

    expect(res.isQuenchDetected).toBe(true);
    expect(res.fastDumpInverterTriggered).toBe(true);
    expect(res.heliumBoilOffReliefVentingActive).toBe(true);
  });

  it("throws error for non-positive coil inductance", () => {
    expect(() =>
      MaglevCryogenicQuenchDumpInverter.evaluateQuenchState({
        coilId: "ERR-1",
        coilInductanceHenries: -0.1,
        nominalCurrentAmps: 100,
        measuredTerminalVoltage: 0,
        currentDerivativeAmpPerSec: 0,
        cryoTemperatureKelvin: 4.2,
        heliumPressureBar: 1.0,
      })
    ).toThrow("Coil inductance must be strictly positive.");
  });
});
