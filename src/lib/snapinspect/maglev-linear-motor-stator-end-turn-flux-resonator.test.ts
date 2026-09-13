import { describe, it, expect } from "vitest";
import {
  MaglevLinearMotorStatorEndTurnFluxResonator,
  StatorEndTurnFluxSensorSample
} from "./maglev-linear-motor-stator-end-turn-flux-resonator";

describe("MaglevLinearMotorStatorEndTurnFluxResonator", () => {
  it("analyzes nominal end-turn stray magnetic field within passenger safety limits", () => {
    const samples: StatorEndTurnFluxSensorSample[] = [
      {
        timestampMs: 1000,
        sensorLocation: "CABIN_FLOOR",
        bFieldMicroTesla: [30.0, 45.0, 50.0],
        inverterCarrierFreqHz: 2500,
        statorCurrentRmsAmps: 450.0
      },
      {
        timestampMs: 1010,
        sensorLocation: "CHASSIS_FRAME",
        bFieldMicroTesla: [800.0, 1200.0, 600.0],
        inverterCarrierFreqHz: 2500,
        statorCurrentRmsAmps: 450.0
      }
    ];

    const result = MaglevLinearMotorStatorEndTurnFluxResonator.analyzeStrayFieldFlux(samples);

    expect(result.isCompliant).toBe(true);
    expect(result.passengerCabinExposureExceeded).toBe(false);
    expect(result.chassisEddyHeatingRiskDetected).toBe(false);
    expect(result.totalSamplesAnalyzed).toBe(2);
    expect(result.peakFluxDensityMicroTesla).toBeGreaterThan(1000.0);
    expect(result.safetyAttestationDigest).toHaveLength(64);
  });

  it("detects excessive stray magnetic flux breaching passenger cabin ICNIRP threshold", () => {
    const samples: StatorEndTurnFluxSensorSample[] = [
      {
        timestampMs: 2000,
        sensorLocation: "CABIN_FLOOR",
        bFieldMicroTesla: [300.0, 350.0, 400.0], // |B| > 600 uT, exceeds 400 uT
        inverterCarrierFreqHz: 3000,
        statorCurrentRmsAmps: 800.0
      }
    ];

    const result = MaglevLinearMotorStatorEndTurnFluxResonator.analyzeStrayFieldFlux(samples);

    expect(result.isCompliant).toBe(false);
    expect(result.passengerCabinExposureExceeded).toBe(true);
    expect(result.highestExposureLocation).toBe("CABIN_FLOOR");
  });

  it("detects eddy-current heating risk on cryogenic dewar shield", () => {
    const samples: StatorEndTurnFluxSensorSample[] = [
      {
        timestampMs: 3000,
        sensorLocation: "CRYOGENIC_DEWAR_SHIELD",
        bFieldMicroTesla: [3000.0, 4000.0, 3500.0], // |B| > 6000 uT > 5000 uT limit
        inverterCarrierFreqHz: 2500,
        statorCurrentRmsAmps: 700.0
      }
    ];

    const result = MaglevLinearMotorStatorEndTurnFluxResonator.analyzeStrayFieldFlux(samples);

    expect(result.isCompliant).toBe(false);
    expect(result.chassisEddyHeatingRiskDetected).toBe(true);
  });

  it("throws on empty samples array", () => {
    expect(() =>
      MaglevLinearMotorStatorEndTurnFluxResonator.analyzeStrayFieldFlux([])
    ).toThrow(/Flux telemetry samples must not be empty/);
  });
});
