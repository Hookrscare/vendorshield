import { describe, it, expect } from "vitest";
import {
  CryogenicLngSecondaryBarrierMonitor,
  LngInterbarrierTelemetry
} from "./cryogenic-lng-secondary-barrier-monitor";

describe("CryogenicLngSecondaryBarrierMonitor (SNAP-77)", () => {
  it("detects methane migration from primary barrier leak and trips emergency sweep", () => {
    const telemetry: LngInterbarrierTelemetry = {
      tankId: "LNG-TANK-PORT-2",
      ibsGasPressureMbar: 6.5,
      nitrogenPurgeRateNm3Hr: 120.0,
      methaneConcentrationVolPct: 2.8, // Exceeds 1.0% limit
      oxygenConcentrationVolPct: 0.1,
      interbarrierTempKelvin: 124.0,
      monitoringIntervalSec: 60.0
    };

    const res = CryogenicLngSecondaryBarrierMonitor.evaluateBarrierIntegrity(telemetry);

    expect(res.primaryBarrierIntact).toBe(false);
    expect(res.secondaryBarrierIntact).toBe(true);
    expect(res.emergencyNitrogenSweepRequired).toBe(true);
    expect(res.barrierRiskClassification).toBe("PRIMARY_BARRIER_LEAKAGE");
    expect(res.telemetryDigest).toHaveLength(64);
  });

  it("confirms nominal cryogenic containment under stable nitrogen purge", () => {
    const telemetry: LngInterbarrierTelemetry = {
      tankId: "LNG-TANK-STBD-1",
      ibsGasPressureMbar: 4.2,
      nitrogenPurgeRateNm3Hr: 80.0,
      methaneConcentrationVolPct: 0.05,
      oxygenConcentrationVolPct: 0.02,
      interbarrierTempKelvin: 130.0,
      monitoringIntervalSec: 60.0
    };

    const res = CryogenicLngSecondaryBarrierMonitor.evaluateBarrierIntegrity(telemetry);

    expect(res.primaryBarrierIntact).toBe(true);
    expect(res.secondaryBarrierIntact).toBe(true);
    expect(res.emergencyNitrogenSweepRequired).toBe(false);
    expect(res.barrierRiskClassification).toBe("NOMINAL_CRYOGENIC_CONTAINMENT");
  });

  it("validates input sanity", () => {
    expect(() => {
      CryogenicLngSecondaryBarrierMonitor.evaluateBarrierIntegrity({
        tankId: "",
        ibsGasPressureMbar: -5,
        nitrogenPurgeRateNm3Hr: 0,
        methaneConcentrationVolPct: 0,
        oxygenConcentrationVolPct: 0,
        interbarrierTempKelvin: 0,
        monitoringIntervalSec: 0
      });
    }).toThrow("Invalid telemetry: tankId and non-negative pressure required.");
  });
});
