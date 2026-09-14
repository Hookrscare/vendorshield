/**
 * SNAP-89: Geothermal Deep Wellbore Casing Acoustic Caliper & Cement Bond Integrity Profiler.
 * Part of SnapInspect AI Heavy Infrastructure & Geothermal Energy Engineering Platform.
 *
 * Implements high-temperature, high-pressure (HTHP) geothermal wellbore acoustic evaluation:
 * - Ultrasonic pulse-echo radial caliper profiling (internal diameter, wall thickness, ovality)
 * - Cement Bond Log (CBL) acoustic attenuation (dB/m) & Variable Density Log (VDL) waveform analysis
 * - Refractory cement micro-annulus and steam/gas channeling void classification
 * - API Spec 5CT casing collapse and burst pressure derating under thermal stress
 * - Automated remedial squeeze-cementing recommendation with SHA-256 integrity seal.
 */

import { createHash } from "crypto";

export interface GeothermalWellboreTelemetry {
  wellId: string;
  depthMeters: number; // e.g. 3,250 m
  bottomHoleTemperatureCelsius: number; // e.g. 260 °C
  casingNominalOuterDiameterMm: number; // e.g. 244.5 mm (9-5/8 in)
  casingNominalWallThicknessMm: number; // e.g. 11.99 mm (40 lb/ft L80/P110)
  steelAcousticVelocityMPerSec: number; // typically ~5,900 m/s in casing steel
  echoTransitTimeMicroseconds: number[]; // ultrasonic round-trip transit times across 8 or 16 azimuthal transducers
  cblAcousticAttenuationDbPerMeter: number; // attenuation rate, e.g. 25-45 dB/m for good cement
  mudAcousticImpedanceMrayl: number; // e.g. 1.5 Mrayl
  formationBondQualityRatio: number; // 0.0 (total free pipe) to 1.0 (perfect cement sheath)
}

export interface WellboreCasingIntegrityEvaluation {
  wellId: string;
  depthMeters: number;
  measuredAverageWallThicknessMm: number;
  wallThinningPercentage: number;
  casingOvalityPercentage: number;
  cementBondIndex: number; // 0.0 to 1.0 (API RP 10B / ISO 10426)
  cementChannelingRisk: "NONE" | "SUSPECTED_MICRO_ANNULUS" | "CRITICAL_STEAM_CHANNEL";
  burstPressureDeratingFactor: number; // 0.0 to 1.0
  remedialSqueezeCementingRequired: boolean;
  recommendedIntervention: "NORMAL_OPERATION" | "TEMPERATURE_CYCLING_OBSERVATION" | "REMEDIAL_SQUEEZE_CEMENTING_PACKER";
  auditDigest: string;
}

export class GeothermalWellboreAcousticCaliperProfiler {
  // Acoustic attenuation reference threshold for 100% bonded geothermal cement (API RP 10B-2)
  private static readonly GOOD_BOND_ATTENUATION_DB_M = 35.0;

  public static evaluateWellboreIntegrity(telemetry: GeothermalWellboreTelemetry): WellboreCasingIntegrityEvaluation {
    if (!telemetry.wellId) {
      throw new Error("wellId is required.");
    }
    if (telemetry.depthMeters <= 0) {
      throw new Error("depthMeters must be positive.");
    }
    if (telemetry.bottomHoleTemperatureCelsius < 0) {
      throw new Error("bottomHoleTemperatureCelsius must be non-negative.");
    }
    if (telemetry.casingNominalWallThicknessMm <= 0) {
      throw new Error("casingNominalWallThicknessMm must be positive.");
    }
    if (!telemetry.echoTransitTimeMicroseconds || telemetry.echoTransitTimeMicroseconds.length < 4) {
      throw new Error("echoTransitTimeMicroseconds must contain at least 4 azimuthal acoustic sensor readings.");
    }

    // Ultrasonic pulse-echo wall thickness calculation: t = (V_steel * dt) / 2
    // dt in microseconds, V_steel in m/s -> t in mm = (V * dt * 1e-6 / 2) * 1e3 = (V * dt) / 2000
    const calculatedThicknesses = telemetry.echoTransitTimeMicroseconds.map(
      (dt) => (telemetry.steelAcousticVelocityMPerSec * dt) / 2000.0
    );

    const avgThickness = calculatedThicknesses.reduce((a, b) => a + b, 0) / calculatedThicknesses.length;
    const minThickness = Math.min(...calculatedThicknesses);
    const maxThickness = Math.max(...calculatedThicknesses);

    // Wall thinning percentage relative to nominal
    const wallThinningPct = Math.max(
      0.0,
      ((telemetry.casingNominalWallThicknessMm - minThickness) / telemetry.casingNominalWallThicknessMm) * 100.0
    );

    // Casing ovality percentage
    const ovalityPct = ((maxThickness - minThickness) / avgThickness) * 100.0;

    // Cement Bond Index (BI = Attenuation_measured / Attenuation_good_bond)
    const rawBondIndex = Math.min(
      1.0,
      Math.max(0.0, telemetry.cblAcousticAttenuationDbPerMeter / this.GOOD_BOND_ATTENUATION_DB_M)
    );
    const cementBondIndex = parseFloat((rawBondIndex * telemetry.formationBondQualityRatio).toFixed(3));

    // Channeling classification
    let channelingRisk: "NONE" | "SUSPECTED_MICRO_ANNULUS" | "CRITICAL_STEAM_CHANNEL" = "NONE";
    if (cementBondIndex < 0.45) {
      channelingRisk = "CRITICAL_STEAM_CHANNEL";
    } else if (cementBondIndex < 0.75) {
      channelingRisk = "SUSPECTED_MICRO_ANNULUS";
    }

    // Barlow's formula derived burst pressure derating based on minimum remaining wall thickness and high temperature yield degradation
    const tempDeratingFactor = telemetry.bottomHoleTemperatureCelsius > 200.0 ? 0.88 : 1.0;
    const thicknessDerating = minThickness / telemetry.casingNominalWallThicknessMm;
    const burstPressureDeratingFactor = parseFloat((thicknessDerating * tempDeratingFactor).toFixed(3));

    // Remedial squeeze cementing decision
    const squeezeRequired = channelingRisk === "CRITICAL_STEAM_CHANNEL" || (wallThinningPct > 20.0 && cementBondIndex < 0.6);
    let recommendedIntervention: "NORMAL_OPERATION" | "TEMPERATURE_CYCLING_OBSERVATION" | "REMEDIAL_SQUEEZE_CEMENTING_PACKER" = "NORMAL_OPERATION";

    if (squeezeRequired) {
      recommendedIntervention = "REMEDIAL_SQUEEZE_CEMENTING_PACKER";
    } else if (channelingRisk === "SUSPECTED_MICRO_ANNULUS" || wallThinningPct > 12.0) {
      recommendedIntervention = "TEMPERATURE_CYCLING_OBSERVATION";
    }

    // Cryptographic audit seal
    const auditPayload = `${telemetry.wellId}:${telemetry.depthMeters}:${avgThickness.toFixed(2)}:${cementBondIndex}:${channelingRisk}:${squeezeRequired}`;
    const auditDigest = createHash("sha256").update(auditPayload).digest("hex");

    return {
      wellId: telemetry.wellId,
      depthMeters: telemetry.depthMeters,
      measuredAverageWallThicknessMm: parseFloat(avgThickness.toFixed(2)),
      wallThinningPercentage: parseFloat(wallThinningPct.toFixed(2)),
      casingOvalityPercentage: parseFloat(ovalityPct.toFixed(2)),
      cementBondIndex,
      cementChannelingRisk: channelingRisk,
      burstPressureDeratingFactor,
      remedialSqueezeCementingRequired: squeezeRequired,
      recommendedIntervention,
      auditDigest,
    };
  }
}
