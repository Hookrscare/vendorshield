/**
 * SNAP-71: Superconducting Radiofrequency (SRF) Particle Accelerator Cavity Surface Defect Profiler
 * 
 * Profiles microscopic surface defects and weld anomalies on high-purity niobium SRF cavities (2 K, 1.3 GHz),
 * computing localized magnetic field enhancement, quench threshold, and remediation requirement.
 */

export interface SrfSurfaceDefect {
  defectId: string;
  locationCellIndex: number; // e.g. 1 to 9 for 9-cell TESLA cavity
  isEquatorialWeldRegion: boolean;
  defectDiameterMicrons: number;
  defectDepthMicrons: number;
  edgeRadiusMicrons: number;
}

export interface CavityOperatingParameters {
  frequencyGhz: number; // default 1.3
  niobiumSuperheatingFieldMt: number; // default 210.0 mT
  bpkOverEaccRatioMtPerMvPerM: number; // default 4.26 mT / (MV/m)
  targetOperatingGradientMvPerM: number; // target E_acc e.g. 25.0 to 35.0 MV/m
}

export interface SrfDefectProfileAssessment {
  defectId: string;
  magneticEnhancementFactorBetaM: number;
  quenchGradientLimitMvPerM: number;
  isQuenchRiskAtTargetGradient: boolean;
  recommendedRemediation: 'NONE_ACCEPTABLE' | 'LOCAL_MECHANICAL_GRINDING' | 'CENTRIFUGAL_BARREL_POLISHING_EP';
}

export class SrfAcceleratorCavityDefectProfiler {
  private readonly defaultParams: CavityOperatingParameters = {
    frequencyGhz: 1.3,
    niobiumSuperheatingFieldMt: 210.0,
    bpkOverEaccRatioMtPerMvPerM: 4.26,
    targetOperatingGradientMvPerM: 31.5, // Standard ILC/TESLA specification
  };

  public profileDefect(
    defect: SrfSurfaceDefect,
    params: Partial<CavityOperatingParameters> = {}
  ): SrfDefectProfileAssessment {
    const config = { ...this.defaultParams, ...params };

    const depth = Math.max(0.1, defect.defectDepthMicrons);
    const radius = Math.max(0.1, defect.edgeRadiusMicrons);

    // Magnetic enhancement factor beta_M approx 1.0 + 1.2 * sqrt(depth / edgeRadius)
    // Sharper pit/weld edge generates higher local field crowding
    const sharpnessRatio = depth / radius;
    const betaM = 1.0 + 1.15 * Math.sqrt(sharpnessRatio);

    // Quench gradient E_acc,quench = B_sh / (beta_M * (B_pk / E_acc))
    const peakBpkLimit = config.niobiumSuperheatingFieldMt / betaM;
    const quenchLimitMvPerM = peakBpkLimit / config.bpkOverEaccRatioMtPerMvPerM;

    const isQuenchRisk = quenchLimitMvPerM < config.targetOperatingGradientMvPerM;

    let remediation: 'NONE_ACCEPTABLE' | 'LOCAL_MECHANICAL_GRINDING' | 'CENTRIFUGAL_BARREL_POLISHING_EP' = 'NONE_ACCEPTABLE';

    if (isQuenchRisk) {
      if (defect.isEquatorialWeldRegion && defect.defectDepthMicrons > 25.0) {
        remediation = 'CENTRIFUGAL_BARREL_POLISHING_EP';
      } else {
        remediation = 'LOCAL_MECHANICAL_GRINDING';
      }
    }

    return {
      defectId: defect.defectId,
      magneticEnhancementFactorBetaM: Number(betaM.toFixed(3)),
      quenchGradientLimitMvPerM: Number(quenchLimitMvPerM.toFixed(1)),
      isQuenchRiskAtTargetGradient: isQuenchRisk,
      recommendedRemediation: remediation,
    };
  }
}
