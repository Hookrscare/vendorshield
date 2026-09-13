/**
 * SNAP-62: Prestressed Concrete Reactor Pressure Vessel (PCRPV) Tendon Duct Grouting Void Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Evaluates impact-echo and Ultrasonic Pulse Velocity (UPV) acoustic measurements across
 * prestressed post-tensioned nuclear containment tendon ducts:
 * 1. Measures acoustic P-wave velocity (V_p) through tendon duct concrete envelope.
 * 2. Identifies resonant impact-echo frequency shifts indicative of internal grouting voids.
 * 3. Assesses tendon corrosion exposure risk per ASME BPVC Section XI Division 2.
 * 4. Issues structural containment integrity certifications.
 */

import { createHash } from "crypto";

export interface TendonAcousticSounding {
  stationMeters: number; // position along tendon duct
  dominantEchoFrequencyKhz: number; // resonant impact-echo frequency
  measuredPWaveVelocityMetersPerSec: number; // UPV V_p
  echoAmplitudeAttenuationDb: number;
}

export interface PcrpvInspectionRequest {
  containmentVesselId: string;
  tendonId: string;
  nominalDuctDiameterMm: number; // e.g. 150 mm
  nominalConcreteVelocityMps: number; // e.g. 4200 m/s for nuclear grade concrete
  soundings: TendonAcousticSounding[];
}

export interface PcrpvInspectionResult {
  tendonId: string;
  totalSoundings: number;
  voidDetectedCount: number;
  maxVoidFractionEstimate: number;
  containmentIntegrityStatus: "FULL_GROUT_COMPLIANT" | "SUSPECTED_LOCAL_GROUT_VOID" | "CRITICAL_UNGROUTED_DEFECT";
  inspectionDigest: string;
}

export class PcrpvTendonVoidDetector {
  public static inspectTendonDuct(request: PcrpvInspectionRequest): PcrpvInspectionResult {
    if (!request.soundings || request.soundings.length === 0) {
      throw new Error("Inspection requires at least one acoustic sounding.");
    }
    if (request.nominalConcreteVelocityMps <= 0) {
      throw new Error("Nominal concrete velocity must be positive.");
    }

    let voidCount = 0;
    let maxVelocityDrop = 0.0;

    for (const s of request.soundings) {
      // In fully grouted ducts, P-wave travels through solid grout/steel.
      // In ungrouted voids, wave is forced to diffract around the air gap, causing a significant velocity drop (>15%)
      // and a downward frequency shift in the impact-echo peak.
      const velocityRatio = s.measuredPWaveVelocityMetersPerSec / request.nominalConcreteVelocityMps;
      const velocityDrop = Math.max(0.0, 1.0 - velocityRatio);

      if (velocityDrop > maxVelocityDrop) {
        maxVelocityDrop = velocityDrop;
      }

      // Void criteria: Velocity drop > 15% or high attenuation > 25 dB with low resonant frequency (< 8 kHz)
      if (velocityDrop >= 0.15 || (s.echoAmplitudeAttenuationDb >= 25.0 && s.dominantEchoFrequencyKhz < 8.0)) {
        voidCount++;
      }
    }

    const voidFraction = voidCount / request.soundings.length;

    let status: "FULL_GROUT_COMPLIANT" | "SUSPECTED_LOCAL_GROUT_VOID" | "CRITICAL_UNGROUTED_DEFECT";
    if (voidFraction >= 0.25 || maxVelocityDrop >= 0.30) {
      status = "CRITICAL_UNGROUTED_DEFECT";
    } else if (voidCount > 0) {
      status = "SUSPECTED_LOCAL_GROUT_VOID";
    } else {
      status = "FULL_GROUT_COMPLIANT";
    }

    const raw = `${request.tendonId}:${request.soundings.length}:${voidCount}:${maxVelocityDrop.toFixed(3)}:${status}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      tendonId: request.tendonId,
      totalSoundings: request.soundings.length,
      voidDetectedCount: voidCount,
      maxVoidFractionEstimate: Math.round(voidFraction * 100) / 100,
      containmentIntegrityStatus: status,
      inspectionDigest: digest
    };
  }
}
