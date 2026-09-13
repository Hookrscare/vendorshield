/**
 * deepwater-mooring-chain-interlink-wear-laser-scanner.ts
 * SNAP-81: Deepwater Mooring Chain Interlink Wear Laser Scanner
 * Part of SnapInspect AI NDT Inspection & Subsea Offshore Suite.
 * 
 * Inverts subsea ROV 3D laser point clouds to evaluate mooring chain interlink grip wear,
 * cross-sectional area reduction, and DNV-OS-E301 retirement thresholds.
 */

export interface MooringChainScanParameters {
  chainGrade: 'R3' | 'R3S' | 'R4' | 'R4S' | 'R5';
  nominalDiameterMm: number; // e.g. 120 mm
  measuredMinDiameterMm: number; // e.g. 110 mm
  linkPitchMeasuredMm: number;
  nominalLinkPitchMm: number;
  annualTensionCycles: number;
  nominalTensionKn: number;
}

export interface MooringChainWearAssessment {
  crossSectionalAreaLossPercent: number;
  diameterReductionPercent: number;
  pitchElongationPercent: number;
  dnvStatus: 'ACCEPTABLE_SERVICE_LIMIT' | 'ACTION_REQUIRED_SCHEDULE_REPLACEMENT' | 'CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION';
  estimatedRemainingLifeYears: number;
  requiresImmediateDecommission: boolean;
}

export class DeepwaterMooringChainInterlinkWearLaserScanner {
  public static evaluateChainWear(params: MooringChainScanParameters): MooringChainWearAssessment {
    if (params.nominalDiameterMm <= 0 || params.measuredMinDiameterMm <= 0) {
      throw new Error('Diameters must be positive.');
    }

    if (params.measuredMinDiameterMm > params.nominalDiameterMm * 1.05) {
      throw new Error('Measured diameter cannot exceed nominal diameter beyond 5% tolerance.');
    }

    // Diameter reduction %
    const diameterLossMm = params.nominalDiameterMm - params.measuredMinDiameterMm;
    const diameterReductionPercent = Math.max(0, (diameterLossMm / params.nominalDiameterMm) * 100);

    // Cross sectional area loss %: (1 - d_min^2 / d_nom^2) * 100
    const nominalArea = Math.PI * Math.pow(params.nominalDiameterMm / 2, 2);
    const measuredArea = Math.PI * Math.pow(params.measuredMinDiameterMm / 2, 2);
    const crossSectionalAreaLossPercent = Math.max(0, ((nominalArea - measuredArea) / nominalArea) * 100);

    // Pitch elongation %
    const pitchElongationPercent = Math.max(
      0,
      ((params.linkPitchMeasuredMm - params.nominalLinkPitchMm) / params.nominalLinkPitchMm) * 100
    );

    // DNV-OS-E301 limits:
    // Discard threshold typically > 10% diameter reduction or > 15% area loss or > 5% pitch elongation
    let dnvStatus: 'ACCEPTABLE_SERVICE_LIMIT' | 'ACTION_REQUIRED_SCHEDULE_REPLACEMENT' | 'CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION' = 'ACCEPTABLE_SERVICE_LIMIT';
    let requiresImmediateDecommission = false;

    if (crossSectionalAreaLossPercent >= 15.0 || pitchElongationPercent >= 5.0) {
      dnvStatus = 'CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION';
      requiresImmediateDecommission = true;
    } else if (crossSectionalAreaLossPercent >= 9.0 || pitchElongationPercent >= 3.0) {
      dnvStatus = 'ACTION_REQUIRED_SCHEDULE_REPLACEMENT';
    }

    // Remaining fatigue life estimation based on wear rate & stress amplification
    // Stress amplification factor ~ 1 / (1 - areaLoss/100)
    const stressAmplification = 1.0 / Math.max(0.1, 1.0 - (crossSectionalAreaLossPercent / 100));
    const baseLifeYears = 25.0;
    const estimatedRemainingLifeYears = Math.max(
      0.1,
      Math.round((baseLifeYears / Math.pow(stressAmplification, 3.0) - (crossSectionalAreaLossPercent * 0.8)) * 10) / 10
    );

    return {
      crossSectionalAreaLossPercent: Math.round(crossSectionalAreaLossPercent * 100) / 100,
      diameterReductionPercent: Math.round(diameterReductionPercent * 100) / 100,
      pitchElongationPercent: Math.round(pitchElongationPercent * 100) / 100,
      dnvStatus,
      estimatedRemainingLifeYears: requiresImmediateDecommission ? 0.0 : estimatedRemainingLifeYears,
      requiresImmediateDecommission,
    };
  }
}
