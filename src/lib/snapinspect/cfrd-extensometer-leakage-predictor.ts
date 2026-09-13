/**
 * SNAP-70: Geotechnical Rockfill Dam Upstream Concrete Face Slab (CFRD) Extensometer Leakage Predictor
 * Tactical CAD & Geotechnical Engineering Inspection Module for SnapInspect AI.
 *
 * Evaluates concrete face slab joint 3D extensometer kinematics (opening, shear, settlement),
 * copper waterstop tensile fatigue strain, downstream toe seepage weir discharge, and piping erosion risk.
 */

export type CfrdSeepageHazard = 
  | 'SAFE_HERMETIC'
  | 'OBSERVATION_ADVISORY'
  | 'ELEVATED_LEAKAGE_WARNING'
  | 'CRITICAL_PIPING_EMERGENCY';

export interface JointExtensometer3D {
  sensorId: string;
  jointType: 'PERIMETRIC_PLINTH' | 'VERTICAL_CONTRACTION' | 'HORIZONTAL_TENSION';
  elevationMeters: number;
  normalOpeningMm: number;
  tangentialShearMm: number;
  settlementOffsetMm: number;
  maxDesignWaterstopShearMm: number; // e.g. 25mm for typical copper bulb waterstop
}

export interface DownstreamWeirTelemetry {
  weirId: string;
  measuredFlowLitersPerSec: number;
  baselineNominalFlowLitersPerSec: number;
  turbidityNtu: number; // Nephelometric Turbidity Units: > 5 NTU indicates fines erosion
  electricConductivityUsCm: number;
}

export interface CfrdDamConditions {
  damId: string;
  damHeightMeters: number;
  currentReservoirHeadMeters: number;
  concreteCompressiveStrengthMpa: number;
}

export interface CfrdLeakagePredictionResult {
  damId: string;
  hazardLevel: CfrdSeepageHazard;
  maxJointResultantDisplacementMm: number;
  waterstopStrainRatio: number; // Resultant displacement / design limit
  seepageDeviationRatio: number; // Measured flow / baseline flow
  internalPipingDetected: boolean;
  predictedSeepageFlowLps: number;
  engineeringRecommendations: string[];
  auditDigest: string;
}

export class CfrdExtensometerLeakagePredictor {
  public evaluateDamJointIntegrity(
    dam: CfrdDamConditions,
    extensometers: JointExtensometer3D[],
    weir: DownstreamWeirTelemetry
  ): CfrdLeakagePredictionResult {
    if (extensometers.length === 0) {
      throw new Error('At least one 3D joint extensometer reading is required.');
    }

    let maxDisplacement = 0;
    let maxStrainRatio = 0;

    for (const ext of extensometers) {
      // 3D vector resultant: sqrt(dn^2 + ds^2 + dz^2)
      const resultant = Math.sqrt(
        Math.pow(ext.normalOpeningMm, 2) +
        Math.pow(ext.tangentialShearMm, 2) +
        Math.pow(ext.settlementOffsetMm, 2)
      );

      if (resultant > maxDisplacement) {
        maxDisplacement = resultant;
      }

      const strainRatio = resultant / Math.max(1.0, ext.maxDesignWaterstopShearMm);
      if (strainRatio > maxStrainRatio) {
        maxStrainRatio = strainRatio;
      }
    }

    const seepageRatio = weir.measuredFlowLitersPerSec / Math.max(0.1, weir.baselineNominalFlowLitersPerSec);
    const internalPipingDetected = weir.turbidityNtu >= 5.0 && seepageRatio > 1.5;

    // Hydrodynamic hydrostatic pressure driving leakage: P = rho * g * h
    const headRatio = dam.currentReservoirHeadMeters / Math.max(1.0, dam.damHeightMeters);
    const predictedSeepage = weir.measuredFlowLitersPerSec * (1.0 + (maxStrainRatio > 0.8 ? (maxStrainRatio - 0.8) * 2.5 : 0.0));

    let hazard: CfrdSeepageHazard = 'SAFE_HERMETIC';
    const recommendations: string[] = [];

    if (internalPipingDetected || maxStrainRatio >= 1.2) {
      hazard = 'CRITICAL_PIPING_EMERGENCY';
      recommendations.push('CRITICAL: Initiate emergency spillway reservoir drawdown immediately.');
      recommendations.push('Deploy ROV side-scan sonar and dye tracer injection along perimetric plinth joint.');
      recommendations.push('Mobilize polymer mastic / polyurethane chemical grouting crews.');
    } else if (maxStrainRatio >= 0.85 || seepageRatio >= 2.0 || weir.turbidityNtu > 3.0) {
      hazard = 'ELEVATED_LEAKAGE_WARNING';
      recommendations.push('WARNING: Perimetric copper waterstop approaching tensile tear limit.');
      recommendations.push('Increase toe weir telemetry sampling frequency to 15-minute intervals.');
      recommendations.push('Execute acoustic hydrophone survey of upstream concrete face slab.');
    } else if (maxStrainRatio >= 0.5 || seepageRatio >= 1.3) {
      hazard = 'OBSERVATION_ADVISORY';
      recommendations.push('ADVISORY: Minor joint relaxation observed. Continue weekly piezometer correlation.');
    } else {
      hazard = 'SAFE_HERMETIC';
      recommendations.push('NOMINAL: Face slab joint kinematics within safe elasticity envelope.');
    }

    const auditDigest = this.computeDigest(dam.damId, maxDisplacement, seepageRatio, hazard);

    return {
      damId: dam.damId,
      hazardLevel: hazard,
      maxJointResultantDisplacementMm: Math.round(maxDisplacement * 100) / 100,
      waterstopStrainRatio: Math.round(maxStrainRatio * 1000) / 1000,
      seepageDeviationRatio: Math.round(seepageRatio * 100) / 100,
      internalPipingDetected,
      predictedSeepageFlowLps: Math.round(predictedSeepage * 10) / 10,
      engineeringRecommendations: recommendations,
      auditDigest
    };
  }

  private computeDigest(damId: string, disp: number, ratio: number, hazard: string): string {
    const raw = `${damId}|${disp.toFixed(2)}|${ratio.toFixed(2)}|${hazard}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = (hash << 5) - hash + ch;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(12, '0');
  }
}
