/**
 * SNAP-81: Deepwater Mooring Chain Interlink Wear Laser Scanner.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 * 
 * Analyzes subsea ROV 3D laser profiler point cloud scans across offshore mooring chain links,
 * computing interlink grip wear, cross-sectional area loss, and residual breaking strength (MBL).
 */

import { createHash } from "crypto";

export interface MooringChainScanData {
  chainLineId: string;
  linkIndex: number;
  chainSteelGrade: "R3" | "R4" | "R5";
  nominalBarDiameterMm: number;    // e.g. 150.0 mm
  measuredMinDiameterMm: number;   // e.g. 138.0 mm at interlink contact crown
  nominalMblKilonewtons: number;   // Nominal Minimum Breaking Load (e.g. 18,500 kN)
  inspectionDepthMeters: number;
}

export interface MooringWearEvaluationResult {
  chainLineId: string;
  linkIndex: number;
  diameterReductionPct: number;
  residualMblKilonewtons: number;
  requiresImmediateReplacement: boolean;
  linkStructuralIntegrity: "FIT_FOR_PURPOSE" | "ELEVATED_MONITORING_REQUIRED" | "CRITICAL_FATIGUE_REPLACEMENT_ORDER";
  verificationDigest: string;
}

export class DeepwaterMooringChainWearScanner {
  public static evaluateLinkWear(
    scan: MooringChainScanData,
    maxAllowableWearPct: number = 10.0
  ): MooringWearEvaluationResult {
    if (!scan.chainLineId || scan.nominalBarDiameterMm <= 0 || scan.measuredMinDiameterMm <= 0) {
      throw new Error("Invalid scan: chainLineId and positive diameters are required.");
    }

    // 1. Diameter Reduction Percentage
    const wearLossMm = Math.max(0, scan.nominalBarDiameterMm - scan.measuredMinDiameterMm);
    const diameterReductionPct = Number(((wearLossMm / scan.nominalBarDiameterMm) * 100.0).toFixed(2));

    // 2. Residual MBL calculation according to API RP 2SK empirical scaling
    // Residual MBL = Nominal MBL * (D_actual / D_nominal)^1.8
    const diamRatio = Math.min(1.0, scan.measuredMinDiameterMm / scan.nominalBarDiameterMm);
    const residualMbl = Number((scan.nominalMblKilonewtons * Math.pow(diamRatio, 1.8)).toFixed(1));

    // 3. Classification
    const replace = diameterReductionPct >= maxAllowableWearPct;
    let integrity: MooringWearEvaluationResult["linkStructuralIntegrity"] = "FIT_FOR_PURPOSE";

    if (replace) {
      integrity = "CRITICAL_FATIGUE_REPLACEMENT_ORDER";
    } else if (diameterReductionPct >= maxAllowableWearPct * 0.7) {
      integrity = "ELEVATED_MONITORING_REQUIRED";
    }

    const raw = `${scan.chainLineId}:${scan.linkIndex}:${diameterReductionPct}:${residualMbl}:${integrity}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      chainLineId: scan.chainLineId,
      linkIndex: scan.linkIndex,
      diameterReductionPct,
      residualMblKilonewtons: residualMbl,
      requiresImmediateReplacement: replace,
      linkStructuralIntegrity: integrity,
      verificationDigest: digest
    };
  }
}
