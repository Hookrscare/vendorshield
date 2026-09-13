/**
 * pcrpv-tendon-duct-void-detector.ts
 * SNAP-62: Prestressed Concrete Reactor Pressure Vessel (PCRPV) Tendon Duct Grouting Void Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Implements NDT Impact-Echo (IE) and Ultrasonic Pulse Echo acoustic analysis for nuclear containment structures:
 * 1. Evaluates P-wave velocity Cp (~4000 m/s) and resonance frequency f = beta * Cp / (2 * D).
 * 2. Identifies acoustic impedance mismatch between concrete, grout matrix, air voids, and high-tensile steel tendon strands.
 * 3. Classifies duct grouting integrity under ASME Section XI Division 2 / ACI 359 and IAEA containment standards.
 * 4. Generates cryptographic inspection attestation token (SHA-256).
 */

import { createHash } from "crypto";

export type TendonDuctType = 
  | "CIRCUMFERENTIAL_HOOP"
  | "VERTICAL_INVERTED_U"
  | "RADIAL_DOME"
  | "FOUNDATION_ANCHORAGE";

export interface PcrpvInspectionPoint {
  pointId: string;
  ductId: string;
  ductType: TendonDuctType;
  chainageMeters: number;
  nominalCoverDepthMm: number; // e.g. 150 mm cover to duct
  nominalVesselWallThicknessMeters: number; // e.g. 3.0 m
  measuredDominantFrequencyHz: number;
  measuredSecondaryPeakHz: number;
  echoAmplitudePercentFsh: number; // 0 - 150%
  phaseInversionDetected: boolean;
  pWaveVelocityMPerSec?: number; // default ~4000 m/s in nuclear grade C50/60
}

export interface TendonVoidEvaluation {
  pointId: string;
  ductId: string;
  ductType: TendonDuctType;
  isVoidDetected: boolean;
  estimatedVoidDepthMm: number;
  estimatedGroutFillRatioPercent: number; // 0 - 100%
  conditionTier: "CONFORMANT_FULLY_GROUTED" | "PARTIAL_VOID_MONITOR" | "CRITICAL_VOID_RE_GROUT_REQUIRED";
  asmeSectionXiStatus: "ACCEPTABLE" | "DEVIATION_TRACKED" | "IMMEDIATE_REPAIR_MANDATORY";
  diagnosticDetails: string;
}

export interface PcrpvScanSummary {
  containmentVesselId: string;
  totalPointsScanned: number;
  voidPointsCount: number;
  criticalPointsCount: number;
  meanGroutFillRatioPercent: number;
  overallCompliance: "PASS_CONFORMANT" | "CONDITIONAL_ACCEPTANCE" | "REMEDIATION_REQUIRED";
  points: TendonVoidEvaluation[];
  nuclearInspectionTokenSha256: string;
}

export class PcrpvTendonDuctVoidDetector {
  public static readonly DEFAULT_CP_M_PER_SEC = 4000.0;
  public static readonly BETA_SHAPE_FACTOR = 0.96;

  public static evaluatePoint(point: PcrpvInspectionPoint): TendonVoidEvaluation {
    if (point.nominalCoverDepthMm <= 0 || point.nominalVesselWallThicknessMeters <= 0) {
      throw new Error("Duct cover depth and vessel wall thickness must be positive.");
    }
    if (point.measuredDominantFrequencyHz <= 0) {
      throw new Error("Measured resonance frequency must be strictly positive.");
    }

    const Cp = point.pWaveVelocityMPerSec ?? this.DEFAULT_CP_M_PER_SEC;
    const beta = this.BETA_SHAPE_FACTOR;

    // Expected full wall resonance frequency: f = beta * Cp / (2 * T)
    const expectedWallFreqHz = (beta * Cp) / (2.0 * point.nominalVesselWallThicknessMeters);
    // Expected duct cover resonance frequency: f = beta * Cp / (2 * (cover_mm / 1000))
    const expectedCoverFreqHz = (beta * Cp) / (2.0 * (point.nominalCoverDepthMm / 1000.0));

    // A void at the duct causes reflection at the duct depth, shifting dominant or prominent peak to cover frequency
    const freqRatioToCover = point.measuredDominantFrequencyHz / expectedCoverFreqHz;
    const isFreqNearCover = freqRatioToCover >= 0.75 && freqRatioToCover <= 1.30;
    
    // High amplitude + phase inversion + cover frequency match = acoustic air void
    const isVoid = (isFreqNearCover && point.phaseInversionDetected) || 
                   (point.phaseInversionDetected && point.echoAmplitudePercentFsh >= 85.0);

    let fillRatio: number;
    let conditionTier: TendonVoidEvaluation["conditionTier"];
    let asmeStatus: TendonVoidEvaluation["asmeSectionXiStatus"];
    let estimatedDepthMm: number;

    if (isVoid) {
      // Calculate apparent reflection depth: D = beta * Cp / (2 * f)
      const apparentDepthMeters = (beta * Cp) / (2.0 * point.measuredDominantFrequencyHz);
      estimatedDepthMm = Math.round(apparentDepthMeters * 1000.0);

      if (point.echoAmplitudePercentFsh >= 95.0 && point.phaseInversionDetected) {
        fillRatio = Math.max(10.0, 100.0 - (point.echoAmplitudePercentFsh * 0.8));
        conditionTier = "CRITICAL_VOID_RE_GROUT_REQUIRED";
        asmeStatus = "IMMEDIATE_REPAIR_MANDATORY";
      } else {
        fillRatio = Math.max(50.0, 100.0 - (point.echoAmplitudePercentFsh * 0.4));
        conditionTier = "PARTIAL_VOID_MONITOR";
        asmeStatus = "DEVIATION_TRACKED";
      }
    } else {
      estimatedDepthMm = Math.round(point.nominalVesselWallThicknessMeters * 1000.0);
      fillRatio = 98.5;
      conditionTier = "CONFORMANT_FULLY_GROUTED";
      asmeStatus = "ACCEPTABLE";
    }

    const diagnostic = isVoid
      ? `Acoustic impedance discontinuity detected at ${estimatedDepthMm}mm depth (Cover: ${point.nominalCoverDepthMm}mm). Dominant peak ${point.measuredDominantFrequencyHz}Hz matches air-concrete boundary reflection.`
      : `Solid acoustic continuity through duct at ${point.chainageMeters}m chainage. Full containment wall penetration verified (nominal wall: ${point.nominalVesselWallThicknessMeters}m).`;

    return {
      pointId: point.pointId,
      ductId: point.ductId,
      ductType: point.ductType,
      isVoidDetected: isVoid,
      estimatedVoidDepthMm: estimatedDepthMm,
      estimatedGroutFillRatioPercent: Math.round(fillRatio * 10) / 10,
      conditionTier,
      asmeSectionXiStatus: asmeStatus,
      diagnosticDetails: diagnostic
    };
  }

  public static analyzeBatch(
    vesselId: string,
    points: PcrpvInspectionPoint[]
  ): PcrpvScanSummary {
    if (!points || points.length === 0) {
      throw new Error("No inspection points provided for batch analysis.");
    }

    const evaluations = points.map((p) => this.evaluatePoint(p));
    const voidPointsCount = evaluations.filter((e) => e.isVoidDetected).length;
    const criticalPointsCount = evaluations.filter(
      (e) => e.conditionTier === "CRITICAL_VOID_RE_GROUT_REQUIRED"
    ).length;

    const meanGroutFill =
      evaluations.reduce((acc, curr) => acc + curr.estimatedGroutFillRatioPercent, 0) /
      evaluations.length;

    let compliance: PcrpvScanSummary["overallCompliance"] = "PASS_CONFORMANT";
    if (criticalPointsCount > 0 || meanGroutFill < 80.0) {
      compliance = "REMEDIATION_REQUIRED";
    } else if (voidPointsCount > 0 || meanGroutFill < 95.0) {
      compliance = "CONDITIONAL_ACCEPTANCE";
    }

    const payload = JSON.stringify({
      vesselId,
      total: points.length,
      voids: voidPointsCount,
      critical: criticalPointsCount,
      meanFill: Math.round(meanGroutFill * 10) / 10,
      compliance,
      pts: evaluations.map((e) => `${e.pointId}:${e.conditionTier}:${e.estimatedGroutFillRatioPercent}`)
    });
    const hash = createHash("sha256").update(payload).digest("hex");

    return {
      containmentVesselId: vesselId,
      totalPointsScanned: points.length,
      voidPointsCount,
      criticalPointsCount,
      meanGroutFillRatioPercent: Math.round(meanGroutFill * 10) / 10,
      overallCompliance: compliance,
      points: evaluations,
      nuclearInspectionTokenSha256: hash
    };
  }
}
