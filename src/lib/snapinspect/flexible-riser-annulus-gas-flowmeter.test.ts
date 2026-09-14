/**
 * Unit tests for SNAP-86: Flexible Riser Annulus Free Gas Ultrasonic Flowmeter.
 */

import { describe, it, expect } from "vitest";
import {
  FlexibleRiserAnnulusGasFlowmeter,
  AnnulusUltrasonicTelemetry
} from "./flexible-riser-annulus-gas-flowmeter";

describe("SNAP-86: FlexibleRiserAnnulusGasFlowmeter", () => {
  const normalGasTelemetry: AnnulusUltrasonicTelemetry = {
    sensorPairId: "FPSO-RISER-04-ANNULUS",
    riserOuterDiameterMm: 350.0,
    sheathThicknessMm: 15.0,
    annulusPressureBar: 4.5,
    annulusTemperatureC: 22.0,
    // Path = 320mm = 0.32m. At ~420 m/s sound speed in methane gas, t = 0.32 / 420 ~ 7.619e-4 s = 761904 ns
    upstreamTransitTimeNs: 762000,
    downstreamTransitTimeNs: 761980,
    signalAmplitudeVolts: 2.4,
    signalToNoiseRatioDb: 28.5
  };

  it("detects free gas phase and normal venting under baseline pressure", () => {
    const result = FlexibleRiserAnnulusGasFlowmeter.assessAnnulus(normalGasTelemetry);

    expect(result.sensorPairId).toBe("FPSO-RISER-04-ANNULUS");
    expect(result.detectedPhase).toBe("FREE_GAS");
    expect(result.gasHoldupFraction).toBe(1.0);
    expect(result.apiRp17jCompliant).toBe(true);
    expect(result.integrityStatus).toBe("NORMAL_VENTING");
    expect(result.assessmentDigest).toBeDefined();
    expect(result.assessmentDigest.length).toBe(64);
  });

  it("detects flooded annulus (seawater breach) when acoustic speed matches liquid water", () => {
    // Path = 0.32m. Water speed ~ 1480 m/s -> t = 0.32 / 1480 ~ 2.162e-4 s = 216216 ns
    const floodedTelemetry: AnnulusUltrasonicTelemetry = {
      ...normalGasTelemetry,
      upstreamTransitTimeNs: 216200,
      downstreamTransitTimeNs: 216200
    };

    const result = FlexibleRiserAnnulusGasFlowmeter.assessAnnulus(floodedTelemetry);

    expect(result.detectedPhase).toBe("LIQUID_WATER");
    expect(result.acousticImpedanceMRayl).toBeCloseTo(1.48, 1);
    expect(result.gasHoldupFraction).toBe(0.0);
    expect(result.integrityStatus).toBe("ANNULUS_FLOODED_LIQUID");
    expect(result.apiRp17jCompliant).toBe(false);
    expect(result.recommendedMitigation).toContain("seawater breach");
  });

  it("triggers critical annulus burst risk when pressure reaches critical limits", () => {
    const overpressurizedTelemetry: AnnulusUltrasonicTelemetry = {
      ...normalGasTelemetry,
      annulusPressureBar: 28.0 // Critical limit is 25.0
    };

    const result = FlexibleRiserAnnulusGasFlowmeter.assessAnnulus(overpressurizedTelemetry);

    expect(result.integrityStatus).toBe("CRITICAL_ANNULUS_BURST_RISK");
    expect(result.apiRp17jCompliant).toBe(false);
    expect(result.recommendedMitigation).toContain("depressurize annulus");
  });

  it("triggers overpressurization warning when pressure exceeds safe threshold", () => {
    const warningTelemetry: AnnulusUltrasonicTelemetry = {
      ...normalGasTelemetry,
      annulusPressureBar: 18.0 // Safe limit is 15.0
    };

    const result = FlexibleRiserAnnulusGasFlowmeter.assessAnnulus(warningTelemetry);

    expect(result.integrityStatus).toBe("OVERPRESSURIZATION_WARNING");
    expect(result.apiRp17jCompliant).toBe(true);
    expect(result.recommendedMitigation).toContain("hydrate plug");
  });

  it("throws validation error for invalid telemetry inputs", () => {
    expect(() => {
      FlexibleRiserAnnulusGasFlowmeter.assessAnnulus({
        ...normalGasTelemetry,
        sensorPairId: ""
      });
    }).toThrow("sensorPairId is required.");

    expect(() => {
      FlexibleRiserAnnulusGasFlowmeter.assessAnnulus({
        ...normalGasTelemetry,
        riserOuterDiameterMm: -10
      });
    }).toThrow("riserOuterDiameterMm must be positive.");
  });
});
