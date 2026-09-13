/**
 * SNAP-82: Liquefied CO2 Geological Sequestration Wellbore Integrity Microannulus Acoustic Sensor.
 * Part of SnapInspect AI Tactical NDT & Heavy Industry Inspection Engine.
 *
 * Simulates and analyzes ultrasonic pulse-echo and shear-wave acoustic impedance logging
 * across carbon capture and sequestration (CCS) injection wellbores:
 * - Steel casing / Portland cement / rock formation interface
 * - Microannulus aperture detection (10 - 150 um) from thermal shock (scCO2 cooling)
 * - Carbonic acid (H2CO3) cement debonding and acoustic impedance loss
 * - Acoustic Bond Index (ABI) and vertical migration risk assessment
 */

import { createHash } from "crypto";

export interface WellboreAcousticProbeReading {
  depthMeters: number;
  measuredAcousticImpedanceMRayl: number; // MRayl (10^6 kg/(m^2*s))
  casingWallThicknessMm: number;
  apparentMicroannulusApertureMicrons: number; // um
  casingResonanceAmplitudeMv: number; // mV
  freePipeAmplitudeMv: number; // mV (~ 75 - 100 mV)
  goodBondAmplitudeMv: number; // mV (~ 2 - 5 mV)
}

export interface WellboreZoneEvaluation {
  depthMeters: number;
  acousticBondIndex: number; // 0.0 to 1.0
  microannulusApertureMicrons: number;
  cementDebondingSeverity: "NONE" | "MINOR_MICROANNULUS" | "SEVERE_DEBONDING" | "CO2_FLUID_CHANNEL";
  containmentIntegrityStatus: "SECURE" | "ELEVATED_RISK" | "BREACH_PRONE";
}

export interface CcsWellboreIntegrityProfile {
  wellboreId: string;
  injectionReservoirName: string;
  cumulativeInjectedMetricTonsCO2: number;
  probes: WellboreAcousticProbeReading[];
}

export interface CcsWellboreIntegrityReport {
  wellboreId: string;
  overallAcousticBondIndex: number; // Average ABI
  maximumMicroannulusMicrons: number;
  criticalLeakPathDetected: boolean;
  zoneEvaluations: WellboreZoneEvaluation[];
  remediationRecommendation: string;
  integrityHash: string;
  analyzedAt: string;
}

export class LiquefiedCo2WellboreMicroannulusSensor {
  // Acoustic impedance references in MRayls
  public static readonly Z_STEEL = 46.0;
  public static readonly Z_INTACT_CEMENT = 8.2;
  public static readonly Z_SC_CO2 = 0.85;

  public static evaluateWellboreIntegrity(profile: CcsWellboreIntegrityProfile): CcsWellboreIntegrityReport {
    if (!profile.wellboreId || !profile.injectionReservoirName) {
      throw new Error("Invalid wellbore profile: wellboreId and injectionReservoirName are required.");
    }
    if (!profile.probes || profile.probes.length === 0) {
      throw new Error("Invalid wellbore profile: probes array cannot be empty.");
    }

    const zoneEvaluations: WellboreZoneEvaluation[] = [];
    let abiSum = 0;
    let maxAperture = 0;
    let criticalPathCount = 0;

    for (const probe of profile.probes) {
      // Acoustic Bond Index: ABI = (A_free - A_measured) / (A_free - A_good)
      const denominator = Math.max(1.0, probe.freePipeAmplitudeMv - probe.goodBondAmplitudeMv);
      const rawAbi = (probe.freePipeAmplitudeMv - probe.casingResonanceAmplitudeMv) / denominator;
      const abi = Math.max(0.0, Math.min(1.0, Number(rawAbi.toFixed(3))));

      abiSum += abi;
      if (probe.apparentMicroannulusApertureMicrons > maxAperture) {
        maxAperture = probe.apparentMicroannulusApertureMicrons;
      }

      let debonding: WellboreZoneEvaluation["cementDebondingSeverity"] = "NONE";
      let status: WellboreZoneEvaluation["containmentIntegrityStatus"] = "SECURE";

      if (probe.apparentMicroannulusApertureMicrons > 60 || abi < 0.40) {
        debonding = "CO2_FLUID_CHANNEL";
        status = "BREACH_PRONE";
        criticalPathCount++;
      } else if (probe.apparentMicroannulusApertureMicrons > 25 || abi < 0.65) {
        debonding = "SEVERE_DEBONDING";
        status = "ELEVATED_RISK";
      } else if (probe.apparentMicroannulusApertureMicrons > 10 || abi < 0.80) {
        debonding = "MINOR_MICROANNULUS";
        status = "SECURE";
      }

      zoneEvaluations.push({
        depthMeters: probe.depthMeters,
        acousticBondIndex: abi,
        microannulusApertureMicrons: probe.apparentMicroannulusApertureMicrons,
        cementDebondingSeverity: debonding,
        containmentIntegrityStatus: status
      });
    }

    const avgAbi = Number((abiSum / profile.probes.length).toFixed(3));
    const criticalLeakPathDetected = criticalPathCount > 0;

    let remediationRecommendation = "NOMINAL: Wellbore integrity complies with EPA Class VI CCS standards.";
    if (criticalLeakPathDetected) {
      remediationRecommendation = "URGENT: Microannulus fluid channel detected. Halt injection and execute squeeze cementing.";
    } else if (maxAperture > 25) {
      remediationRecommendation = "MAINTENANCE: Secondary microannulus detected. Reduce injection pressure and run quarterly acoustic logs.";
    }

    const digestPayload = `${profile.wellboreId}:${avgAbi}:${maxAperture}:${criticalLeakPathDetected}:${profile.cumulativeInjectedMetricTonsCO2}`;
    const integrityHash = createHash("sha256").update(digestPayload).digest("hex");

    return {
      wellboreId: profile.wellboreId,
      overallAcousticBondIndex: avgAbi,
      maximumMicroannulusMicrons: maxAperture,
      criticalLeakPathDetected,
      zoneEvaluations,
      remediationRecommendation,
      integrityHash,
      analyzedAt: new Date().toISOString()
    };
  }
}
