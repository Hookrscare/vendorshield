/**
 * src/lib/snapinspect/subsea-flexible-riser-hydrodynamic-drag-profiler.ts
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * SNAP-83: Offshore Subsea Flexible Riser Hydrodynamic Drag Profiler.
 * Profiles ocean current hydrodynamic drag forces and marine biofouling drag
 * amplification across subsea flexible riser catenaries. Evaluates API 17J/17B
 * clashing margins, touchdown zone (TDZ) curvature stress, and ROV water-jet cleaning triggers.
 */

import { createHash } from 'crypto';

export type DragIntegrityTier =
  | 'NORMAL_HYDRODYNAMIC_DRAG'
  | 'ELEVATED_FOULING_DRAG'
  | 'CRITICAL_CLASHING_RISK_CLEANING_REQUIRED';

export interface RiserHydrodynamicConfig {
  riserId: string;
  nominalOuterDiameterM: number;
  riserLengthM: number;
  waterDepthM: number;
  nominalSeawaterDensityKgM3: number; // ~1025 kg/m^3
  adjacentRiserSeparationM: number;
}

export interface CurrentDepthProfileBin {
  depthM: number;
  currentVelocityMS: number;
  marineGrowthThicknessM: number;
}

export interface RiserHydrodynamicAssessment {
  riserId: string;
  maxEffectiveDiameterM: number;
  maxDragCoefficientCd: number;
  totalIntegratedDragForceKn: number;
  maxLateralDeflectionM: number;
  residualSeparationM: number;
  clashingRisk: boolean;
  integrityTier: DragIntegrityTier;
  recommendedAction: string;
  telemetryDigestSha256: string;
}

export class SubseaFlexibleRiserHydrodynamicDragProfiler {
  public static profileRiserDrag(
    config: RiserHydrodynamicConfig,
    depthBins: CurrentDepthProfileBin[]
  ): RiserHydrodynamicAssessment {
    if (depthBins.length === 0) {
      throw new Error('Depth profile bins cannot be empty.');
    }

    let maxEffD = config.nominalOuterDiameterM;
    let maxCd = 0.7; // baseline smooth cylinder Cd in subsea flow
    let totalDragN = 0.0;
    const rho = config.nominalSeawaterDensityKgM3;

    // Sort bins by depth ascending
    const sorted = [...depthBins].sort((a, b) => a.depthM - b.depthM);
    const binHeightM = config.riserLengthM / sorted.length;

    for (const bin of sorted) {
      const effD = config.nominalOuterDiameterM + 2.0 * bin.marineGrowthThicknessM;
      if (effD > maxEffD) maxEffD = effD;

      // Relative roughness k / D
      const relRoughness = bin.marineGrowthThicknessM / Math.max(1e-4, config.nominalOuterDiameterM);
      // Rough cylinder drag coefficient model (API RP 2RD / DNV-RP-F204)
      const cd = Math.min(2.2, 0.7 + 1.2 * Math.min(1.0, relRoughness * 10.0));
      if (cd > maxCd) maxCd = cd;

      // Drag per unit length: dF_D = 0.5 * rho * Cd * D_eff * v^2
      const dragPerMeter = 0.5 * rho * cd * effD * Math.pow(bin.currentVelocityMS, 2);
      totalDragN += dragPerMeter * binHeightM;
    }

    const totalDragKn = totalDragN / 1000.0;

    // Approximate lateral catenary deflection: delta_x ~ (F_drag * L^2) / (8 * Tension)
    // For nominal tension of 250 kN
    const nominalTensionKn = 250.0;
    const lateralDeflectionM = (totalDragKn * Math.pow(config.riserLengthM / config.waterDepthM, 1.2)) / nominalTensionKn;

    const residualSeparationM = Math.max(0.0, config.adjacentRiserSeparationM - lateralDeflectionM);
    const clashingRisk = residualSeparationM < 1.5; // < 1.5m clearance is clashing hazard

    let tier: DragIntegrityTier;
    let action: string;

    if (clashingRisk || maxCd >= 1.8) {
      tier = 'CRITICAL_CLASHING_RISK_CLEANING_REQUIRED';
      action = 'DEPLOY_ROV_WATERJET_DEFOULING_IMMEDIATELY';
    } else if (maxCd > 1.1 || totalDragKn > 35.0) {
      tier = 'ELEVATED_FOULING_DRAG';
      action = 'SCHEDULE_DEFOULING_WITHIN_30_DAYS';
    } else {
      tier = 'NORMAL_HYDRODYNAMIC_DRAG';
      action = 'CONTINUE_ROUTINE_MONITORING';
    }

    const raw = `${config.riserId}:${totalDragKn.toFixed(2)}:${residualSeparationM.toFixed(2)}:${tier}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      riserId: config.riserId,
      maxEffectiveDiameterM: Math.round(maxEffD * 1000) / 1000,
      maxDragCoefficientCd: Math.round(maxCd * 100) / 100,
      totalIntegratedDragForceKn: Math.round(totalDragKn * 100) / 100,
      maxLateralDeflectionM: Math.round(lateralDeflectionM * 100) / 100,
      residualSeparationM: Math.round(residualSeparationM * 100) / 100,
      clashingRisk,
      integrityTier: tier,
      recommendedAction: action,
      telemetryDigestSha256: digest
    };
  }
}
