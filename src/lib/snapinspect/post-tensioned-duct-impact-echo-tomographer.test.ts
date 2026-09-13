/**
 * SNAP-56: Unit tests for PostTensionedDuctImpactEchoTomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD Suite.
 */

import { describe, it, expect } from "vitest";
import {
  PostTensionedDuctImpactEchoTomographer,
  ConcreteProperties,
  TendonDuctGeometry,
  ImpactEchoProbeReading,
} from "./post-tensioned-duct-impact-echo-tomographer";

describe("SNAP-56: PostTensionedDuctImpactEchoTomographer", () => {
  const sampleConcrete: ConcreteProperties = {
    pWaveVelocityMps: 4000, // 4000 m/s
    slabThicknessM: 0.40,   // 400 mm
    shapeCorrectionBeta: 0.96,
  };

  const sampleDuct: TendonDuctGeometry = {
    ductId: "GIRDER-PT-04",
    ductDiameterMm: 100, // 100 mm diameter
    coverDepthM: 0.12,   // 120 mm cover
    lengthM: 10.0,       // 10 meters long
    material: "HIGH_DENSITY_POLYETHYLENE",
  };

  it("calculates nominal solid plate thickness resonance frequency correctly", () => {
    const tomographer = new PostTensionedDuctImpactEchoTomographer(sampleConcrete, sampleDuct);
    // f = (0.96 * 4000) / (2 * 0.40) = 3840 / 0.80 = 4800 Hz = 4.80 kHz
    expect(tomographer.calculateNominalSolidResonanceKhz()).toBe(4.8);
  });

  it("identifies fully grouted duct stations without frequency shifts", () => {
    const tomographer = new PostTensionedDuctImpactEchoTomographer(sampleConcrete, sampleDuct);

    // Reading matches solid thickness resonance closely (~4.85 kHz)
    const reading: ImpactEchoProbeReading = {
      stationOffsetM: 1.0,
      dominantFrequencyKhz: 4.85,
      spectralAmplitudeDb: 35,
    };

    const evaluation = tomographer.evaluateStation(reading);
    expect(evaluation.voidDetected).toBe(false);
    expect(evaluation.status).toBe("FULLY_GROUTED");
    expect(evaluation.frequencyShiftPercent).toBeLessThan(10);
  });

  it("detects void anomalies, classifies exposed strands, and computes grout remediation volume", () => {
    const tomographer = new PostTensionedDuctImpactEchoTomographer(sampleConcrete, sampleDuct);

    // High frequency peak around 15 kHz corresponds to reflection from duct top (~0.12m)
    // d = (0.96 * 4000) / (2 * 15000) = 3840 / 30000 = 0.128m
    const readings: ImpactEchoProbeReading[] = [
      { stationOffsetM: 1.0, dominantFrequencyKhz: 4.8, spectralAmplitudeDb: 32 }, // Solid
      { stationOffsetM: 2.0, dominantFrequencyKhz: 4.9, spectralAmplitudeDb: 31 }, // Solid
      { stationOffsetM: 3.0, dominantFrequencyKhz: 15.2, spectralAmplitudeDb: 38 }, // Void
      { stationOffsetM: 4.0, dominantFrequencyKhz: 15.5, spectralAmplitudeDb: 48 }, // Exposed strand
      { stationOffsetM: 5.0, dominantFrequencyKhz: 15.0, spectralAmplitudeDb: 36 }, // Void
      { stationOffsetM: 6.0, dominantFrequencyKhz: 4.8, spectralAmplitudeDb: 30 }, // Solid
    ];

    const report = tomographer.generateTendonReport(readings);

    expect(report.totalStationsChecked).toBe(6);
    expect(report.voidStationsCount).toBe(3);
    expect(report.voidPercentage).toBe(50.0);
    expect(report.maxVoidContinuousLengthM).toBeGreaterThanOrEqual(2.0);
    expect(report.structuralRiskRating).toBe("CRITICAL");
    expect(report.estimatedRemedialGroutVolumeLiters).toBeGreaterThan(0);

    const exposedStation = report.stationEvaluations.find((s) => s.stationOffsetM === 4.0);
    expect(exposedStation?.status).toBe("STRAND_EXPOSED");
  });
});
