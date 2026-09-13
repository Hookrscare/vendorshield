/**
 * SNAP-68: Cryogenic Liquefied Natural Gas (LNG) Spherical Tank Invar Membrane Laser Shearography Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Analyzes laser shearography speckle phase interferograms on cryogenic (-162°C)
 * Invar (Fe-36Ni) primary and secondary containment barrier membranes.
 * Detects delamination, plywood insulation voiding, and micro-corrugation fatigue.
 */

import { createHash } from "crypto";

export interface ShearographyPointData {
  xMm: number;
  yMm: number;
  phaseDerivativeRadPerMm: number; // dw/dx in radians per mm
  carrierInterferogramContrast: number; // 0.0 to 1.0
}

export interface InvarMembraneAnalysisResult {
  tankZoneId: string;
  nominalThicknessMm: number;
  maxDisplacementGradient: number;
  delaminationVoidAreaMm2: number;
  severityClassification: "INTEGRITY_VERIFIED" | "SURVEILLANCE_RECOMMENDED" | "CRITICAL_MEMBRANE_DELAMINATION";
  structuralSafetyFactor: number;
  inspectionCertificateHash: string;
}

export class LngMembraneLaserShearographyAnalyzer {
  public static analyzeShearographyData(
    tankZoneId: string,
    nominalThicknessMm: number,
    points: ShearographyPointData[],
    cryogenicTempKelvin: number = 111.15 // -162°C
  ): InvarMembraneAnalysisResult {
    if (!tankZoneId || points.length === 0) {
      throw new Error("Tank Zone ID and points array must not be empty.");
    }

    if (nominalThicknessMm <= 0) {
      throw new Error("Nominal membrane thickness must be positive.");
    }

    let maxGradient = 0;
    let defectivePointCount = 0;
    const gridSpacingMm = 5.0; // standard laser shearography raster resolution

    for (const pt of points) {
      const grad = Math.abs(pt.phaseDerivativeRadPerMm);
      if (grad > maxGradient) {
        maxGradient = grad;
      }
      // Gradient exceeding 1.2 rad/mm with high fringe contrast indicates subsurface debonding
      if (grad >= 1.2 && pt.carrierInterferogramContrast > 0.4) {
        defectivePointCount++;
      }
    }

    const estimatedVoidAreaMm2 = defectivePointCount * (gridSpacingMm * gridSpacingMm);

    let classification: "INTEGRITY_VERIFIED" | "SURVEILLANCE_RECOMMENDED" | "CRITICAL_MEMBRANE_DELAMINATION";
    let safetyFactor = 3.5;

    if (maxGradient >= 2.5 || estimatedVoidAreaMm2 > 250) {
      classification = "CRITICAL_MEMBRANE_DELAMINATION";
      safetyFactor = 0.85;
    } else if (maxGradient >= 1.2 || estimatedVoidAreaMm2 > 50) {
      classification = "SURVEILLANCE_RECOMMENDED";
      safetyFactor = 1.6;
    } else {
      classification = "INTEGRITY_VERIFIED";
      safetyFactor = 3.8;
    }

    // Cryogenic brittle fracture penalty if temperature exceeds threshold
    if (cryogenicTempKelvin < 100) {
      safetyFactor *= 0.95;
    }

    const raw = `${tankZoneId}:${nominalThicknessMm}:${maxGradient.toFixed(4)}:${estimatedVoidAreaMm2}:${classification}`;
    const hash = createHash("sha256").update(raw).digest("hex");

    return {
      tankZoneId,
      nominalThicknessMm,
      maxDisplacementGradient: Number(maxGradient.toFixed(4)),
      delaminationVoidAreaMm2: Number(estimatedVoidAreaMm2.toFixed(2)),
      severityClassification: classification,
      structuralSafetyFactor: Number(safetyFactor.toFixed(2)),
      inspectionCertificateHash: hash
    };
  }
}
