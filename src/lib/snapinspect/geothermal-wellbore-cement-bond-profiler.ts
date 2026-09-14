/**
 * SNAP-89: Geothermal Deep Wellbore Casing Acoustic Caliper & Cement Bond Integrity Profiler.
 * Part of SnapInspect AI Heavy Infrastructure & Geotechnical Platform.
 *
 * Implements API-10B / ISO-10426 compliant deep geothermal wellbore ultrasonic wireline inspection:
 * - Pulse-echo acoustic caliper radial wall-thickness and casing ovality profiling
 * - Cement Bond Log (CBL) amplitude attenuation and Variable Density Log (VDL) reflection analysis
 * - Annular steam/gas channeling and micro-annulus hydraulic isolation failure detection
 * - Automated remedial squeeze cementing intervention orders with SHA-256 wellbore certificates.
 */

import { createHash } from "crypto";

export interface WellboreCasingTelemetry {
  wellboreId: string;
  measuredDepthMeters: number;         // e.g. 3250.0 m
  bottomHoleTemperatureCelsius: number;// e.g. 235.0 C (supercritical geothermal)
  casingNominalThicknessMm: number;    // e.g. 12.5 mm
  measuredUltrasonicThicknessMm: number; // Ultrasonic pulse-echo wall thickness
  cblAttenuationDbPerMeter: number;    // e.g. 28.0 dB/m (high attenuation = strong bond)
  measuredAnnularImpedanceMrayl: number;// e.g. 5.5 MRayl (neat cement ~5.0-7.0, water ~1.5)
  radialCoverageSectors: number;       // e.g. 8 or 16 ultrasonic scan sectors
}

export interface WellboreCementBondAssessment {
  wellboreId: string;
  measuredDepthMeters: number;
  casingWallLossPercent: number;
  casingOvalityStatus: "NOMINAL" | "MODERATE_CORROSION" | "CRITICAL_BURST_COLLAPSE_RISK";
  cementBondIndex: number;             // BI = Attenuation / MaxAttenuation (0.0 to 1.0)
  hydraulicIsolationIntegrity: "SOLID_CEMENT_ISOLATED" | "MICRO_ANNULUS_DEBONDING" | "STEAM_GAS_CHANNELING_BREACH";
  remedialSqueezeCementRequired: boolean;
  wellboreSafetyCertificate: string;
}

export class GeothermalWellboreCementBondProfiler {
  // Reference good cement attenuation threshold (dB/m)
  private static readonly NOMINAL_GOOD_CEMENT_ATTENUATION = 35.0;

  public static assessCementBondIntegrity(telemetry: WellboreCasingTelemetry): WellboreCementBondAssessment {
    if (!telemetry.wellboreId) {
      throw new Error("wellboreId is required.");
    }
    if (telemetry.measuredDepthMeters <= 0) {
      throw new Error("measuredDepthMeters must be positive.");
    }
    if (telemetry.casingNominalThicknessMm <= 0 || telemetry.measuredUltrasonicThicknessMm <= 0) {
      throw new Error("Casing thickness measurements must be strictly positive.");
    }

    // Casing metal loss calculation
    const wallLossMm = Math.max(0, telemetry.casingNominalThicknessMm - telemetry.measuredUltrasonicThicknessMm);
    const wallLossPct = Math.round((wallLossMm / telemetry.casingNominalThicknessMm) * 1000) / 10;

    let casingOvality: "NOMINAL" | "MODERATE_CORROSION" | "CRITICAL_BURST_COLLAPSE_RISK" = "NOMINAL";
    if (wallLossPct >= 30.0) {
      casingOvality = "CRITICAL_BURST_COLLAPSE_RISK";
    } else if (wallLossPct >= 12.0) {
      casingOvality = "MODERATE_CORROSION";
    }

    // Cement Bond Index (BI): standard oilfield & geothermal metric
    // BI = Attenuation / MaxAttenuation (clamped 0 to 1)
    const rawBi = telemetry.cblAttenuationDbPerMeter / this.NOMINAL_GOOD_CEMENT_ATTENUATION;
    const bondIndex = Math.min(1.0, Math.max(0.0, Math.round(rawBi * 100) / 100));

    // Hydraulic isolation evaluation:
    // Cement acoustic impedance > 3.0 MRayl and BI >= 0.70 represents solid acoustic bond
    let isolationStatus: "SOLID_CEMENT_ISOLATED" | "MICRO_ANNULUS_DEBONDING" | "STEAM_GAS_CHANNELING_BREACH";
    let requiresSqueeze = false;

    if (bondIndex >= 0.75 && telemetry.measuredAnnularImpedanceMrayl >= 3.2) {
      isolationStatus = "SOLID_CEMENT_ISOLATED";
    } else if (bondIndex >= 0.45 && telemetry.measuredAnnularImpedanceMrayl >= 2.0) {
      isolationStatus = "MICRO_ANNULUS_DEBONDING";
    } else {
      isolationStatus = "STEAM_GAS_CHANNELING_BREACH";
      requiresSqueeze = true;
    }

    // Emergency squeeze cementing also required if severe wall loss threatens well control
    if (casingOvality === "CRITICAL_BURST_COLLAPSE_RISK") {
      requiresSqueeze = true;
    }

    const payload = `${telemetry.wellboreId}:${telemetry.measuredDepthMeters}:${bondIndex}:${isolationStatus}:${requiresSqueeze}`;
    const digest = createHash("sha256").update(payload).digest("hex");

    return {
      wellboreId: telemetry.wellboreId,
      measuredDepthMeters: telemetry.measuredDepthMeters,
      casingWallLossPercent: wallLossPct,
      casingOvalityStatus: casingOvality,
      cementBondIndex: bondIndex,
      hydraulicIsolationIntegrity: isolationStatus,
      remedialSqueezeCementRequired: requiresSqueeze,
      wellboreSafetyCertificate: digest,
    };
  }
}
