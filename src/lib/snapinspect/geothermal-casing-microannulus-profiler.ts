/**
 * SNAP-65: Geothermal Well Casing High-Temperature Cement Sheath Micro-Annulus Ultrasonic Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Analyzes ultrasonic pulse-echo and pitch-catch radial logs in superheated geothermal wells (up to 300°C):
 * 1. Measures acoustic impedance (Z_cement in MRayls) across 360-degree casing circumference.
 * 2. Detects casing-cement de-bonding (micro-annulus gaps < 0.1 mm) caused by extreme thermal cycling.
 * 3. Identifies fluid migration channels (water/steam/gas intrusion behind casing).
 * 4. Issues casing integrity and zonal hydraulic isolation certificates.
 */

import { createHash } from "crypto";

export interface RadialAcousticSectorLog {
  sectorAngleDegrees: number; // 0 to 360 deg
  acousticImpedanceMRayls: number; // Gas < 0.1, Water ~1.5, Mud ~2.5, Cement > 3.0 MRayls
  casingResonanceAmplitudeDb: number;
}

export interface GeothermalWellInspectionRequest {
  wellId: string;
  depthMeters: number;
  boreholeTemperatureCelsius: number;
  nominalSteelImpedanceMRayls: number; // ~45 MRayls
  sectorLogs: RadialAcousticSectorLog[];
}

export interface GeothermalWellInspectionResult {
  wellId: string;
  depthMeters: number;
  averageCementImpedanceMRayls: number;
  bondedCoverageFraction: number;
  microAnnulusDetected: boolean;
  isolationStatus: "EXCELLENT_HYDRAULIC_ISOLATION" | "MICRO_ANNULUS_GAS_CHANNEL_RISK" | "SEVERE_DEBONDING_FAILURE";
  profilerDigest: string;
}

export class GeothermalCasingMicroAnnulusProfiler {
  public static evaluateCementSheath(
    request: GeothermalWellInspectionRequest
  ): GeothermalWellInspectionResult {
    if (!request.sectorLogs || request.sectorLogs.length === 0) {
      throw new Error("Must provide sector acoustic logs.");
    }
    if (request.boreholeTemperatureCelsius < 0 || request.boreholeTemperatureCelsius > 450) {
      throw new Error("Borehole temperature out of valid physical range.");
    }

    let totalImpedance = 0.0;
    let bondedSectors = 0;
    let channelSectors = 0;

    for (const log of request.sectorLogs) {
      totalImpedance += log.acousticImpedanceMRayls;

      // Solid geothermal cement has acoustic impedance >= 3.0 MRayls.
      // Liquid (water/mud) channel is ~1.5 to 2.5 MRayls.
      // Gas/steam micro-annulus gap is < 1.0 MRayls with high casing resonance amplitude (> 30 dB).
      if (log.acousticImpedanceMRayls >= 3.0) {
        bondedSectors++;
      } else if (log.acousticImpedanceMRayls < 1.5 || log.casingResonanceAmplitudeDb >= 30.0) {
        channelSectors++;
      }
    }

    const n = request.sectorLogs.length;
    const avgImpedance = Math.round((totalImpedance / n) * 100) / 100;
    const bondedFraction = Math.round((bondedSectors / n) * 100) / 100;
    const microAnnulusDetected = channelSectors > 0;

    let isolationStatus: "EXCELLENT_HYDRAULIC_ISOLATION" | "MICRO_ANNULUS_GAS_CHANNEL_RISK" | "SEVERE_DEBONDING_FAILURE";
    if (bondedFraction >= 0.80 && channelSectors === 0) {
      isolationStatus = "EXCELLENT_HYDRAULIC_ISOLATION";
    } else if (bondedFraction < 0.50 || channelSectors >= Math.ceil(n * 0.35)) {
      isolationStatus = "SEVERE_DEBONDING_FAILURE";
    } else {
      isolationStatus = "MICRO_ANNULUS_GAS_CHANNEL_RISK";
    }

    const raw = `${request.wellId}:${request.depthMeters}:${avgImpedance}:${bondedFraction}:${isolationStatus}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      wellId: request.wellId,
      depthMeters: request.depthMeters,
      averageCementImpedanceMRayls: avgImpedance,
      bondedCoverageFraction: bondedFraction,
      microAnnulusDetected,
      isolationStatus,
      profilerDigest: digest
    };
  }
}
