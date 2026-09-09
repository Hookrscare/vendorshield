import { describe, it, expect } from "vitest";
import {
  UltrasonicWeldFlawImager,
  UltrasonicEchoSample
} from "./ultrasonic-weld-flaw-imager";

describe("SNAP-35: High-Precision Ultrasonic Metal Weld Flaw Sizing & B-Scan Imager", () => {
  const imager = new UltrasonicWeldFlawImager(25.0, {
    frequencyMhz: 2.25,
    wedgeAngleDeg: 60,
    shearWaveVelocityMPerSec: 3240, // 3.24 mm/us
    referenceLevelDb: 50.0,
    attenuationFactorDb: 2.0
  });

  it("accurately projects Leg 1 sound path, surface distance, and true depth", () => {
    // 60 deg probe, time of flight = 12.35 us -> soundPath = 3.24 * 12.35 / 2 = ~20.0 mm
    // surfaceDistance = 20 * sin(60) = ~17.32 mm
    // depth = 20 * cos(60) = ~10.0 mm (< 25 mm -> Leg 1)
    const geo = imager.calculateGeometricProjection(12.35);

    expect(geo.soundPathMm).toBeCloseTo(20.0, 1);
    expect(geo.surfaceDistanceMm).toBeCloseTo(17.32, 1);
    expect(geo.trueDepthMm).toBeCloseTo(10.0, 1);
    expect(geo.skipLeg).toBe(1);
  });

  it("accurately handles Leg 2 backwall skip reflection", () => {
    // Sound path = 60.0 mm -> rawDepth = 60 * cos(60) = 30.0 mm (> 25mm thickness)
    // trueDepth = 2 * 25 - 30 = 20.0 mm from top surface
    // time of flight = (60 * 2) / 3.24 = 37.04 us
    const geo = imager.calculateGeometricProjection(37.04);

    expect(geo.skipLeg).toBe(2);
    expect(geo.trueDepthMm).toBeCloseTo(20.0, 1);
  });

  it("detects, sizes, and flags an AWS D1.1 rejectable weld root crack", () => {
    // Linear scan along weld from X = 100mm to X = 125mm with strong echo
    const samples: UltrasonicEchoSample[] = [
      { scanPositionMm: 100.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 46.0 },
      { scanPositionMm: 104.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 54.0 },
      { scanPositionMm: 108.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 58.0 }, // Peak
      { scanPositionMm: 114.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 55.0 },
      { scanPositionMm: 120.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 52.0 },
      { scanPositionMm: 124.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 45.0 }
    ];

    const result = imager.analyzeWeldInspection("BUTT_JOINT", samples);

    expect(result.weldThicknessMm).toBe(25.0);
    expect(result.flaws).toHaveLength(1);

    const flaw = result.flaws[0];
    expect(flaw.peakAmplitudeDb).toBe(58.0);
    // Indication rating: 58 - 50 (ref) - 2 (attenuation) = +6 dB
    expect(flaw.indicationRatingDb).toBe(6.0);
    expect(flaw.awsClassification).toBe("CLASS_A_REJECT");
    expect(flaw.isRejectable).toBe(true);
    expect(flaw.lengthMm).toBeGreaterThanOrEqual(16.0);
    expect(result.bScanGridPoints.length).toBe(6);
  });

  it("correctly classifies minor porosity clusters as acceptable Class D", () => {
    const samples: UltrasonicEchoSample[] = [
      { scanPositionMm: 50.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 38.0 },
      { scanPositionMm: 52.0, timeOfFlightMicroseconds: 12.35, amplitudeDb: 40.0 }
    ];

    const result = imager.analyzeWeldInspection("TEE_JOINT", samples);
    expect(result.flaws).toHaveLength(1);
    const flaw = result.flaws[0];
    expect(flaw.awsClassification).toBe("CLASS_D_MINOR_ACCEPT");
    expect(flaw.isRejectable).toBe(false);
  });
});
