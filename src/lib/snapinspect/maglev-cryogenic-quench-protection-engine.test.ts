import { describe, it, expect } from "vitest";
import {
  MaglevCryogenicQuenchProtectionEngine,
  SuperconductingMagnetTelemetry
} from "./maglev-cryogenic-quench-protection-engine";

describe("MaglevCryogenicQuenchProtectionEngine (SNAP-77)", () => {
  it("detects resistive quench transition and commands fast dump extraction", () => {
    const telemetry: SuperconductingMagnetTelemetry = {
      magnetId: "MAGLEV-BOGIE-1-YBCO-COIL-4",
      coilCurrentAmperes: 850.0,
      coilInductanceHenries: 2.0,
      bridgeVoltageUnbalanceMv: 240.0, // Exceeds 100 mV threshold
      cryogenicTempKelvin: 88.5,
      criticalTempKelvin: 93.0,
      dewarPressureBar: 2.2,
      sampleDurationMs: 25.0 // Exceeds 20 ms hotspot duration
    };

    const res = MaglevCryogenicQuenchProtectionEngine.evaluateMagnetQuench(telemetry);

    expect(res.quenchDetected).toBe(true);
    expect(res.triggerFastEnergyDump).toBe(true);
    expect(res.storedMagneticEnergyJoules).toBe(722500); // 0.5 * 2.0 * 850^2
    expect(res.dumpResistorRequiredOhms).toBe(4.0); // 2.0 H / 0.5 s
    expect(res.quenchRiskClassification).toBe("CRITICAL_MAGNET_QUENCH_EXTRACT");
    expect(res.telemetryDigest).toHaveLength(64);
  });

  it("maintains stable status under normal cryogenic levitation operating parameters", () => {
    const telemetry: SuperconductingMagnetTelemetry = {
      magnetId: "MAGLEV-BOGIE-2-YBCO-COIL-1",
      coilCurrentAmperes: 700.0,
      coilInductanceHenries: 2.0,
      bridgeVoltageUnbalanceMv: 8.5,
      cryogenicTempKelvin: 72.0,
      criticalTempKelvin: 93.0,
      dewarPressureBar: 1.1,
      sampleDurationMs: 50.0
    };

    const res = MaglevCryogenicQuenchProtectionEngine.evaluateMagnetQuench(telemetry);

    expect(res.quenchDetected).toBe(false);
    expect(res.triggerFastEnergyDump).toBe(false);
    expect(res.quenchRiskClassification).toBe("STABLE_SUPERCONDUCTING");
  });

  it("validates input sanity", () => {
    expect(() => {
      MaglevCryogenicQuenchProtectionEngine.evaluateMagnetQuench({
        magnetId: "",
        coilCurrentAmperes: -50,
        coilInductanceHenries: 0,
        bridgeVoltageUnbalanceMv: 0,
        cryogenicTempKelvin: 0,
        criticalTempKelvin: 0,
        dewarPressureBar: 0,
        sampleDurationMs: 0
      });
    }).toThrow("Invalid magnet telemetry: magnetId, non-negative current, and positive inductance required.");
  });
});
