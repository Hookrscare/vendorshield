/**
 * SNAP-23: LiDAR Structural Load & Beam Deflection Scanner.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Thermal Suite.
 * Adheres to AISC 360, IBC Section 1604.3 & ACI 318 structural deflection criteria.
 * Analyzes LiDAR point cloud profiles along structural horizontal spans to detect
 * sagging, mid-span deflection ratios (L/240, L/360), and structural overload risks.
 */

export type BeamMaterial =
  | "STRUCTURAL_STEEL_W_BEAM"
  | "GLULAM_TIMBER"
  | "REINFORCED_CONCRETE"
  | "DIMENSIONAL_LUMBER";

export type DeflectionLimitStandard =
  | "FLOOR_LIVE_LOAD_L_360"
  | "TOTAL_LOAD_L_240"
  | "ROOF_SNOW_LOAD_L_240"
  | "CANTILEVER_L_180";

export interface BeamDeflectionScanInput {
  beamId: string;
  material: BeamMaterial;
  spanLengthMm: number; // Clear span L in mm
  standard: DeflectionLimitStandard;
  measuredElevationProfileMm: Array<{ positionMm: number; elevationMm: number }>;
}

export interface BeamDeflectionAssessment {
  beamId: string;
  material: BeamMaterial;
  spanLengthMm: number;
  maxDeflectionMm: number;
  deflectionLocationMm: number;
  allowableDeflectionMm: number;
  spanToDeflectionRatio: number; // e.g. L/420
  allowableRatio: number; // e.g. 360, 240, 180
  utilizationRatio: number; // maxDeflection / allowableDeflection
  severity: "PASS_WITHIN_CODE" | "MARGINAL_DEFLECTION" | "CODE_VIOLATION_EXCESSIVE_SAG" | "CRITICAL_OVERLOAD_FAILURE_RISK";
  recommendedAction: string;
}

export class BeamDeflectionScanner {
  public static getAllowableRatio(standard: DeflectionLimitStandard): number {
    switch (standard) {
      case "FLOOR_LIVE_LOAD_L_360":
        return 360;
      case "TOTAL_LOAD_L_240":
      case "ROOF_SNOW_LOAD_L_240":
        return 240;
      case "CANTILEVER_L_180":
        return 180;
    }
  }

  public static analyzeBeamScan(input: BeamDeflectionScanInput): BeamDeflectionAssessment {
    const { beamId, material, spanLengthMm, standard, measuredElevationProfileMm } = input;

    if (spanLengthMm <= 0) {
      throw new Error("Span length must be greater than zero.");
    }
    if (measuredElevationProfileMm.length < 3) {
      throw new Error("LiDAR profile must contain at least 3 points across the span.");
    }

    // Sort points by position along span
    const points = [...measuredElevationProfileMm].sort((a, b) => a.positionMm - b.positionMm);

    // Baseline reference: straight line between first and last measurement point
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const baselineSlope = (endPoint.elevationMm - startPoint.elevationMm) / (endPoint.positionMm - startPoint.positionMm);

    let maxDeflectionMm = 0.0;
    let deflectionLocationMm = spanLengthMm / 2;

    for (const pt of points) {
      // Expected elevation on linear baseline
      const expectedElev = startPoint.elevationMm + baselineSlope * (pt.positionMm - startPoint.positionMm);
      // Deflection is sag below baseline
      const sag = expectedElev - pt.elevationMm;

      if (sag > maxDeflectionMm) {
        maxDeflectionMm = sag;
        deflectionLocationMm = pt.positionMm;
      }
    }

    maxDeflectionMm = Math.max(0.0, Math.round(maxDeflectionMm * 10) / 10);

    const allowableRatio = this.getAllowableRatio(standard);
    const allowableDeflectionMm = Math.round((spanLengthMm / allowableRatio) * 10) / 10;

    const spanToDeflectionRatio = maxDeflectionMm > 0.01
      ? Math.round(spanLengthMm / maxDeflectionMm)
      : 9999;

    const utilizationRatio = Math.round((maxDeflectionMm / allowableDeflectionMm) * 100) / 100;

    let severity: BeamDeflectionAssessment["severity"] = "PASS_WITHIN_CODE";
    let recommendedAction = "Deflection within allowable structural tolerance limits.";

    if (utilizationRatio > 1.5) {
      severity = "CRITICAL_OVERLOAD_FAILURE_RISK";
      recommendedAction = "Immediate emergency shoring required. Restrict live loads and request urgent structural PE evaluation.";
    } else if (utilizationRatio > 1.0) {
      severity = "CODE_VIOLATION_EXCESSIVE_SAG";
      recommendedAction = "Exceeds IBC allowable deflection limit. Sister joists, install mid-span post, or reduce dead load.";
    } else if (utilizationRatio >= 0.85) {
      severity = "MARGINAL_DEFLECTION";
      recommendedAction = "Deflection approaching maximum code boundary. Monitor during high live-load events.";
    }

    return {
      beamId,
      material,
      spanLengthMm,
      maxDeflectionMm,
      deflectionLocationMm,
      allowableDeflectionMm,
      spanToDeflectionRatio,
      allowableRatio,
      utilizationRatio,
      severity,
      recommendedAction
    };
  }
}
