/**
 * SNAP-74: Drone Thermal Orthomosaic Envelope R-Value Degradation Heatmap Engine.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 * 
 * Computes radiant and convective envelope heat flux, in-situ effective thermal resistance (R-value),
 * and percentage insulation degradation across aerial radiometric drone orthomosaic inspection zones.
 */

import { createHash } from "crypto";

export interface BuildingEnvelopeThermalParams {
  zoneId: string;
  designNominalRValueSi: number; // m^2 * K / W (e.g. R-20 US ~ 3.52 SI)
  surfaceEmissivity: number; // e.g. 0.90 for stucco / EIFS
  convectiveHeatTransferCoeff: number; // W / (m^2 * K), e.g. 15.0 for moderate wind
}

export interface EnvironmentalConditions {
  interiorTempCelsius: number; // e.g. 21.0 C
  exteriorAmbientTempCelsius: number; // e.g. 2.0 C
  exteriorSurfaceRadiometricTempCelsius: number; // e.g. 8.5 C (hot spot indicates heat loss)
  skyTempCelsius?: number; // defaults to ambient - 10 C
}

export interface ThermalRValueAssessment {
  zoneId: string;
  heatFluxWPerM2: number;
  effectiveRValueSi: number;
  rValueDegradationPercent: number;
  envelopeThermalHealthTier: "PRISTINE_INSULATION_CONTINUITY" | "MODERATE_THERMAL_BRIDGING_OR_SETTLING" | "SEVERE_MOISTURE_INTRUSION_OR_MISSING_INSULATION";
  requiresImmediateIntervention: boolean;
  verificationDigest: string;
}

export class DroneThermalEnvelopeRValueEngine {
  private static readonly STEFAN_BOLTZMANN = 5.670374419e-8; // W / (m^2 * K^4)

  public static evaluateZoneRValue(
    params: BuildingEnvelopeThermalParams,
    env: EnvironmentalConditions
  ): ThermalRValueAssessment {
    if (!params.zoneId || params.designNominalRValueSi <= 0) {
      throw new Error("Invalid zone parameters or nominal R-value.");
    }
    if (env.interiorTempCelsius <= env.exteriorAmbientTempCelsius) {
      throw new Error("Interior temperature must be greater than exterior ambient for heat loss audit.");
    }

    const tSurfK = env.exteriorSurfaceRadiometricTempCelsius + 273.15;
    const tAmbK = env.exteriorAmbientTempCelsius + 273.15;
    // Linearized radiative exchange coefficient: h_r = 4 * eps * sigma * T_amb^3
    const hRad = 4.0 * params.surfaceEmissivity * this.STEFAN_BOLTZMANN * Math.pow(tAmbK, 3);
    const hCombined = params.convectiveHeatTransferCoeff + hRad;

    // Exterior surface heat flux: q = h_combined * (T_surf - T_ambient)
    const deltaTSurfAmb = Math.max(0.01, env.exteriorSurfaceRadiometricTempCelsius - env.exteriorAmbientTempCelsius);
    const totalHeatFlux = Math.max(0.5, hCombined * deltaTSurfAmb);

    // Effective R-value: R_eff = (T_int - T_surf) / q
    const deltaTTotal = env.interiorTempCelsius - env.exteriorSurfaceRadiometricTempCelsius;
    const effectiveRValueSi = Number(Math.max(0.05, deltaTTotal / totalHeatFlux).toFixed(2));

    // Degradation percentage vs design nominal
    const degradation = Math.max(
      0.0,
      ((params.designNominalRValueSi - effectiveRValueSi) / params.designNominalRValueSi) * 100.0
    );
    const rValueDegradationPercent = Number(degradation.toFixed(1));

    let tier: ThermalRValueAssessment["envelopeThermalHealthTier"] = "PRISTINE_INSULATION_CONTINUITY";
    if (rValueDegradationPercent >= 40.0) {
      tier = "SEVERE_MOISTURE_INTRUSION_OR_MISSING_INSULATION";
    } else if (rValueDegradationPercent >= 15.0) {
      tier = "MODERATE_THERMAL_BRIDGING_OR_SETTLING";
    }

    const requiresImmediateIntervention = tier === "SEVERE_MOISTURE_INTRUSION_OR_MISSING_INSULATION";

    const raw = `${params.zoneId}:${effectiveRValueSi}:${rValueDegradationPercent}:${tier}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      zoneId: params.zoneId,
      heatFluxWPerM2: Number(totalHeatFlux.toFixed(2)),
      effectiveRValueSi,
      rValueDegradationPercent,
      envelopeThermalHealthTier: tier,
      requiresImmediateIntervention,
      verificationDigest: digest
    };
  }
}
