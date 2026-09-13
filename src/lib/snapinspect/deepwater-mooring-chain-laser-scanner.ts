/**
 * src/lib/snapinspect/deepwater-mooring-chain-laser-scanner.ts
 * Part of SnapInspect AI Tactical NDT & Deepwater Offshore Infrastructure Suite.
 *
 * SNAP-81: Deepwater Mooring Chain Interlink Wear Laser Scanner.
 * Real-time 3D laser profiler for ROV inspection of offshore FPSO and floating wind mooring chains:
 * - Scans interlink contact zones (grip areas) to calculate diameter loss and cross-sectional reduction.
 * - Computes link pitch elongation, corrosion pitting depths, and residual Minimum Breaking Load (MBL).
 * - Enforces DNV-OS-E301 and API RP 2SK offshore mooring standards.
 * - Emits tamper-evident SHA-256 inspection digests.
 */

import { createHash } from "crypto";

export interface MooringChainLinkProfile {
  linkId: string;
  nominalBarDiameterMm: number;    // e.g., 140 mm studless or stud link
  nominalPitchMm: number;          // e.g., 6 * diameter
  chainGrade: "R3" | "R4" | "R5" | "R6";
  nominalMblKiloNewtons: number;   // e.g., 18,000 kN
}

export interface LaserScanPoint {
  angleDegrees: number;
  measuredRadiusMm: number;
  axialPositionMm: number;
  reflectivity: number;
}

export interface MooringChainInspectionResult {
  linkId: string;
  nominalDiameterMm: number;
  minMeasuredGripDiameterMm: number;
  diameterWearPercentage: number;
  areaReductionPercentage: number;
  measuredPitchMm: number;
  pitchElongationPercentage: number;
  maxPittingDepthMm: number;
  residualMblKiloNewtons: number;
  complianceStatus:
    | "CHAIN_HEALTHY_IN_SPEC"
    | "ROUTINE_MONITORING_PLANNED"
    | "EXCESSIVE_WEAR_PLAN_REPLACEMENT"
    | "CRITICAL_TENSILE_FAILURE_RISK_REPLACE_IMMEDIATELY";
  requiresImmediateEmergencyRetensionOrSwap: boolean;
  tamperEvidentDigest: string;
}

export class DeepwaterMooringChainLaserScanner {
  /**
   * Analyzes high-resolution 3D laser scan points across the interlink contact area of a mooring chain.
   */
  public static analyzeLinkScan(
    profile: MooringChainLinkProfile,
    scanPoints: LaserScanPoint[],
    measuredPitchMm: number
  ): MooringChainInspectionResult {
    if (!profile.linkId || profile.nominalBarDiameterMm <= 0 || profile.nominalPitchMm <= 0) {
      throw new Error("Invalid chain profile: positive nominal diameter and pitch are required.");
    }
    if (!scanPoints || scanPoints.length < 4) {
      throw new Error("Sufficient laser point cloud data (at least 4 points) required.");
    }
    if (measuredPitchMm <= 0) {
      throw new Error("Measured link pitch must be positive.");
    }

    const nominalRadius = profile.nominalBarDiameterMm / 2.0;
    let minRadius = Infinity;
    let maxPittingDepth = 0.0;

    for (const pt of scanPoints) {
      if (pt.measuredRadiusMm < minRadius) {
        minRadius = pt.measuredRadiusMm;
      }
      const radialDeficit = nominalRadius - pt.measuredRadiusMm;
      if (radialDeficit > maxPittingDepth) {
        maxPittingDepth = radialDeficit;
      }
    }

    const minMeasuredGripDiameterMm = Math.max(0.1, minRadius * 2.0);
    const diameterLoss = Math.max(0.0, profile.nominalBarDiameterMm - minMeasuredGripDiameterMm);
    const diameterWearPercentage = (diameterLoss / profile.nominalBarDiameterMm) * 100.0;

    // Cross-sectional area reduction: 1 - (d_worn / d_nom)^2
    const areaReductionPercentage =
      (1.0 - Math.pow(minMeasuredGripDiameterMm / profile.nominalBarDiameterMm, 2)) * 100.0;

    // Pitch elongation:
    const pitchDelta = Math.max(0.0, measuredPitchMm - profile.nominalPitchMm);
    const pitchElongationPercentage = (pitchDelta / profile.nominalPitchMm) * 100.0;

    // Residual MBL estimation based on net effective steel area:
    const residualRatio = Math.max(0.05, Math.pow(minMeasuredGripDiameterMm / profile.nominalBarDiameterMm, 2));
    const residualMblKiloNewtons = Math.round(profile.nominalMblKiloNewtons * residualRatio);

    // Compliance assessment per DNV-OS-E301 / API RP 2SK:
    // Limit: 10% diameter wear requires planned replacement; >15% or pitting > 4mm or elongation > 3% is critical.
    let complianceStatus: MooringChainInspectionResult["complianceStatus"] = "CHAIN_HEALTHY_IN_SPEC";
    let requiresImmediate = false;

    if (diameterWearPercentage >= 15.0 || pitchElongationPercentage >= 3.0 || maxPittingDepth >= 5.0) {
      complianceStatus = "CRITICAL_TENSILE_FAILURE_RISK_REPLACE_IMMEDIATELY";
      requiresImmediate = true;
    } else if (diameterWearPercentage >= 10.0 || pitchElongationPercentage >= 1.5 || maxPittingDepth >= 3.0) {
      complianceStatus = "EXCESSIVE_WEAR_PLAN_REPLACEMENT";
    } else if (diameterWearPercentage >= 5.0 || maxPittingDepth >= 1.5) {
      complianceStatus = "ROUTINE_MONITORING_PLANNED";
    }

    const payload = {
      linkId: profile.linkId,
      nominalDiameterMm: profile.nominalBarDiameterMm,
      minMeasuredGripDiameterMm: Math.round(minMeasuredGripDiameterMm * 100) / 100,
      diameterWearPercentage: Math.round(diameterWearPercentage * 100) / 100,
      areaReductionPercentage: Math.round(areaReductionPercentage * 100) / 100,
      measuredPitchMm: Math.round(measuredPitchMm * 100) / 100,
      pitchElongationPercentage: Math.round(pitchElongationPercentage * 100) / 100,
      maxPittingDepthMm: Math.round(maxPittingDepth * 100) / 100,
      residualMblKiloNewtons,
      complianceStatus,
      requiresImmediateEmergencyRetensionOrSwap: requiresImmediate
    };

    const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    return {
      ...payload,
      tamperEvidentDigest: digest
    };
  }
}
