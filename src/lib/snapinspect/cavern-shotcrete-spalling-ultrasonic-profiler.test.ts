/**
 * src/lib/snapinspect/cavern-shotcrete-spalling-ultrasonic-profiler.test.ts
 * Tests for SNAP-71: Deep Underground Cavern Shotcrete Spalling Ultrasonic Resonance Profiler.
 */

import { describe, it, expect } from "vitest";
import {
  CavernShotcreteSpallingUltrasonicProfiler,
  ShotcreteLinerSpec,
  UltrasonicResonanceScan
} from "./cavern-shotcrete-spalling-ultrasonic-profiler";

describe("CavernShotcreteSpallingUltrasonicProfiler (SNAP-71)", () => {
  const spec: ShotcreteLinerSpec = {
    cavernSectionId: "CAVERN-UPHES-POWERHOUSE-STATION-4B",
    designShotcreteThicknessMm: 150.0,
    shotcreteCompressiveStrengthMpa: 40.0,
    nominalCompressionWaveVelocityMps: 3800.0, // 3800 m/s
    criticalDebondingThicknessRatioThreshold: 1.25
  };

  it("verifies secure acoustic bonding when energy dissipates into host rock", () => {
    // Highly damped, diffuse resonance (zeta = 0.12)
    const scan: UltrasonicResonanceScan = {
      sensorPointId: "SENSOR-P4-01",
      dominantResonanceFrequencyKhz: 6.2, // Apparent thickness = 3800 / (2 * 6.2) = 306 mm (> 2x shotcrete)
      spectralPeakAmplitudeDb: 18.0,
      acousticDampingRatioZeta: 0.12
    };

    const res = CavernShotcreteSpallingUltrasonicProfiler.evaluateResonance(spec, scan);

    expect(res.spallingRiskLevel).toBe("SECURE_ROCK_BONDING");
    expect(res.isInterfacialDebondingDetected).toBe(false);
    expect(res.geotechnicalRemediationAction).toContain("NORMAL");
    expect(res.inspectionAuditHash).toHaveLength(64);
  });

  it("identifies critical detached drum spalling when apparent thickness matches design with low damping", () => {
    // Resonance rings exactly at 150mm: f0 = 3800 / (2 * 0.150) = 12.667 kHz
    // Low damping (zeta = 0.018) -> classical detached hollow drum sound
    const scan: UltrasonicResonanceScan = {
      sensorPointId: "SENSOR-P4-CRITICAL-09",
      dominantResonanceFrequencyKhz: 12.667,
      spectralPeakAmplitudeDb: 42.0,
      acousticDampingRatioZeta: 0.018
    };

    const res = CavernShotcreteSpallingUltrasonicProfiler.evaluateResonance(spec, scan);

    expect(res.isInterfacialDebondingDetected).toBe(true);
    expect(res.apparentVibratingThicknessMm).toBeCloseTo(150.0, 1);
    expect(res.spallingRiskLevel).toBe("CRITICAL_SPALLING_ROCKBURST_IMMINENT");
    expect(res.geotechnicalRemediationAction).toContain("EMERGENCY");
    expect(res.geotechnicalRemediationAction).toContain("Evacuate zone");
  });

  it("detects early interfacial micro-void delamination under intermediate damping", () => {
    const scan: UltrasonicResonanceScan = {
      sensorPointId: "SENSOR-P4-WARN-03",
      dominantResonanceFrequencyKhz: 11.5, // ~165 mm
      spectralPeakAmplitudeDb: 28.0,
      acousticDampingRatioZeta: 0.045
    };

    const res = CavernShotcreteSpallingUltrasonicProfiler.evaluateResonance(spec, scan);

    expect(res.spallingRiskLevel).toBe("EARLY_INTERFACIAL_DELAMINATION");
    expect(res.geotechnicalRemediationAction).toContain("WARNING");
    expect(res.geotechnicalRemediationAction).toContain("extensometers");
  });
});
