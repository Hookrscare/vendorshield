import { describe, it, expect } from "vitest";
import {
  WindPitchBearingFlawDetector,
  PitchBearingSpec,
  UltrasonicEchoScan
} from "./wind-pitch-bearing-flaw-detector";

describe("WindPitchBearingFlawDetector (SNAP-72)", () => {
  const spec: PitchBearingSpec = {
    turbineId: "TURBINE-OFFSHORE-07",
    bladeNumber: 2,
    bearingOuterDiameterMm: 2800,
    caseHardenedDepthMm: 4.5,
    peakHertzianShearDepthMm: 2.2
  };

  it("classifies acceptable baseline when echo is very low amplitude", () => {
    const scan: UltrasonicEchoScan = {
      probeAngleDegrees: 45,
      shearWaveVelocityMPerSec: 3240,
      echoTimeOfFlightMicroseconds: 0.96,
      echoAmplitudePercentFsh: 5,
      referenceFbhAmplitudePercentFsh: 80
    };

    const res = WindPitchBearingFlawDetector.evaluateFlaw(spec, scan);
    expect(res.racewayDefectSeverity).toBe("ACCEPTABLE_BASELINE");
    expect(res.operationalAction).toContain("normal metallurgical baseline");
  });

  it("detects critical spalling structural risk when flaw is in peak shear zone with high amplitude", () => {
    const scan: UltrasonicEchoScan = {
      probeAngleDegrees: 45,
      shearWaveVelocityMPerSec: 3240,
      echoTimeOfFlightMicroseconds: 1.92,
      echoAmplitudePercentFsh: 80,
      referenceFbhAmplitudePercentFsh: 80
    };

    const res = WindPitchBearingFlawDetector.evaluateFlaw(spec, scan);
    expect(res.isInPeakShearZone).toBe(true);
    expect(res.racewayDefectSeverity).toBe("CRITICAL_SPALLING_STRUCTURAL_RISK");
    expect(res.operationalAction).toContain("EMERGENCY");
    expect(res.operationalAction).toContain("Lock blade in 90-degree feathered position");
  });

  it("recommends monitoring for moderate sub-surface inclusion outside shear zone", () => {
    const scan: UltrasonicEchoScan = {
      probeAngleDegrees: 45,
      shearWaveVelocityMPerSec: 3240,
      echoTimeOfFlightMicroseconds: 3.5,
      echoAmplitudePercentFsh: 40,
      referenceFbhAmplitudePercentFsh: 80
    };

    const res = WindPitchBearingFlawDetector.evaluateFlaw(spec, scan);
    expect(res.isInPeakShearZone).toBe(false);
    expect(res.racewayDefectSeverity).toBe("MONITOR_SUB_SURFACE_INCLUSION");
    expect(res.operationalAction).toContain("increase automated grease lubrication cycle");
  });
});
