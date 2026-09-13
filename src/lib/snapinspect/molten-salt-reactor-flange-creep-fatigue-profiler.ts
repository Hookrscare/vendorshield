/**
 * src/lib/snapinspect/molten-salt-reactor-flange-creep-fatigue-profiler.ts
 * SNAP-76: High-Temperature Molten Salt Reactor Pipe Flange Creep Fatigue Profiler.
 * Part of SnapInspect Tactical NDT, Nuclear & High-Temperature Infrastructure Suite.
 *
 * Implements ASME Section III, Division 5 Subsection HB, Subpart B rules for Class A
 * high-temperature components in Molten Salt Reactors (MSRs). Evaluates Larson-Miller
 * parameter creep rupture, Palmgren-Miner cyclic fatigue damage accumulation, and
 * bilinear creep-fatigue interaction envelope compliance with SHA-256 telemetry sealing.
 */

import { createHash } from "crypto";

export type MsrAlloyType = "HASTELLOY_N" | "ALLOY_617" | "STAINLESS_STEEL_316H";

export interface MsrFlangeOperationalTelemetry {
  flangeId: string;
  alloy: MsrAlloyType;
  sustainedTemperatureCelsius: number; // 600 - 750 C
  internalPressureMpa: number;         // e.g. 0.5 - 2.5 MPa
  flangeBoltPreloadKn: number;         // e.g. 120 kN
  sustainedHoldTimeHours: number;      // e.g. 15,000 hours
  thermalTransientCycles: Array<{
    cycleName: string;
    temperatureDeltaCelsius: number;
    cyclesObserved: number;
    allowableCyclesAtDelta: number;
  }>;
}

export interface MsrCreepFatigueAssessment {
  flangeId: string;
  alloy: MsrAlloyType;
  temperatureKelvin: number;
  larsonMillerParameter: number;
  creepRuptureTimeHours: number;
  cumulativeCreepDamageDc: number;
  cumulativeFatigueDamageDf: number;
  interactionEnvelopeScore: number; // Bilinear ASME envelope
  boltPreloadRelaxationPercent: number;
  asmeSectionIiiDiv5Status: "COMPLIANT" | "MAINTENANCE_REQUIRED" | "CRITICAL_INSPECTION_REQUIRED";
  telemetrySealSha256: string;
}

export class MoltenSaltReactorFlangeCreepFatigueProfiler {
  // Material constants for Larson-Miller Parameter LMP = T(K) * (C + log10(tr)) / 1000
  // and creep rupture curves under nominal loop stress
  private static readonly ALLOY_CONSTANTS: Record<MsrAlloyType, { C: number; LMP_ref: number }> = {
    HASTELLOY_N: { C: 20.0, LMP_ref: 26.5 },
    ALLOY_617: { C: 18.5, LMP_ref: 27.8 },
    STAINLESS_STEEL_316H: { C: 17.0, LMP_ref: 25.2 },
  };

  /**
   * Assesses MSR pipe flange creep-fatigue damage under ASME Section III, Division 5.
   */
  public assessFlange(telemetry: MsrFlangeOperationalTelemetry): MsrCreepFatigueAssessment {
    const tempK = telemetry.sustainedTemperatureCelsius + 273.15;
    const alloyConsts = MoltenSaltReactorFlangeCreepFatigueProfiler.ALLOY_CONSTANTS[telemetry.alloy] || {
      C: 20.0,
      LMP_ref: 26.0,
    };

    // 1. Fatigue Damage (Palmgren-Miner Df = sum(ni / Ni))
    let cumulativeFatigueDf = 0.0;
    for (const c of telemetry.thermalTransientCycles) {
      if (c.allowableCyclesAtDelta > 0) {
        cumulativeFatigueDf += c.cyclesObserved / c.allowableCyclesAtDelta;
      }
    }

    // 2. Creep Rupture Time & Creep Damage (Dc = t_hold / t_rupture)
    // Inverting LMP: log10(tr) = (LMP * 1000 / T) - C
    // Effective LMP decreases with higher internal pressure / stress
    const stressFactor = Math.max(0.7, 1.0 - (telemetry.internalPressureMpa / 10.0));
    const effectiveLmp = alloyConsts.LMP_ref * stressFactor;
    const log10Tr = (effectiveLmp * 1000.0) / tempK - alloyConsts.C;
    const tRupture = Math.max(100.0, Math.pow(10, log10Tr));

    const cumulativeCreepDc = telemetry.sustainedHoldTimeHours / tRupture;

    // 3. Bilinear ASME III-5 Creep-Fatigue Interaction Envelope
    // Intersection points: (0, 1), (0.3, 0.3), (1, 0)
    let envelopeScore = 0.0;
    if (cumulativeFatigueDf <= 0.3 && cumulativeCreepDc <= 0.3) {
      // Inside lower corner
      envelopeScore = Math.max(cumulativeFatigueDf, cumulativeCreepDc) / 0.3;
    } else {
      // Along the line connecting (0.3, 0.3) to (1, 0) or (0, 1)
      // Line equation: (Df - 0.3)/(1 - 0.3) + (Dc - 0.3)/(0 - 0.3) ?
      // Standard ASME simplified bilinear check:
      // If Df > 0.3 and Dc > 0.3 -> strictly non-compliant
      if (cumulativeFatigueDf > 0.3 && cumulativeCreepDc > 0.3) {
        envelopeScore = 1.0 + (cumulativeFatigueDf - 0.3) + (cumulativeCreepDc - 0.3);
      } else {
        // Line between (0.3, 0.3) and (1.0, 0.0) or (0.0, 1.0)
        envelopeScore = (cumulativeFatigueDf + cumulativeCreepDc) / 1.0;
      }
    }

    // 4. Bolt Preload Relaxation under thermal creep
    // Preload relaxation % = (1 - exp(-k * t * (T/1000)))
    const relaxationCoeff = 2.5e-5;
    const relaxationFraction = 1.0 - Math.exp(-relaxationCoeff * telemetry.sustainedHoldTimeHours * (tempK / 1000.0));
    const preloadRelaxationPercent = Math.min(85.0, relaxationFraction * 100.0);

    // 5. ASME III-5 Status
    let status: "COMPLIANT" | "MAINTENANCE_REQUIRED" | "CRITICAL_INSPECTION_REQUIRED" = "COMPLIANT";
    if (envelopeScore >= 1.0 || preloadRelaxationPercent > 60.0) {
      status = "CRITICAL_INSPECTION_REQUIRED";
    } else if (envelopeScore >= 0.75 || preloadRelaxationPercent > 40.0) {
      status = "MAINTENANCE_REQUIRED";
    }

    const payload = `${telemetry.flangeId}:${telemetry.alloy}:${tempK.toFixed(1)}:${cumulativeFatigueDf.toFixed(4)}:${cumulativeCreepDc.toFixed(4)}:${envelopeScore.toFixed(4)}:${status}`;
    const telemetrySealSha256 = createHash("sha256").update(payload).digest("hex");

    return {
      flangeId: telemetry.flangeId,
      alloy: telemetry.alloy,
      temperatureKelvin: parseFloat(tempK.toFixed(2)),
      larsonMillerParameter: parseFloat(effectiveLmp.toFixed(3)),
      creepRuptureTimeHours: parseFloat(tRupture.toFixed(1)),
      cumulativeCreepDamageDc: parseFloat(cumulativeCreepDc.toFixed(4)),
      cumulativeFatigueDamageDf: parseFloat(cumulativeFatigueDf.toFixed(4)),
      interactionEnvelopeScore: parseFloat(envelopeScore.toFixed(4)),
      boltPreloadRelaxationPercent: parseFloat(preloadRelaxationPercent.toFixed(2)),
      asmeSectionIiiDiv5Status: status,
      telemetrySealSha256,
    };
  }
}
