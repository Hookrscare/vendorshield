/**
 * SNAP-50: Autonomous Multi-Sensor Bridge Pier Scour Depth & Hydrodynamic Bathymetry Estimator
 * 
 * Evaluates riverine bridge pier scour depth according to Federal Highway Administration
 * (FHWA) HEC-18 guidelines using the Colorado State University (CSU) equilibrium scour model.
 * Ingests ADCP acoustic velocity profiles and multibeam sonar bathymetry to assess foundation
 * undermining hazards.
 */

export type PierNoseShape = 'SQUARE' | 'ROUND' | 'CIRCULAR' | 'SHARP_NOSE';

export type BedCondition = 'CLEAR_WATER' | 'PLANE_BED' | 'SMALL_DUNES' | 'MEDIUM_DUNES' | 'LARGE_DUNES';

export type ScourRiskLevel = 'SAFE' | 'MONITOR' | 'CRITICAL_UNDERMINING';

export interface BridgePierParameters {
  pierId: string;
  pierWidthMeters: number; // a
  pierLengthMeters: number; // L
  noseShape: PierNoseShape;
  attackAngleDegrees: number; // theta
  approachDepthMeters: number; // y1
  flowVelocityMps: number; // V1
  bedCondition: BedCondition;
  medianGrainSizeD50Mm: number; // D50 in mm
  foundationFootingDepthMeters: number; // depth to top of footing/piles
}

export interface PierScourAnalysisResult {
  pierId: string;
  froudeNumber: number;
  k1ShapeFactor: number;
  k2AngleFactor: number;
  k3BedFactor: number;
  k4ArmoringFactor: number;
  estimatedScourDepthMeters: number; // ys
  remainingEmbedmentMeters: number;
  scourRiskLevel: ScourRiskLevel;
  recommendedRiprapDiameterD50Mm: number;
}

export class BridgePierScourDepthEstimator {
  private readonly g = 9.81; // m/s^2

  private getK1ShapeFactor(shape: PierNoseShape): number {
    switch (shape) {
      case 'SQUARE': return 1.1;
      case 'ROUND':
      case 'CIRCULAR': return 1.0;
      case 'SHARP_NOSE': return 0.9;
      default: return 1.0;
    }
  }

  private getK2AngleFactor(attackAngleDeg: number, lengthM: number, widthM: number): number {
    if (attackAngleDeg <= 0) return 1.0;
    const rad = (attackAngleDeg * Math.PI) / 180.0;
    const lOverA = Math.max(1.0, lengthM / widthM);
    // HEC-18: K2 = (cos(theta) + (L/a)*sin(theta))^0.65
    const term = Math.cos(rad) + lOverA * Math.sin(rad);
    return Math.min(5.0, Math.pow(term, 0.65));
  }

  private getK3BedFactor(condition: BedCondition): number {
    switch (condition) {
      case 'CLEAR_WATER':
      case 'PLANE_BED': return 1.1;
      case 'SMALL_DUNES': return 1.1;
      case 'MEDIUM_DUNES': return 1.2;
      case 'LARGE_DUNES': return 1.3;
      default: return 1.1;
    }
  }

  private getK4ArmoringFactor(d50Mm: number, velocityMps: number, approachDepthM: number): number {
    // If D50 >= 60 mm, coarse armoring reduction applies
    if (d50Mm < 60) return 1.0;
    const vCritical = 6.19 * Math.pow(approachDepthM, 1.0 / 6.0) * Math.pow(d50Mm / 1000.0, 1.0 / 3.0);
    if (velocityMps < vCritical) {
      return 0.7; // Reduction factor for coarse bed armoring
    }
    return 1.0;
  }

  /**
   * Computes CSU equilibrium pier scour depth (HEC-18 Equation 6.1).
   * ys / y1 = 2.0 * K1 * K2 * K3 * K4 * (a / y1)^0.65 * Fr1^0.43
   */
  public evaluateScour(params: BridgePierParameters): PierScourAnalysisResult {
    const {
      pierId, pierWidthMeters, pierLengthMeters, noseShape,
      attackAngleDegrees, approachDepthMeters, flowVelocityMps,
      bedCondition, medianGrainSizeD50Mm, foundationFootingDepthMeters
    } = params;

    const fr1 = flowVelocityMps / Math.sqrt(this.g * approachDepthMeters);
    const k1 = this.getK1ShapeFactor(noseShape);
    const k2 = this.getK2AngleFactor(attackAngleDegrees, pierLengthMeters, pierWidthMeters);
    const k3 = this.getK3BedFactor(bedCondition);
    const k4 = this.getK4ArmoringFactor(medianGrainSizeD50Mm, flowVelocityMps, approachDepthMeters);

    const aOverY1 = pierWidthMeters / approachDepthMeters;
    const ys = 2.0 * approachDepthMeters * k1 * k2 * k3 * k4 * Math.pow(aOverY1, 0.65) * Math.pow(fr1, 0.43);
    const scourDepth = Number(Math.max(0, ys).toFixed(2));

    const remainingEmbedment = Number((foundationFootingDepthMeters - scourDepth).toFixed(2));

    let riskLevel: ScourRiskLevel;
    if (remainingEmbedment < 0.5) {
      riskLevel = 'CRITICAL_UNDERMINING';
    } else if (remainingEmbedment < 1.5) {
      riskLevel = 'MONITOR';
    } else {
      riskLevel = 'SAFE';
    }

    // Isbash equation proxy for minimum stable riprap stone sizing (D50 in mm)
    // D50_riprap = 0.692 * (V^2) / (2 * g * (Ss - 1)) where Ss ≈ 2.65
    const ss = 2.65;
    const d50RiprapMeters = (0.692 * Math.pow(flowVelocityMps, 2)) / (2 * this.g * (ss - 1));
    const riprapMm = Math.round(d50RiprapMeters * 1000);

    return {
      pierId,
      froudeNumber: Number(fr1.toFixed(3)),
      k1ShapeFactor: Number(k1.toFixed(2)),
      k2AngleFactor: Number(k2.toFixed(2)),
      k3BedFactor: Number(k3.toFixed(2)),
      k4ArmoringFactor: Number(k4.toFixed(2)),
      estimatedScourDepthMeters: scourDepth,
      remainingEmbedmentMeters: remainingEmbedment,
      scourRiskLevel: riskLevel,
      recommendedRiprapDiameterD50Mm: riprapMm,
    };
  }
}
