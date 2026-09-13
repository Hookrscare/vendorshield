/**
 * Unit Test Suite for SNAP-62: Prestressed Concrete Reactor Pressure Vessel (PCRPV) Tendon Duct Grouting Void Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  PcrpvTendonVoidDetector,
  type PcrpvInspectionRequest
} from "./pcrpv-tendon-void-detector";

describe("SNAP-62: PCRPV Tendon Duct Void Detector", () => {
  it("certifies healthy fully grouted tendon duct", () => {
    const request: PcrpvInspectionRequest = {
      containmentVesselId: "REACTOR-UNIT-2",
      tendonId: "HOOP-TENDON-H12",
      nominalDuctDiameterMm: 150.0,
      nominalConcreteVelocityMps: 4200.0,
      soundings: [
        { stationMeters: 0.0, dominantEchoFrequencyKhz: 14.5, measuredPWaveVelocityMetersPerSec: 4180.0, echoAmplitudeAttenuationDb: 8.0 },
        { stationMeters: 2.0, dominantEchoFrequencyKhz: 14.2, measuredPWaveVelocityMetersPerSec: 4150.0, echoAmplitudeAttenuationDb: 9.5 },
        { stationMeters: 4.0, dominantEchoFrequencyKhz: 14.8, measuredPWaveVelocityMetersPerSec: 4220.0, echoAmplitudeAttenuationDb: 7.8 }
      ]
    };

    const res = PcrpvTendonVoidDetector.inspectTendonDuct(request);

    expect(res.containmentIntegrityStatus).toBe("FULL_GROUT_COMPLIANT");
    expect(res.voidDetectedCount).toBe(0);
    expect(res.inspectionDigest).toHaveLength(64);
  });

  it("detects critical ungrouted void defect", () => {
    const request: PcrpvInspectionRequest = {
      containmentVesselId: "REACTOR-UNIT-1",
      tendonId: "VERTICAL-TENDON-V08",
      nominalDuctDiameterMm: 150.0,
      nominalConcreteVelocityMps: 4200.0,
      soundings: [
        { stationMeters: 0.0, dominantEchoFrequencyKhz: 14.0, measuredPWaveVelocityMetersPerSec: 4150.0, echoAmplitudeAttenuationDb: 8.0 },
        { stationMeters: 1.5, dominantEchoFrequencyKhz: 6.2, measuredPWaveVelocityMetersPerSec: 2800.0, echoAmplitudeAttenuationDb: 32.0 }, // severe void
        { stationMeters: 3.0, dominantEchoFrequencyKhz: 5.8, measuredPWaveVelocityMetersPerSec: 2700.0, echoAmplitudeAttenuationDb: 34.0 }, // severe void
        { stationMeters: 4.5, dominantEchoFrequencyKhz: 14.1, measuredPWaveVelocityMetersPerSec: 4100.0, echoAmplitudeAttenuationDb: 9.0 }
      ]
    };

    const res = PcrpvTendonVoidDetector.inspectTendonDuct(request);

    expect(res.containmentIntegrityStatus).toBe("CRITICAL_UNGROUTED_DEFECT");
    expect(res.voidDetectedCount).toBe(2);
    expect(res.maxVoidFractionEstimate).toBe(0.5);
  });

  it("throws error for empty soundings", () => {
    expect(() => {
      PcrpvTendonVoidDetector.inspectTendonDuct({
        containmentVesselId: "BAD",
        tendonId: "T0",
        nominalDuctDiameterMm: 100,
        nominalConcreteVelocityMps: 4000,
        soundings: []
      });
    }).toThrow("at least one acoustic sounding");
  });
});
