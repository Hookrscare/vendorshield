/**
 * SNAP-50: Autonomous Multi-Sensor Bridge Pier Scour Depth & Hydrodynamic Bathymetry Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements FHWA HEC-18 equilibrium pier scour depth equations, fuses multibeam sonar
 * bathymetric soundings around bridge substructures, and generates foundation undermining alerts.
 */

export type PierNoseShape = 'ROUND_NOSE' | 'SQUARE_NOSE' | 'SHARP_NOSE';
export type BedCondition = 'CLEAR_WATER' | 'PLANE_BED' | 'SMALL_DUNES' | 'LARGE_DUNES';

export interface PierGeometry {
  pierId: string;
  widthMeters: number;              // a (pier width)
  lengthMeters: number;             // L (pier length)
  noseShape: PierNoseShape;
  attackAngleDeg: number;           // Flow angle of attack (degrees)
  topOfFootingElevationM: number;    // Elevation where pier footing begins
  pileTipElevationM: number;         // Bottom elevation of foundation piles
}

export interface HydrodynamicFlowConditions {
  approachVelocityMps: number;      // V1 (m/s)
  approachDepthMeters: number;       // y1 (m)
  bedCondition: BedCondition;
}

export interface SonarBathymetryPoint {
  xMeters: number;                  // Relative to pier centroid
  yMeters: number;
  bedElevationM: number;            // Measured riverbed elevation
  sensorConfidence: number;         // 0.0 - 1.0
}

export interface ScourEvaluationReport {
  pierId: string;
  froudeNumber: number;
  theoreticalScourDepthM: number;   // Calculated HEC-18 scour depth (ys)
  observedMaxScourDepthM: number;   // Max scour observed via sonar soundings
  criticalScourElevationM: number;  // Bed elevation at deepest scour hole
  footingUndermined: boolean;
  residualPileEmbedmentPercent: number;
  stabilityTier: 'SAFE' | 'MONITOR_REQUIRED' | 'CRITICAL_UNDERMINED';
  remediationRecommendation: string;
  geojsonFeature: Record<string, any>;
}

const GRAVITY = 9.80665; // m/s^2

export class BridgePierScourBathymetryEstimator {
  /**
   * Evaluates scour depth using FHWA HEC-18 equation and sonar bathymetric points.
   */
  public evaluatePierScour(
    pier: PierGeometry,
    flow: HydrodynamicFlowConditions,
    sonarSoundings: SonarBathymetryPoint[],
    initialBedElevationM: number
  ): ScourEvaluationReport {
    // 1. Compute Froude Number: Fr1 = V1 / sqrt(g * y1)
    const v1 = Math.max(0.01, flow.approachVelocityMps);
    const y1 = Math.max(0.1, flow.approachDepthMeters);
    const froudeNumber = v1 / Math.sqrt(GRAVITY * y1);

    // 2. Correction Factors (HEC-18)
    // K1: Pier nose shape
    let k1 = 1.0;
    if (pier.noseShape === 'SQUARE_NOSE') k1 = 1.1;
    else if (pier.noseShape === 'SHARP_NOSE') k1 = 0.9;
    else k1 = 1.0; // ROUND_NOSE

    // K2: Angle of attack
    const angleRad = (Math.abs(pier.attackAngleDeg) * Math.PI) / 180;
    const lOverA = pier.lengthMeters / Math.max(0.1, pier.widthMeters);
    let k2 = 1.0;
    if (pier.attackAngleDeg !== 0) {
      k2 = Math.pow(Math.cos(angleRad) + lOverA * Math.sin(angleRad), 0.65);
    }

    // K3: Bed condition
    let k3 = 1.1;
    if (flow.bedCondition === 'CLEAR_WATER' || flow.bedCondition === 'PLANE_BED') k3 = 1.1;
    else if (flow.bedCondition === 'SMALL_DUNES') k3 = 1.1;
    else if (flow.bedCondition === 'LARGE_DUNES') k3 = 1.25;

    // 3. HEC-18 Scour Equation:
    // ys = 2.0 * K1 * K2 * K3 * (a)^0.65 * (y1)^0.35 * (Fr1)^0.43
    const a = pier.widthMeters;
    const theoreticalScourDepth =
      2.0 * k1 * k2 * k3 * Math.pow(a, 0.65) * Math.pow(y1, 0.35) * Math.pow(froudeNumber, 0.43);

    // 4. Observed Scour from Sonar Bathymetry Soundings
    let observedDeepestBedElevation = initialBedElevationM;
    for (const pt of sonarSoundings) {
      if (pt.sensorConfidence >= 0.5 && pt.bedElevationM < observedDeepestBedElevation) {
        observedDeepestBedElevation = pt.bedElevationM;
      }
    }
    const observedScourDepth = Math.max(0, initialBedElevationM - observedDeepestBedElevation);

    // Governing scour depth is max of theoretical and observed
    const governingScourDepth = Math.max(theoreticalScourDepth, observedScourDepth);
    const criticalScourElevation = initialBedElevationM - governingScourDepth;

    // 5. Geotechnical Substructure Stability Analysis
    const footingUndermined = criticalScourElevation < pier.topOfFootingElevationM;
    const totalPileLength = Math.max(0.1, pier.topOfFootingElevationM - pier.pileTipElevationM);
    const remainingEmbedment = Math.max(0, criticalScourElevation - pier.pileTipElevationM);
    const residualEmbedmentPercent = Math.min(100, Math.max(0, (remainingEmbedment / totalPileLength) * 100));

    let stabilityTier: 'SAFE' | 'MONITOR_REQUIRED' | 'CRITICAL_UNDERMINED' = 'SAFE';
    let recommendation = 'No immediate action; scheduled routine underwater inspection.';

    if (footingUndermined || residualEmbedmentPercent < 50) {
      stabilityTier = 'CRITICAL_UNDERMINED';
      recommendation = 'EMERGENCY: Pier footing undermined. Deploy riprap scour armor and restrict bridge load.';
    } else if (governingScourDepth > 0.6 * (initialBedElevationM - pier.topOfFootingElevationM)) {
      stabilityTier = 'MONITOR_REQUIRED';
      recommendation = 'ELEVATED SCOUR: Increase hydrographic sonar scan frequency after storm/flood events.';
    }

    const geojsonFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0.0, 0.0],
      },
      properties: {
        pierId: pier.pierId,
        froudeNumber: Math.round(froudeNumber * 1000) / 1000,
        theoreticalScourDepthM: Math.round(theoreticalScourDepth * 100) / 100,
        observedScourDepthM: Math.round(observedScourDepth * 100) / 100,
        stabilityTier,
        footingUndermined,
      },
    };

    return {
      pierId: pier.pierId,
      froudeNumber: Math.round(froudeNumber * 1000) / 1000,
      theoreticalScourDepthM: Math.round(theoreticalScourDepth * 100) / 100,
      observedMaxScourDepthM: Math.round(observedScourDepth * 100) / 100,
      criticalScourElevationM: Math.round(criticalScourElevation * 100) / 100,
      footingUndermined,
      residualPileEmbedmentPercent: Math.round(residualEmbedmentPercent * 10) / 10,
      stabilityTier,
      remediationRecommendation: recommendation,
      geojsonFeature,
    };
  }
}
