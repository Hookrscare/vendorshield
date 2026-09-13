/**
 * SNAP-56: Subsurface Cavity Karst Ground Sinkhole Early Warning Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Analyzes Electrical Resistivity Tomography (ERT) and ground void scans:
 * 1. Evaluates apparent resistivity (Ohm-m) distributions across depth profiles.
 * 2. Identifies air-filled cavities (high resistivity > 2500 Ohm-m) and water-filled conduits (< 50 Ohm-m).
 * 3. Quantifies overburden thickness relative to cavity crown to predict crown failure risk.
 * 4. Issues geotechnical sinkhole hazard alerts and cryptographic scan attestation.
 */

import { createHash } from "crypto";

export interface ResistivityScanPoint {
  stationMeters: number;
  depthMeters: number;
  apparentResistivityOhmM: number;
}

export interface KarstSurveyRequest {
  siteId: string;
  baselineResistivityOhmM: number; // typically 200 - 600 Ohm-m for solid limestone/clay
  scanPoints: ResistivityScanPoint[];
}

export interface KarstSurveyResult {
  siteId: string;
  totalScanPoints: number;
  anomalousVoidCount: number;
  shallowestVoidDepthMeters: number;
  overburdenCrownCollapseRisk: number; // 0 - 100
  hazardLevel: "HOMOGENEOUS_BEDROCK" | "MODERATE_VOID_WATCH" | "CRITICAL_IMMINENT_COLLAPSE";
  geophysicalRiskHash: string;
}

export class SubsurfaceCavitySinkholeTomographer {
  public static analyzeSurvey(request: KarstSurveyRequest): KarstSurveyResult {
    if (!request.scanPoints || request.scanPoints.length < 5) {
      throw new Error("Geophysical survey requires at least 5 resistivity scan points.");
    }

    let anomalousVoids = 0;
    let shallowestVoidDepth = 999.0;

    for (const pt of request.scanPoints) {
      // Void criteria: Air-filled void > 4x baseline OR water-filled dissolution channel < 0.2x baseline
      const isAirVoid = pt.apparentResistivityOhmM >= request.baselineResistivityOhmM * 4.0;
      const isWaterConduit = pt.apparentResistivityOhmM <= request.baselineResistivityOhmM * 0.20;

      if (isAirVoid || isWaterConduit) {
        anomalousVoids++;
        if (pt.depthMeters < shallowestVoidDepth) {
          shallowestVoidDepth = pt.depthMeters;
        }
      }
    }

    if (shallowestVoidDepth === 999.0) {
      shallowestVoidDepth = 0.0;
    }

    // Collapse risk increases exponentially as void crown approaches ground surface (< 3m is critical)
    let collapseRisk = 0;
    if (anomalousVoids > 0) {
      const depthFactor = Math.max(0.5, shallowestVoidDepth);
      const risk = (anomalousVoids * 35.0) / Math.sqrt(depthFactor);
      collapseRisk = Math.min(100, Math.round(risk));
    }

    let hazardLevel: KarstSurveyResult["hazardLevel"] = "HOMOGENEOUS_BEDROCK";
    if (collapseRisk >= 65 || (anomalousVoids >= 3 && shallowestVoidDepth <= 3.0)) {
      hazardLevel = "CRITICAL_IMMINENT_COLLAPSE";
    } else if (collapseRisk >= 25 || anomalousVoids > 0) {
      hazardLevel = "MODERATE_VOID_WATCH";
    }

    const raw = `${request.siteId}:${anomalousVoids}:${shallowestVoidDepth}:${collapseRisk}:${hazardLevel}`;
    const hash = createHash("sha256").update(raw).digest("hex");

    return {
      siteId: request.siteId,
      totalScanPoints: request.scanPoints.length,
      anomalousVoidCount: anomalousVoids,
      shallowestVoidDepthMeters: shallowestVoidDepth,
      overburdenCrownCollapseRisk: collapseRisk,
      hazardLevel,
      geophysicalRiskHash: hash
    };
  }
}
