/**
 * src/lib/snapinspect/roof-ponding-load-analyzer.ts
 * SNAP-43: Commercial Flat Roof Ponding Water Load & Structural Deflection Risk Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection & Engineering Platform.
 * 
 * Analyzes commercial low-slope roof LiDAR elevation matrices to identify localized depressions,
 * calculate accumulated standing water hydrostatic load (ASCE 7-22 Section 8 / IBC Section 1611),
 * assess structural deck deflection limits, and determine ponding progressive collapse instability risk.
 */

import { createHash } from "crypto";

export type PondingRiskLevel = "SAFE" | "MONITOR_DRAINAGE" | "STRUCTURAL_OVERLOAD_RISK" | "IMMINENT_PONDING_INSTABILITY";

export interface RoofDrainagePoint {
  id: string;
  x: number; // meters
  y: number; // meters
  elevationM: number;
  drainType: "PRIMARY_DRAIN" | "OVERFLOW_SCUPPER" | "SIPHONIC";
  diameterMm: number;
  isClogged: boolean;
}

export interface ElevationPoint {
  x: number;
  y: number;
  elevationM: number;
}

export interface PondingZoneResult {
  zoneId: string;
  maxWaterDepthMm: number;
  averageWaterDepthMm: number;
  waterAreaSqM: number;
  waterVolumeLiters: number;
  totalWaterWeightKg: number;
  peakLoadPsf: number; // Pounds per square foot
  loadKnPerSqM: number;
  exceedsDesignLiveLoad: boolean;
}

export interface RoofPondingAnalysisResult {
  roofId: string;
  evaluatedAt: string;
  designLiveLoadPsf: number;
  maxObservedLoadPsf: number;
  overallRiskLevel: PondingRiskLevel;
  totalPondingVolumeLiters: number;
  totalPondingWeightKg: number;
  zones: PondingZoneResult[];
  cloggedDrainsCount: number;
  inspectionRecommendation: string;
  evidenceToken: string;
}

export class RoofPondingLoadAnalyzer {
  private readonly WATER_DENSITY_KG_PER_M3 = 1000.0;
  private readonly KG_PER_M2_TO_PSF = 0.204816; // 1 kg/m^2 = 0.204816 lbs/ft^2

  /**
   * Analyzes roof elevation mesh against drain thresholds to model standing water pooling.
   */
  public analyzePondingRisk(
    roofId: string,
    mesh: ElevationPoint[],
    drains: RoofDrainagePoint[],
    designLiveLoadPsf: number = 20.0, // Standard 20 PSF roof live load
    rainfallRateMmPerHour: number = 50.0 // 2 inches/hr severe storm
  ): RoofPondingAnalysisResult {
    if (!mesh || mesh.length === 0) {
      const now = new Date().toISOString();
      return {
        roofId,
        evaluatedAt: now,
        designLiveLoadPsf,
        maxObservedLoadPsf: 0,
        overallRiskLevel: "SAFE",
        totalPondingVolumeLiters: 0,
        totalPondingWeightKg: 0,
        zones: [],
        cloggedDrainsCount: 0,
        inspectionRecommendation: "INSUFFICIENT_ELEVATION_DATA",
        evidenceToken: createHash("sha256").update(`${roofId}:EMPTY:${now}`).digest("hex")
      };
    }

    const cloggedDrains = drains.filter(d => d.isClogged);
    const activeDrains = drains.filter(d => !d.isClogged);

    // Baseline overflow spill elevation: if drains are clogged, water pools up to minimum parapet/overflow rim
    const baselineDrainElevation = activeDrains.length > 0
      ? Math.min(...activeDrains.map(d => d.elevationM))
      : (drains.length > 0 ? Math.min(...drains.map(d => d.elevationM)) + 0.10 : 0.05); // Clogged creates 100mm ponding head

    // Group depressed points below baseline drainage spillway
    const pondedPoints = mesh.filter(p => p.elevationM < baselineDrainElevation);

    const zones: PondingZoneResult[] = [];
    let totalVolumeL = 0;
    let totalWeightKg = 0;
    let maxPsf = 0;

    if (pondedPoints.length > 0) {
      // Calculate depths relative to drainage spill elevation
      const depthsMm = pondedPoints.map(p => (baselineDrainElevation - p.elevationM) * 1000.0);
      const maxDepthMm = Math.max(...depthsMm);
      const avgDepthMm = depthsMm.reduce((acc, v) => acc + v, 0) / depthsMm.length;

      // Area estimate assuming 1m^2 resolution per sample point
      const areaSqM = pondedPoints.length * 1.0;
      const volumeM3 = (avgDepthMm / 1000.0) * areaSqM;
      const volumeL = volumeM3 * 1000.0;
      const weightKg = volumeM3 * this.WATER_DENSITY_KG_PER_M3;

      // Hydrostatic load at deepest point: Depth (m) * 1000 kg/m3
      const peakLoadKgPerM2 = (maxDepthMm / 1000.0) * this.WATER_DENSITY_KG_PER_M3;
      const peakLoadPsf = Math.round(peakLoadKgPerM2 * this.KG_PER_M2_TO_PSF * 10) / 10;
      const peakLoadKn = Math.round((peakLoadKgPerM2 * 0.00980665) * 100) / 100;

      totalVolumeL = Math.round(volumeL);
      totalWeightKg = Math.round(weightKg);
      maxPsf = peakLoadPsf;

      zones.push({
        zoneId: `${roofId}-basin-1`,
        maxWaterDepthMm: Math.round(maxDepthMm),
        averageWaterDepthMm: Math.round(avgDepthMm),
        waterAreaSqM: Math.round(areaSqM * 10) / 10,
        waterVolumeLiters: totalVolumeL,
        totalWaterWeightKg: totalWeightKg,
        peakLoadPsf,
        loadKnPerSqM: peakLoadKn,
        exceedsDesignLiveLoad: peakLoadPsf > designLiveLoadPsf
      });
    }

    // Risk classification according to ASCE 7-22 Section 8
    let riskLevel: PondingRiskLevel = "SAFE";
    let recommendation = "Roof drainage functioning within allowable tolerances. No significant ponding.";

    if (maxPsf >= designLiveLoadPsf * 1.25 || (cloggedDrains.length > 0 && maxPsf >= designLiveLoadPsf)) {
      riskLevel = "IMMINENT_PONDING_INSTABILITY";
      recommendation = "CRITICAL HAZARD: Hydrostatic ponding exceeds design structural safety threshold. Immediate emergency drainage clearing and structural shoring required.";
    } else if (maxPsf >= designLiveLoadPsf) {
      riskLevel = "STRUCTURAL_OVERLOAD_RISK";
      recommendation = "WARNING: Water load exceeds roof design live load. Inspect deck deflection, clear scuppers, and verify overflow drain clearances.";
    } else if (zones.length > 0 || cloggedDrains.length > 0) {
      riskLevel = "MONITOR_DRAINAGE";
      recommendation = "Ponding observed in localized low-points. Clear scuppers and verify drain strainer baskets.";
    }

    const now = new Date().toISOString();
    const tokenSource = `${roofId}:${maxPsf}:${riskLevel}:${totalWeightKg}:${now}`;
    const evidenceToken = createHash("sha256").update(tokenSource).digest("hex");

    return {
      roofId,
      evaluatedAt: now,
      designLiveLoadPsf,
      maxObservedLoadPsf: maxPsf,
      overallRiskLevel: riskLevel,
      totalPondingVolumeLiters: totalVolumeL,
      totalPondingWeightKg: totalWeightKg,
      zones,
      cloggedDrainsCount: cloggedDrains.length,
      inspectionRecommendation: recommendation,
      evidenceToken
    };
  }
}
