import { describe, it, expect } from "vitest";
import {
  MaglevCryogenicMagnetQuenchDetector,
  SuperconductingMagnetSpec,
  CryogenicTelemetrySample
} from "./maglev-cryogenic-magnet-quench-detector";

describe("SNAP-77: Maglev Cryogenic Superconducting Magnet Quench Detector", () => {
  const spec: SuperconductingMagnetSpec = {
    magnetId: "MAGLEV-SCM-BOGIE1-COIL03",
    nominalCurrentAmperes: 1200, // 1.2 kA
    inductanceHenries: 2.5,
    criticalTemperatureKelvin: 9.2, // NbTi
    maxAllowedHotSpotKelvin: 150.0,
    dumpResistorOhms: 5.0, // tau = 2.5 / 5.0 = 0.5s
    quenchVoltageThresholdMv: 50.0,
    quenchPersistDurationMs: 10.0
  };

  it("verifies nominal continuous superconducting state", () => {
    const samples: CryogenicTelemetrySample[] = [
      { timestampMs: 1000, coilCurrentAmperes: 1200, coilTemperatureKelvin: 4.2, resistiveTapVoltageMv: 0.1, cryostatPressureBar: 1.1 },
      { timestampMs: 1005, coilCurrentAmperes: 1200, coilTemperatureKelvin: 4.2, resistiveTapVoltageMv: 0.2, cryostatPressureBar: 1.1 },
      { timestampMs: 1010, coilCurrentAmperes: 1200, coilTemperatureKelvin: 4.22, resistiveTapVoltageMv: 0.15, cryostatPressureBar: 1.1 }
    ];

    const res = MaglevCryogenicMagnetQuenchDetector.assessQuenchTelemetry(spec, samples);
    expect(res.quenchDetected).toBe(false);
    expect(res.dumpBreakerTriggered).toBe(false);
    expect(res.status).toBe("NORMAL_SUPERCONDUCTING");
    expect(res.storedMagneticEnergyJoules).toBe(1800000); // 0.5 * 2.5 * 1200^2 = 1.8 MJ
    expect(res.extractionTimeConstantSeconds).toBe(0.5);
    expect(res.telemetryDigest).toHaveLength(64);
  });

  it("detects resistive voltage tap quench and triggers fast dump extraction", () => {
    const samples: CryogenicTelemetrySample[] = [
      { timestampMs: 1000, coilCurrentAmperes: 1200, coilTemperatureKelvin: 4.2, resistiveTapVoltageMv: 0.5, cryostatPressureBar: 1.1 },
      { timestampMs: 1005, coilCurrentAmperes: 1200, coilTemperatureKelvin: 4.5, resistiveTapVoltageMv: 65.0, cryostatPressureBar: 1.15 },
      { timestampMs: 1010, coilCurrentAmperes: 1200, coilTemperatureKelvin: 5.1, resistiveTapVoltageMv: 85.0, cryostatPressureBar: 1.2 },
      { timestampMs: 1020, coilCurrentAmperes: 1195, coilTemperatureKelvin: 6.0, resistiveTapVoltageMv: 120.0, cryostatPressureBar: 1.3 }
    ];

    const res = MaglevCryogenicMagnetQuenchDetector.assessQuenchTelemetry(spec, samples);
    expect(res.quenchDetected).toBe(true);
    expect(res.dumpBreakerTriggered).toBe(true);
    expect(res.status).toBe("QUENCH_PROTECTION_ENGAGED");
    expect(res.recommendation).toContain("Quench safely mitigated");
  });

  it("detects critical temperature breach", () => {
    const samples: CryogenicTelemetrySample[] = [
      { timestampMs: 1000, coilCurrentAmperes: 1200, coilTemperatureKelvin: 9.5, resistiveTapVoltageMv: 10.0, cryostatPressureBar: 2.5 }
    ];

    const res = MaglevCryogenicMagnetQuenchDetector.assessQuenchTelemetry(spec, samples);
    expect(res.quenchDetected).toBe(true);
  });

  it("validates empty telemetry input", () => {
    expect(() => MaglevCryogenicMagnetQuenchDetector.assessQuenchTelemetry(spec, [])).toThrow("must not be empty");
  });
});
