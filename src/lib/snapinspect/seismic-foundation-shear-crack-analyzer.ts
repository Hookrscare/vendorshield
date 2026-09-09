/**
 * src/lib/snapinspect/seismic-foundation-shear-crack-analyzer.ts
 * SNAP-36: Seismic Foundation Shear Crack Structural Degradation Rate Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements ACI 224.1R-07 & FEMA P-154 structural concrete crack evaluation:
 * - Quantifies shear, diagonal stepped, and flexural crack kinematics.
 * - Tracks crack width growth rate (dw/dt in mm/year) across multi-epoch gauge readings.
 * - Calculates differential foundation settlement angular distortion (beta = Delta / L).
 * - Classifies structural hazard risk tiers from cosmetic hairline to imminent collapse.
 * - Generates structural remediation takeoffs (CFRP stitch pins, polyurethane/epoxy grout).
 */

import { createHash } from 'crypto';

export interface CrackObservationEpoch {
  timestampIso: string;
  crackWidthMm: number;
  crackDepthMm?: number;
  relativeDisplacementXmm?: number; // In-plane shear slip
  relativeDisplacementYmm?: number; // Out-of-plane heave/settlement
}

export interface FoundationCrackInput {
  crackId: string;
  elementLocation: 'STEM_WALL' | 'GRADE_BEAM' | 'RETAINING_WALL' | 'SPREAD_FOOTING';
  crackType: 'DIAGONAL_SHEAR' | 'STEPPED_MORTAR' | 'VERTICAL_SHRINKAGE' | 'HORIZONTAL_SOIL_PRESSURE';
  crackLengthMeters: number;
  wallSpanLengthMeters: number;
  maxDifferentialSettlementMm: number;
  epochs: CrackObservationEpoch[];
  rebarCorrosionObserved: boolean;
}

export interface RemediationTakeoff {
  epoxyInjectionVolumeLiters: number;
  cfrpStitchingStrapCount: number;
  helicalUnderpinningPilesCount: number;
  estimatedMaterialCostUsd: number;
}

export interface SeismicStructuralAnalysisResult {
  crackId: string;
  elementLocation: string;
  currentCrackWidthMm: number;
  crackGrowthRateMmPerYear: number;
  settlementAngularDistortionBeta: number; // Radian ratio
  hazardClassification: 'NEGLIGIBLE_HAIRLINE' | 'MODERATE_WATERPROOFING_DEFECT' | 'SEVERE_STRUCTURAL_SHEAR' | 'CRITICAL_COLLAPSE_HAZARD';
  actionRequired: 'MONITOR_PERIODICALLY' | 'PRESSURE_INJECT_EPOXY' | 'STRUCTURAL_CFRP_STITCHING' | 'EMERGENCY_SHORING_AND_UNDERPINNING';
  takeoff: RemediationTakeoff;
  auditHash: string;
}

export class SeismicFoundationShearCrackAnalyzer {
  /**
   * Analyzes foundation crack kinematics according to ACI 224.1R and FEMA guidelines.
   */
  public analyzeCrack(input: FoundationCrackInput): SeismicStructuralAnalysisResult {
    if (!input.epochs || input.epochs.length === 0) {
      throw new Error('At least one measurement epoch is required.');
    }

    // Sort epochs chronologically
    const sorted = [...input.epochs].sort(
      (a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime()
    );

    const firstEpoch = sorted[0];
    const latestEpoch = sorted[sorted.length - 1];
    const currentWidth = latestEpoch.crackWidthMm;

    // Calculate growth velocity dw/dt (mm/year)
    let growthRatePerYear = 0.0;
    if (sorted.length > 1) {
      const deltaMs = new Date(latestEpoch.timestampIso).getTime() - new Date(firstEpoch.timestampIso).getTime();
      const deltaYears = Math.max(0.001, deltaMs / (1000 * 3600 * 24 * 365.25));
      const deltaWidth = Math.max(0, latestEpoch.crackWidthMm - firstEpoch.crackWidthMm);
      growthRatePerYear = Math.round((deltaWidth / deltaYears) * 100) / 100;
    }

    // Settlement angular distortion beta = Delta / L
    const wallSpanMm = input.wallSpanLengthMeters * 1000;
    const beta = wallSpanMm > 0 ? input.maxDifferentialSettlementMm / wallSpanMm : 0;

    // Structural Hazard Categorization (ACI 224.1R Table 4.1 & Skempton/MacDonald settlement criteria)
    let hazard: SeismicStructuralAnalysisResult['hazardClassification'] = 'NEGLIGIBLE_HAIRLINE';
    let action: SeismicStructuralAnalysisResult['actionRequired'] = 'MONITOR_PERIODICALLY';

    // Angular distortion limit for structural damage is typically 1/150 (0.00667)
    if (currentWidth >= 5.0 || beta >= 0.00667 || (input.crackType === 'DIAGONAL_SHEAR' && currentWidth >= 3.5)) {
      hazard = 'CRITICAL_COLLAPSE_HAZARD';
      action = 'EMERGENCY_SHORING_AND_UNDERPINNING';
    } else if (currentWidth >= 1.5 || beta >= 0.00333 || input.rebarCorrosionObserved || growthRatePerYear >= 0.5) {
      hazard = 'SEVERE_STRUCTURAL_SHEAR';
      action = 'STRUCTURAL_CFRP_STITCHING';
    } else if (currentWidth >= 0.3) {
      hazard = 'MODERATE_WATERPROOFING_DEFECT';
      action = 'PRESSURE_INJECT_EPOXY';
    }

    // Compute remediation material takeoff
    // Epoxy injection volume = crack length (m) * crack depth (avg 200mm) * crack width (mm) * 1.3 waste
    const avgDepthMm = latestEpoch.crackDepthMm || 200;
    const crackVolLiters = (input.crackLengthMeters * (avgDepthMm / 1000) * (currentWidth / 1000) * 1000) * 1.35;
    const epoxyLiters = Math.max(0.5, Math.round(crackVolLiters * 10) / 10);

    // CFRP stitches spaced every 0.3m along crack length for severe cracks
    const cfrpCount = (action === 'STRUCTURAL_CFRP_STITCHING' || action === 'EMERGENCY_SHORING_AND_UNDERPINNING')
      ? Math.max(3, Math.ceil(input.crackLengthMeters / 0.3))
      : 0;

    // Helical underpinning piles if settlement distortion beta is excessive
    const pilesCount = (action === 'EMERGENCY_SHORING_AND_UNDERPINNING')
      ? Math.max(2, Math.ceil(input.wallSpanLengthMeters / 2.5))
      : 0;

    // Material takeoff cost estimate
    const costUsd = (epoxyLiters * 45) + (cfrpCount * 120) + (pilesCount * 2200);

    const payload = `${input.crackId}:${currentWidth}:${growthRatePerYear}:${beta.toFixed(5)}:${hazard}:${costUsd}`;
    const hash = createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();

    return {
      crackId: input.crackId,
      elementLocation: input.elementLocation,
      currentCrackWidthMm: currentWidth,
      crackGrowthRateMmPerYear: growthRatePerYear,
      settlementAngularDistortionBeta: Math.round(beta * 100000) / 100000,
      hazardClassification: hazard,
      actionRequired: action,
      takeoff: {
        epoxyInjectionVolumeLiters: epoxyLiters,
        cfrpStitchingStrapCount: cfrpCount,
        helicalUnderpinningPilesCount: pilesCount,
        estimatedMaterialCostUsd: Math.round(costUsd)
      },
      auditHash: `FEMA-P154-CRACK-${hash}`
    };
  }
}
