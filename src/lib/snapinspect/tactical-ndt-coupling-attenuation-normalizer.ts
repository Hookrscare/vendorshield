/**
 * tactical-ndt-coupling-attenuation-normalizer.ts
 * SNAP-143: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 *
 * Normalizes acoustic couplant attenuation and surface roughness scattering losses
 * across phased array ultrasonic testing (PAUT) telemetry for ASME Section V / ISO 16810 compliance.
 */

import { createHash } from "crypto";

export interface TransducerCouplingTelemetry {
  transducerId: string;
  probeCenterFrequencyMhz: number; // e.g. 5.0 MHz
  nominalMaterialVelocityMps: number; // e.g. 5900 m/s for carbon steel
  measuredSurfaceRoughnessRaMicrons: number; // e.g. 6.3 um Ra
  couplantType: "WATER_COLUMN" | "ULTRASONIC_GEL" | "HIGH_TEMP_PASTE" | "DRY_MEMBRANE";
  couplantThicknessNominalMm: number;
  rawEchoAmplitudePctFsh: number; // 0-100% Full Screen Height
  inspectionDepthMm: number;
}

export interface CouplingNormalizationResult {
  transducerId: string;
  roughnessScatteringLossDb: number;
  couplantAttenuationLossDb: number;
  totalCompensationGainDb: number;
  normalizedAmplitudePctFsh: number;
  couplingQualityGrade: "OPTIMAL" | "ACCEPTABLE_COMPENSATED" | "POOR_RECOUPLE_REQUIRED";
  asmeCompliantInspection: boolean;
  cadNormalizationToken: string;
}

export class TacticalNdtCouplingAttenuationNormalizer {
  /**
   * Evaluates surface roughness scatter and couplant attenuation to normalize PAUT flaw amplitudes.
   */
  public static normalizeCouplingTelemetry(
    telemetry: TransducerCouplingTelemetry
  ): CouplingNormalizationResult {
    if (telemetry.probeCenterFrequencyMhz <= 0) {
      throw new Error("Probe center frequency must be greater than zero.");
    }
    if (telemetry.nominalMaterialVelocityMps <= 0) {
      throw new Error("Nominal material velocity must be greater than zero.");
    }
    if (telemetry.measuredSurfaceRoughnessRaMicrons < 0) {
      throw new Error("Surface roughness Ra cannot be negative.");
    }
    if (telemetry.rawEchoAmplitudePctFsh < 0 || telemetry.rawEchoAmplitudePctFsh > 150) {
      throw new Error("Raw echo amplitude must be between 0% and 150% FSH.");
    }

    // 1. Calculate acoustic wavelength in material: lambda = v / f (in micrometers)
    // v in m/s = mm/ms, f in MHz = 10^6 1/s. lambda_mm = v_mps / (f_mhz * 1000)
    const wavelengthMicrons = (telemetry.nominalMaterialVelocityMps / (telemetry.probeCenterFrequencyMhz * 1e6)) * 1e6;

    // 2. Compute roughness-induced acoustic scattering loss (dB)
    // Formula: Loss_dB = 8.686 * (4 * pi * Ra / lambda)^2
    const roughnessRatio = (4 * Math.PI * telemetry.measuredSurfaceRoughnessRaMicrons) / wavelengthMicrons;
    const roughnessLossDb = Number((8.686 * Math.pow(Math.min(roughnessRatio, 1.2), 2)).toFixed(2));

    // 3. Compute couplant layer attenuation loss (dB)
    let couplantAttenuationCoeffDbPerMm = 0.5; // default gel
    if (telemetry.couplantType === "WATER_COLUMN") {
      couplantAttenuationCoeffDbPerMm = 0.2;
    } else if (telemetry.couplantType === "HIGH_TEMP_PASTE") {
      couplantAttenuationCoeffDbPerMm = 1.2;
    } else if (telemetry.couplantType === "DRY_MEMBRANE") {
      couplantAttenuationCoeffDbPerMm = 2.5;
    }

    const couplantLossDb = Number(
      (telemetry.couplantThicknessNominalMm * couplantAttenuationCoeffDbPerMm * (telemetry.probeCenterFrequencyMhz / 5.0)).toFixed(2)
    );

    const totalCompensationGainDb = Number((roughnessLossDb + couplantLossDb).toFixed(2));

    // 4. Amplitude gain adjustment: Amplitude_corr = Amplitude_raw * 10^(Gain_dB / 20)
    const linearGainMultiplier = Math.pow(10, totalCompensationGainDb / 20);
    const normalizedAmplitudePctFsh = Number(
      Math.min(150.0, telemetry.rawEchoAmplitudePctFsh * linearGainMultiplier).toFixed(1)
    );

    // 5. Grading and ASME Section V compliance check
    let couplingQualityGrade: "OPTIMAL" | "ACCEPTABLE_COMPENSATED" | "POOR_RECOUPLE_REQUIRED";
    let asmeCompliantInspection: boolean;

    if (totalCompensationGainDb < 4.0) {
      couplingQualityGrade = "OPTIMAL";
      asmeCompliantInspection = true;
    } else if (totalCompensationGainDb <= 14.0) {
      couplingQualityGrade = "ACCEPTABLE_COMPENSATED";
      asmeCompliantInspection = true;
    } else {
      couplingQualityGrade = "POOR_RECOUPLE_REQUIRED";
      asmeCompliantInspection = false; // Exceeds ASME Section V maximum compensation limit
    }

    const payload = `${telemetry.transducerId}:${totalCompensationGainDb}:${normalizedAmplitudePctFsh}:${couplingQualityGrade}`;
    const cadNormalizationToken = createHash("sha256").update(payload).digest("hex");

    return {
      transducerId: telemetry.transducerId,
      roughnessScatteringLossDb: roughnessLossDb,
      couplantAttenuationLossDb: couplantLossDb,
      totalCompensationGainDb,
      normalizedAmplitudePctFsh,
      couplingQualityGrade,
      asmeCompliantInspection,
      cadNormalizationToken,
    };
  }
}
