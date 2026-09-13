import { describe, it, expect } from "vitest";
import {
  OffshoreMonopileScourLiquefactionSensor,
  OffshoreMonopileTelemetry
} from "./offshore-monopile-scour-liquefaction-sensor";

describe("SNAP-87: Offshore Monopile Foundation Scour Dynamic Pore-Pressure Liquefaction Sensor", () => {
  it("evaluates a nominal and stable offshore wind monopile foundation", () => {
    const nominalTelemetry: OffshoreMonopileTelemetry = {
      turbineId: "OWF-DOGGER-BANK-A04",
      waterDepthMeters: 32.0,
      monopileDiameterMeters: 8.5,
      measuredScourDepthMeters: 1.2, // S/D = 0.14
      cyclicWaveHeightSignificantMeters: 3.2,
      soilEffectiveOverburdenPressureKPa: 140.0,
      excessPorePressureKPa: 15.0, // ru = 0.107
      cyclicStressRatio: 0.18,
      cyclicResistanceRatio: 0.38 // FSL = 2.11
    };

    const evaluation = OffshoreMonopileScourLiquefactionSensor.evaluateFoundationStability(nominalTelemetry);

    expect(evaluation.turbineId).toBe("OWF-DOGGER-BANK-A04");
    expect(evaluation.scourSeverityLevel).toBe("NOMINAL");
    expect(evaluation.seabedLiquefactionRisk).toBe("STABLE");
    expect(evaluation.curtailmentRecommended).toBe(false);
    expect(evaluation.geotechnicalSafetyFactor).toBeGreaterThanOrEqual(2.0);
    expect(evaluation.attestationDigest).toHaveLength(64);
  });

  it("detects critical storm liquefaction and recommends emergency curtailment", () => {
    const criticalTelemetry: OffshoreMonopileTelemetry = {
      turbineId: "OWF-HORNSEA-TWO-B12",
      waterDepthMeters: 40.0,
      monopileDiameterMeters: 7.5,
      measuredScourDepthMeters: 10.5, // S/D = 1.4 -> CRITICAL_SCOUR_EXCAVATION
      cyclicWaveHeightSignificantMeters: 9.8,
      soilEffectiveOverburdenPressureKPa: 110.0,
      excessPorePressureKPa: 98.0, // ru = 0.89 -> IMMINENT_LIQUEFACTION
      cyclicStressRatio: 0.45,
      cyclicResistanceRatio: 0.30 // FSL = 0.67
    };

    const evaluation = OffshoreMonopileScourLiquefactionSensor.evaluateFoundationStability(criticalTelemetry);

    expect(evaluation.scourSeverityLevel).toBe("CRITICAL_SCOUR_EXCAVATION");
    expect(evaluation.seabedLiquefactionRisk).toBe("IMMINENT_LIQUEFACTION");
    expect(evaluation.curtailmentRecommended).toBe(true);
    expect(evaluation.geotechnicalSafetyFactor).toBeLessThan(1.35);
  });

  it("throws descriptive errors when physical dimension invariants are violated", () => {
    expect(() => {
      OffshoreMonopileScourLiquefactionSensor.evaluateFoundationStability({
        turbineId: "",
        waterDepthMeters: 30.0,
        monopileDiameterMeters: 8.0,
        measuredScourDepthMeters: 2.0,
        cyclicWaveHeightSignificantMeters: 4.0,
        soilEffectiveOverburdenPressureKPa: 100.0,
        excessPorePressureKPa: 10.0,
        cyclicStressRatio: 0.2,
        cyclicResistanceRatio: 0.3
      });
    }).toThrow("turbineId is required.");

    expect(() => {
      OffshoreMonopileScourLiquefactionSensor.evaluateFoundationStability({
        turbineId: "TURBINE-01",
        waterDepthMeters: -10.0,
        monopileDiameterMeters: 8.0,
        measuredScourDepthMeters: 2.0,
        cyclicWaveHeightSignificantMeters: 4.0,
        soilEffectiveOverburdenPressureKPa: 100.0,
        excessPorePressureKPa: 10.0,
        cyclicStressRatio: 0.2,
        cyclicResistanceRatio: 0.3
      });
    }).toThrow("waterDepthMeters and monopileDiameterMeters must be strictly positive.");
  });
});
