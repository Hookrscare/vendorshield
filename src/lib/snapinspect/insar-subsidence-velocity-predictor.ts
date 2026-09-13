/**
 * src/lib/snapinspect/insar-subsidence-velocity-predictor.ts
 * SNAP-49: Thermal InSAR Satellite Radar Ground Subsidence & Structural Deformation Velocity Predictor.
 *
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 * Implements Synthetic Aperture Radar Interferometry (InSAR) Persistent Scatterer (PS) modeling,
 * thermal expansion decoupling, structural angular distortion, and CAD contour visualization.
 */

import { createHash } from 'crypto';

export type DeformationRiskLevel = 'NEGLIGIBLE' | 'ARCHITECTURAL_CRACKING' | 'STRUCTURAL_HAZARD' | 'CRITICAL_FAILURE';

export interface PersistentScattererPoint {
  id: string;
  xMeters: number;
  yMeters: number;
  elevationMeters: number;
  losDisplacementMm: number; // Line-of-sight displacement in mm
  coherence: number;         // InSAR coherence (0.0 to 1.0)
  temperatureCelsius?: number;
}

export interface InSARSensorParameters {
  sensorName: string;
  wavelengthMm: number;      // e.g. 55.46 mm for Sentinel-1 C-band
  incidenceAngleDeg: number; // typically 30 - 45 degrees
  headingAngleDeg: number;   // Orbit azimuth angle
}

export interface StructuralNodePair {
  nodeAId: string;
  nodeBId: string;
  spanMeters: number;
  differentialSettlementMm: number;
  angularDistortion: number; // radian slope delta_s / L
  riskTier: DeformationRiskLevel;
}

export interface InSARSubsidenceAssessment {
  surveyId: string;
  timestamp: string;
  totalPointsAudited: number;
  meanVerticalVelocityMmYear: number;
  peakSubsidenceVelocityMmYear: number;
  thermalExpansionCoefficientMmC: number;
  criticalPairs: StructuralNodePair[];
  overallDeformationRisk: DeformationRiskLevel;
  svgContourMap: string;
  geoJsonFeatures: Record<string, any>;
  cryptographicSealSha256: string;
}

export class InSARSubsidenceVelocityPredictor {
  /**
   * Converts Line-Of-Sight (LOS) velocity to True Vertical Subsidence Velocity.
   */
  public static losToVerticalVelocity(
    losVelocityMm: number,
    incidenceAngleDeg: number
  ): number {
    const rad = (incidenceAngleDeg * Math.PI) / 180.0;
    const cosInc = Math.cos(rad);
    if (Math.abs(cosInc) < 1e-6) return losVelocityMm;
    return losVelocityMm / cosInc;
  }

  /**
   * Decouples thermal seasonal oscillation from secular subsidence velocity.
   */
  public static decoupleThermalDeformation(
    displacementMm: number,
    temperatureDeltaC: number,
    thermalCoeffMmC: number = 0.45
  ): { secularDisplacementMm: number; thermalDisplacementMm: number } {
    const thermalDisplacementMm = thermalCoeffMmC * temperatureDeltaC;
    const secularDisplacementMm = displacementMm - thermalDisplacementMm;
    return {
      secularDisplacementMm: Math.round(secularDisplacementMm * 100) / 100,
      thermalDisplacementMm: Math.round(thermalDisplacementMm * 100) / 100,
    };
  }

  /**
   * Evaluates angular distortion and structural failure thresholds per Eurocode 7 / Skempton-MacDonald.
   */
  public static evaluateAngularDistortion(
    spanMeters: number,
    settlementDiffMm: number
  ): { angularDistortion: number; riskTier: DeformationRiskLevel } {
    if (spanMeters <= 0) {
      return { angularDistortion: 0, riskTier: 'NEGLIGIBLE' };
    }
    const distortion = Math.abs(settlementDiffMm / 1000.0) / spanMeters;

    let riskTier: DeformationRiskLevel = 'NEGLIGIBLE';
    if (distortion >= 1 / 150) {
      riskTier = 'CRITICAL_FAILURE';
    } else if (distortion >= 1 / 300) {
      riskTier = 'STRUCTURAL_HAZARD';
    } else if (distortion >= 1 / 500) {
      riskTier = 'ARCHITECTURAL_CRACKING';
    }

    return {
      angularDistortion: Math.round(distortion * 100000) / 100000,
      riskTier,
    };
  }

  /**
   * Conducts full multi-point InSAR subsidence analysis on foundation nodes.
   */
  public static analyzeSurvey(
    surveyId: string,
    points: PersistentScattererPoint[],
    sensor: InSARSensorParameters,
    nodePairs: Array<{ nodeAId: string; nodeBId: string; spanMeters: number }>
  ): InSARSubsidenceAssessment {
    const ptMap = new Map<string, PersistentScattererPoint>();
    const vertVelocities: number[] = [];

    for (const pt of points) {
      ptMap.set(pt.id, pt);
      const vVert = this.losToVerticalVelocity(pt.losDisplacementMm, sensor.incidenceAngleDeg);
      vertVelocities.push(vVert);
    }

    const meanVertical = vertVelocities.length > 0
      ? vertVelocities.reduce((a, b) => a + b, 0) / vertVelocities.length
      : 0;
    const peakSubsidence = vertVelocities.length > 0
      ? Math.min(...vertVelocities)
      : 0;

    const evaluatedPairs: StructuralNodePair[] = [];
    let worstRisk: DeformationRiskLevel = 'NEGLIGIBLE';

    for (const pair of nodePairs) {
      const a = ptMap.get(pair.nodeAId);
      const b = ptMap.get(pair.nodeBId);
      if (a && b) {
        const vA = this.losToVerticalVelocity(a.losDisplacementMm, sensor.incidenceAngleDeg);
        const vB = this.losToVerticalVelocity(b.losDisplacementMm, sensor.incidenceAngleDeg);
        const diffMm = Math.abs(vA - vB);
        const { angularDistortion, riskTier } = this.evaluateAngularDistortion(pair.spanMeters, diffMm);

        evaluatedPairs.push({
          nodeAId: pair.nodeAId,
          nodeBId: pair.nodeBId,
          spanMeters: pair.spanMeters,
          differentialSettlementMm: Math.round(diffMm * 100) / 100,
          angularDistortion,
          riskTier,
        });

        if (
          riskTier === 'CRITICAL_FAILURE' ||
          (riskTier === 'STRUCTURAL_HAZARD' && worstRisk !== 'CRITICAL_FAILURE') ||
          (riskTier === 'ARCHITECTURAL_CRACKING' && worstRisk === 'NEGLIGIBLE')
        ) {
          worstRisk = riskTier;
        }
      }
    }

    // Generate lightweight SVG contour canvas
    const svgContourMap = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
        <rect width="800" height="600" fill="#0f172a"/>
        <g id="scatterers">
          ${points.map(p => {
            const v = this.losToVerticalVelocity(p.losDisplacementMm, sensor.incidenceAngleDeg);
            const fill = v < -15 ? '#ef4444' : v < -5 ? '#f59e0b' : '#10b981';
            return `<circle cx="${400 + p.xMeters * 5}" cy="${300 + p.yMeters * 5}" r="4" fill="${fill}" opacity="${p.coherence}" />`;
          }).join('')}
        </g>
      </svg>
    `.trim();

    const geoJsonFeatures = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.xMeters, p.yMeters, p.elevationMeters],
        },
        properties: {
          id: p.id,
          losMm: p.losDisplacementMm,
          verticalMm: this.losToVerticalVelocity(p.losDisplacementMm, sensor.incidenceAngleDeg),
          coherence: p.coherence,
        },
      })),
    };

    const timestamp = new Date().toISOString();
    const digestPayload = JSON.stringify({
      surveyId,
      totalPoints: points.length,
      meanVertical,
      peakSubsidence,
      worstRisk,
      timestamp,
    });
    const cryptographicSealSha256 = createHash('sha256').update(digestPayload).digest('hex');

    return {
      surveyId,
      timestamp,
      totalPointsAudited: points.length,
      meanVerticalVelocityMmYear: Math.round(meanVertical * 100) / 100,
      peakSubsidenceVelocityMmYear: Math.round(peakSubsidence * 100) / 100,
      thermalExpansionCoefficientMmC: 0.45,
      criticalPairs: evaluatedPairs,
      overallDeformationRisk: worstRisk,
      svgContourMap,
      geoJsonFeatures,
      cryptographicSealSha256,
    };
  }
}
