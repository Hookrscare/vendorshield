/**
 * src/lib/snapinspect/subsea-pipeline-flexible-riser-annulus-flooding-guided-wave-sensor.test.ts
 * Unit tests for SNAP-75: Subsea Pipeline Flexible Riser Annulus Flooding Guided Wave Sensor.
 */

import { describe, it, expect } from "vitest";
import {
  SubseaPipelineFlexibleRiserAnnulusFloodingGuidedWaveSensor,
  type GuidedWavePulseData,
} from "./subsea-pipeline-flexible-riser-annulus-flooding-guided-wave-sensor";

describe("SNAP-75: Subsea Pipeline Flexible Riser Annulus Flooding Guided Wave Sensor", () => {
  const sensor = new SubseaPipelineFlexibleRiserAnnulusFloodingGuidedWaveSensor({
    riserId: "RISER-TEST-NORTH-SEA-09",
    totalLengthMeters: 400.0,
    nominalWaveVelocityMetersPerSec: 5000.0, // 5000 m/s simplifies TOF math
    dryAttenuationDbPerMeter: 0.05,
    floodedAttenuationThresholdDbPerMeter: 0.20,
  });

  it("should classify dry uncompromised riser with minimal attenuation", () => {
    // 400 meters, dry attenuation < 0.05 dB/m
    const pulseData: GuidedWavePulseData = {
      timeMicroseconds: [10, 50, 100, 150000],
      amplitudeVolts: [10.0, 0.01, 0.01, 0.5],
    };

    const initialPeak = 10.0;
    const endEcho = 5.0; // Minimal loss (6 dB over 400m -> 0.015 dB/m)
    const assessment = sensor.assessAnnulusIntegrity(pulseData, initialPeak, endEcho);

    expect(assessment.annulusState).toBe("DRY_UNCOMPROMISED");
    expect(assessment.attenuationDbPerMeter).toBeLessThan(0.05);
    expect(assessment.floodFrontDistanceMeters).toBeNull();
    expect(assessment.floodedLengthPercentage).toBe(0.0);
    expect(assessment.inspectionCompliantApi17J).toBe(true);
    expect(assessment.telemetryAuditSha256).toHaveLength(64);
  });

  it("should localize intermediate flood front echo for partial seawater ingress", () => {
    // Intermediate reflection at distance 150 meters:
    // TOF = 2 * 150m / 5000 m/s = 0.06 s = 60,000 microseconds
    const pulseData: GuidedWavePulseData = {
      timeMicroseconds: [10, 30000, 60000, 100000, 160000],
      amplitudeVolts: [10.0, 0.02, 1.8, 0.01, 0.05], // Strong intermediate reflection at 60,000 us
    };

    const initialPeak = 10.0;
    const endEcho = 0.8; // Noticeable loss
    const assessment = sensor.assessAnnulusIntegrity(pulseData, initialPeak, endEcho);

    expect(assessment.annulusState).toBe("PARTIAL_ANNULUS_FLOODING");
    expect(assessment.floodFrontDistanceMeters).toBeCloseTo(150.0, 1);
    expect(assessment.floodedLengthPercentage).toBeCloseTo(62.5, 1); // (400 - 150)/400 = 62.5%
    expect(assessment.confidenceScore).toBeGreaterThan(0.9);
  });

  it("should trigger critical total flooding alert on severe acoustic wave dissipation", () => {
    const pulseData: GuidedWavePulseData = {
      timeMicroseconds: [10, 50000, 160000],
      amplitudeVolts: [10.0, 0.001, 0.0001],
    };

    const initialPeak = 10.0;
    const endEcho = 0.000001; // Massive attenuation (> 140 dB over 400m -> > 0.35 dB/m)
    const assessment = sensor.assessAnnulusIntegrity(pulseData, initialPeak, endEcho);

    expect(assessment.annulusState).toBe("CRITICAL_TOTAL_SUBSEA_FLOODING");
    expect(assessment.attenuationDbPerMeter).toBeGreaterThan(0.20);
    expect(assessment.floodedLengthPercentage).toBe(100.0);
    expect(assessment.inspectionCompliantApi17J).toBe(false);
  });
});
