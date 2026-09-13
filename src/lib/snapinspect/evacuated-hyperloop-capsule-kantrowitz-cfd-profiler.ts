/**
 * src/lib/snapinspect/evacuated-hyperloop-capsule-kantrowitz-cfd-profiler.ts
 * SNAP-76: Supersonic Evacuated Hyperloop Capsule Aerodynamic Drag & Shockwave Kantrowitz Limit CFD Profiler.
 * Part of SnapInspect AI Guideway & Evacuated Tube Infrastructure Monitoring Suite.
 *
 * Models compressible aerodynamics within low-pressure evacuated tubes (50 - 1500 Pa).
 * Evaluates capsule blockage ratio, computes 1D isentropic choked-flow Kantrowitz limit Mach number,
 * calculates detached bow shock drag spikes, stagnation temperature heating, and active compressor bypass requirements.
 */

import { createHash } from "crypto";

export interface HyperloopTelemetryInput {
  capsuleId: string;
  tubeDiameterMeters: number; // e.g. 4.0 m
  capsuleFrontalAreaM2: number; // e.g. 3.8 m2
  tubeStaticPressurePa: number; // e.g. 100 Pa (evacuated)
  ambientTemperatureK: number; // e.g. 293.15 K
  capsuleVelocityMps: number; // e.g. 280 m/s (~1000 km/h)
  compressorMassFlowKgS?: number; // active compression bypass
}

export type FlowRegime =
  | "SUB_KANTROWITZ_SUPERCRITICAL"
  | "OPTIMAL_BYPASS_SWALLOWED"
  | "CHOKED_NORMAL_SHOCK_PISTON";

export interface KantrowitzCfdProfile {
  capsuleId: string;
  blockageRatio: number;
  machNumber: number;
  speedOfSoundMps: number;
  kantrowitzLimitMach: number;
  flowRegime: FlowRegime;
  isShockwaveChoked: boolean;
  aerodynamicDragForceN: number;
  stagnationTemperatureK: number;
  stagnationTemperatureRiseK: number;
  requiredCompressorBypassKgS: number;
  propulsionSafetyStatus: "SAFE_NOMINAL" | "THERMAL_DRAG_WARNING" | "EMERGENCY_PROPULSION_TRIP";
  telemetryDigest: string;
}

export class EvacuatedHyperloopCapsuleKantrowitzCfdProfiler {
  private static readonly GAMMA = 1.4; // Diatomic ratio of specific heats for air
  private static readonly R_SPECIFIC = 287.05; // J/(kg*K) gas constant

  public profileCapsuleAerodynamics(input: HyperloopTelemetryInput): KantrowitzCfdProfile {
    if (input.tubeDiameterMeters <= 0 || input.capsuleFrontalAreaM2 <= 0) {
      throw new Error("Tube diameter and capsule frontal area must be strictly positive.");
    }
    if (input.tubeStaticPressurePa < 10 || input.tubeStaticPressurePa > 100000) {
      throw new Error("Tube static pressure must be between 10 Pa and 100,000 Pa.");
    }

    const tubeArea = Math.PI * Math.pow(input.tubeDiameterMeters / 2, 2);
    if (input.capsuleFrontalAreaM2 >= tubeArea) {
      throw new Error("Capsule frontal area cannot exceed or equal total tube cross-sectional area.");
    }

    const blockageRatio = input.capsuleFrontalAreaM2 / tubeArea;
    const bypassRatio = 1.0 - blockageRatio;

    // Speed of sound: a = sqrt(gamma * R * T)
    const a = Math.sqrt(
      EvacuatedHyperloopCapsuleKantrowitzCfdProfiler.GAMMA *
      EvacuatedHyperloopCapsuleKantrowitzCfdProfiler.R_SPECIFIC *
      input.ambientTemperatureK
    );
    const machNumber = input.capsuleVelocityMps / a;

    // Tube gas density: rho = P / (R * T)
    const rho = input.tubeStaticPressurePa / (EvacuatedHyperloopCapsuleKantrowitzCfdProfiler.R_SPECIFIC * input.ambientTemperatureK);

    // Kantrowitz limit calculation (approximate 1D isentropic relation for bypass area ratio)
    // A_bypass / A_tube = (1 / M) * [ (2 / (gamma + 1)) * (1 + (gamma - 1)/2 * M^2) ]^((gamma + 1)/(2*(gamma - 1)))
    // When solved for M, M_K is roughly proportional to bypassRatio^( (gamma - 1)/gamma )
    const kantrowitzLimitMach = this.calculateKantrowitzLimit(bypassRatio);

    const activeCompressorBypass = input.compressorMassFlowKgS ?? 0.0;
    // Effective Mach offset allowed by compressor swallowing frontal air
    const effectiveMach = machNumber - (activeCompressorBypass > 0 ? 0.15 : 0.0);

    const isShockwaveChoked = effectiveMach > kantrowitzLimitMach;

    let flowRegime: FlowRegime;
    let cd: number;

    if (isShockwaveChoked) {
      flowRegime = "CHOKED_NORMAL_SHOCK_PISTON";
      cd = 1.85 + 0.8 * (machNumber - kantrowitzLimitMach); // detached bow shock piston drag
    } else if (activeCompressorBypass > 0) {
      flowRegime = "OPTIMAL_BYPASS_SWALLOWED";
      cd = 0.12; // slender streamlined with swallowed boundary layer
    } else {
      flowRegime = "SUB_KANTROWITZ_SUPERCRITICAL";
      cd = 0.22;
    }

    // Drag force: F_d = 0.5 * rho * v^2 * Cd * A_frontal
    const dynamicPressure = 0.5 * rho * Math.pow(input.capsuleVelocityMps, 2);
    const aerodynamicDragForceN = dynamicPressure * cd * input.capsuleFrontalAreaM2;

    // Isentropic stagnation temperature: T0 = T * (1 + (gamma - 1)/2 * M^2)
    const stagnationTemperatureK = input.ambientTemperatureK * (
      1.0 + ((EvacuatedHyperloopCapsuleKantrowitzCfdProfiler.GAMMA - 1) / 2) * Math.pow(machNumber, 2)
    );
    const stagnationTemperatureRiseK = stagnationTemperatureK - input.ambientTemperatureK;

    // Theoretical compressor mass flow required to swallow shockwave: m_dot = rho * v * A_capsule * factor
    const requiredCompressorBypassKgS = isShockwaveChoked
      ? rho * input.capsuleVelocityMps * input.capsuleFrontalAreaM2 * 0.45
      : 0.0;

    let safetyStatus: "SAFE_NOMINAL" | "THERMAL_DRAG_WARNING" | "EMERGENCY_PROPULSION_TRIP";
    if (isShockwaveChoked && aerodynamicDragForceN > 15000) {
      safetyStatus = "EMERGENCY_PROPULSION_TRIP";
    } else if (isShockwaveChoked || stagnationTemperatureRiseK > 80.0) {
      safetyStatus = "THERMAL_DRAG_WARNING";
    } else {
      safetyStatus = "SAFE_NOMINAL";
    }

    const digestRaw = `${input.capsuleId}:${blockageRatio.toFixed(3)}:${machNumber.toFixed(2)}:${flowRegime}:${aerodynamicDragForceN.toFixed(1)}`;
    const telemetryDigest = createHash("sha256").update(digestRaw).digest("hex");

    return {
      capsuleId: input.capsuleId,
      blockageRatio: Number(blockageRatio.toFixed(4)),
      machNumber: Number(machNumber.toFixed(3)),
      speedOfSoundMps: Number(a.toFixed(1)),
      kantrowitzLimitMach: Number(kantrowitzLimitMach.toFixed(3)),
      flowRegime,
      isShockwaveChoked,
      aerodynamicDragForceN: Number(aerodynamicDragForceN.toFixed(2)),
      stagnationTemperatureK: Number(stagnationTemperatureK.toFixed(2)),
      stagnationTemperatureRiseK: Number(stagnationTemperatureRiseK.toFixed(2)),
      requiredCompressorBypassKgS: Number(requiredCompressorBypassKgS.toFixed(3)),
      propulsionSafetyStatus: safetyStatus,
      telemetryDigest,
    };
  }

  private calculateKantrowitzLimit(bypassRatio: number): number {
    // Solves 1D isentropic choked flow relation numerically for M in [0.01, 1.5]
    let low = 0.01;
    let high = 1.0;
    const g = EvacuatedHyperloopCapsuleKantrowitzCfdProfiler.GAMMA;
    const exp = (g + 1) / (2 * (g - 1));

    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      const term = (2 / (g + 1)) * (1 + ((g - 1) / 2) * mid * mid);
      const ratio = (1 / mid) * Math.pow(term, exp);
      const invRatio = 1.0 / ratio;

      if (invRatio < bypassRatio) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }
}
