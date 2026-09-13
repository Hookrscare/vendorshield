import { describe, it, expect } from "vitest";
import {
  EvacuatedHyperloopCapsuleKantrowitzCfdProfiler,
  HyperloopTelemetryInput,
} from "./evacuated-hyperloop-capsule-kantrowitz-cfd-profiler";

describe("EvacuatedHyperloopCapsuleKantrowitzCfdProfiler (SNAP-76)", () => {
  const profiler = new EvacuatedHyperloopCapsuleKantrowitzCfdProfiler();

  it("evaluates nominal sub-Kantrowitz flight in evacuated tube", () => {
    const input: HyperloopTelemetryInput = {
      capsuleId: "CAPSULE-ALPHA-01",
      tubeDiameterMeters: 4.5, // Area ~ 15.9 m2
      capsuleFrontalAreaM2: 3.5, // Blockage ~ 0.22, Bypass ~ 0.78
      tubeStaticPressurePa: 100, // 100 Pa low vacuum
      ambientTemperatureK: 293.15,
      capsuleVelocityMps: 120, // ~Mach 0.35
    };

    const profile = profiler.profileCapsuleAerodynamics(input);

    expect(profile.blockageRatio).toBeLessThan(0.3);
    expect(profile.machNumber).toBeLessThan(0.4);
    expect(profile.isShockwaveChoked).toBe(false);
    expect(profile.flowRegime).toBe("SUB_KANTROWITZ_SUPERCRITICAL");
    expect(profile.propulsionSafetyStatus).toBe("SAFE_NOMINAL");
    expect(profile.aerodynamicDragForceN).toBeGreaterThan(0);
    expect(profile.aerodynamicDragForceN).toBeLessThan(1000);
    expect(profile.telemetryDigest).toHaveLength(64);
  });

  it("detects choked flow and piston effect when exceeding Kantrowitz limit", () => {
    const chokedInput: HyperloopTelemetryInput = {
      capsuleId: "CAPSULE-BETA-02",
      tubeDiameterMeters: 3.2, // Area ~ 8.04 m2
      capsuleFrontalAreaM2: 5.0, // High Blockage ~ 0.62, Bypass ~ 0.38
      tubeStaticPressurePa: 500, // Higher pressure
      ambientTemperatureK: 293.15,
      capsuleVelocityMps: 300, // Mach ~0.87 (substantially exceeds Kantrowitz limit for this blockage)
    };

    const profile = profiler.profileCapsuleAerodynamics(chokedInput);

    expect(profile.isShockwaveChoked).toBe(true);
    expect(profile.flowRegime).toBe("CHOKED_NORMAL_SHOCK_PISTON");
    expect(profile.requiredCompressorBypassKgS).toBeGreaterThan(0);
    expect(profile.propulsionSafetyStatus).not.toBe("SAFE_NOMINAL");
  });

  it("allows optimal bypass swallowed flow when compressor mass flow is active", () => {
    const activeCompInput: HyperloopTelemetryInput = {
      capsuleId: "CAPSULE-GAMMA-03",
      tubeDiameterMeters: 4.0,
      capsuleFrontalAreaM2: 3.0,
      tubeStaticPressurePa: 100,
      ambientTemperatureK: 293.15,
      capsuleVelocityMps: 140,
      compressorMassFlowKgS: 0.8,
    };

    const profile = profiler.profileCapsuleAerodynamics(activeCompInput);

    expect(profile.flowRegime).toBe("OPTIMAL_BYPASS_SWALLOWED");
    expect(profile.isShockwaveChoked).toBe(false);
  });

  it("throws validation error for invalid geometric inputs", () => {
    expect(() => {
      profiler.profileCapsuleAerodynamics({
        capsuleId: "ERR",
        tubeDiameterMeters: 0,
        capsuleFrontalAreaM2: 5.0,
        tubeStaticPressurePa: 100,
        ambientTemperatureK: 293.15,
        capsuleVelocityMps: 100,
      });
    }).toThrow("Tube diameter and capsule frontal area must be strictly positive.");
  });
});
