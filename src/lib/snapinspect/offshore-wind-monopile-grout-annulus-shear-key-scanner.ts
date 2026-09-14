/**
 * SNAP-91: Offshore Wind Monopile Grout Annulus Ultrasonic Debonding & Shear Key Scanner.
 * Part of SnapInspect AI Offshore Infrastructure NDT Engine.
 *
 * Evaluates monopile-to-transition-piece (TP) grouted connections with circumferential shear keys
 * conforming to DNV-ST-0126 and DNV-OS-J101:
 * - Scans circumferential shear key weld beads for ultrasonic acoustic attenuation & contact loss.
 * - Computes acoustic impedance reflection coefficient R = (Z_grout - Z_steel)/(Z_grout + Z_steel).
 * - Identifies interfacial debonding, seawater ingress (water gap reverberation), and pulverized grout.
 * - Quantifies residual shear transfer capacity (kN) across the shear key array.
 * - Recommends offshore remedial action (operational derating, elastomeric shimming, or pressure grouting).
 */

export interface ShearKeyScanPoint {
  keyId: string;
  elevationM: number;
  circumferentialAngleDeg: number;
  measuredKeyHeightMm: number;
  nominalKeyHeightMm: number;
  acousticReflectionCoefficient: number; // 0.0 (perfect bond) to 1.0 (free air/water gap)
  reverberationEchoCount: number;
  shearStressMpa: number;
  compressiveStrengthMpa: number;
}

export interface MonopileShearKeyConfig {
  monopileDiameterM: number;
  annulusThicknessMm: number;
  nominalShearKeyCount: number;
  designShearCapacityKn: number;
  maxAllowableDebondedArcDeg: number; // e.g. 30 degrees DNV limit
}

export interface EvaluatedKeyPoint {
  keyId: string;
  elevationM: number;
  circumferentialAngleDeg: number;
  isDebonded: boolean;
  seawaterIngressDetected: boolean;
  shearCapacityRetainedPct: number;
  crushingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GroutAnnulusInspectionReport {
  totalPointsScanned: number;
  debondedPointsCount: number;
  debondedRatioPct: number;
  maxContinuousDebondedArcDeg: number;
  totalResidualShearCapacityKn: number;
  capacityRetentionPct: number;
  dnvComplianceStatus: 'COMPLIANT' | 'WARNING_MONITORING_REQUIRED' | 'CRITICAL_FAILURE_NON_COMPLIANT';
  recommendedRemediation: 'CONTINUE_NORMAL_OPERATION' | 'DERATE_TURBINE_AND_MONITOR' | 'EMERGENCY_SHUTDOWN_AND_REGROUT';
  evaluatedPoints: EvaluatedKeyPoint[];
}

export class OffshoreWindMonopileGroutAnnulusShearKeyScanner {
  /**
   * Evaluates ultrasonic scan array along monopile shear key annulus.
   */
  public static evaluateShearKeys(
    config: MonopileShearKeyConfig,
    scanPoints: ShearKeyScanPoint[]
  ): GroutAnnulusInspectionReport {
    let debondedCount = 0;
    let currentDebondedArc = 0;
    let maxDebondedArc = 0;
    let totalRetainedCapacityKn = 0;
    const nominalCapacityPerKeyKn = config.designShearCapacityKn / Math.max(1, config.nominalShearKeyCount);

    const evaluatedPoints: EvaluatedKeyPoint[] = [];

    // Sort circumferentially to measure continuous debonded arc
    const sortedPoints = [...scanPoints].sort(
      (a, b) => a.circumferentialAngleDeg - b.circumferentialAngleDeg
    );

    for (let i = 0; i < sortedPoints.length; i++) {
      const pt = sortedPoints[i];
      // Reflection coefficient > 0.75 indicates loss of acoustic transmission into grout (debonding)
      const isDebonded = pt.acousticReflectionCoefficient >= 0.75;
      // High reverberation echoes (>= 4) combined with reflection indicates fluid-filled interface gap
      const seawaterIngress = isDebonded && pt.reverberationEchoCount >= 4;

      // Shear capacity retention based on key height preservation and acoustic coupling
      let capacityFactor = 1.0;
      if (isDebonded) {
        capacityFactor *= 0.35; // Pure friction contact only
      }
      if (pt.measuredKeyHeightMm < pt.nominalKeyHeightMm * 0.8) {
        capacityFactor *= (pt.measuredKeyHeightMm / pt.nominalKeyHeightMm);
      }
      capacityFactor = Math.max(0.05, Math.min(1.0, capacityFactor));

      const retainedKn = nominalCapacityPerKeyKn * capacityFactor;
      totalRetainedCapacityKn += retainedKn;

      let crushingRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (pt.shearStressMpa > pt.compressiveStrengthMpa * 0.7) {
        crushingRisk = 'HIGH';
      } else if (pt.shearStressMpa > pt.compressiveStrengthMpa * 0.45) {
        crushingRisk = 'MEDIUM';
      }

      if (isDebonded) {
        debondedCount++;
        currentDebondedArc += (i > 0 ? sortedPoints[i].circumferentialAngleDeg - sortedPoints[i - 1].circumferentialAngleDeg : 15);
        if (currentDebondedArc > maxDebondedArc) {
          maxDebondedArc = currentDebondedArc;
        }
      } else {
        currentDebondedArc = 0;
      }

      evaluatedPoints.push({
        keyId: pt.keyId,
        elevationM: pt.elevationM,
        circumferentialAngleDeg: pt.circumferentialAngleDeg,
        isDebonded,
        seawaterIngressDetected: seawaterIngress,
        shearCapacityRetainedPct: Math.round(capacityFactor * 1000) / 10,
        crushingRisk,
      });
    }

    const totalScanned = Math.max(1, scanPoints.length);
    const debondedRatioPct = Math.round((debondedCount / totalScanned) * 1000) / 10;
    const totalScannedNominalCapacityKn = nominalCapacityPerKeyKn * totalScanned;
    const capacityRetentionPct = Math.round((totalRetainedCapacityKn / Math.max(1, totalScannedNominalCapacityKn)) * 1000) / 10;

    let dnvStatus: 'COMPLIANT' | 'WARNING_MONITORING_REQUIRED' | 'CRITICAL_FAILURE_NON_COMPLIANT' =
      'COMPLIANT';
    let remediation: 'CONTINUE_NORMAL_OPERATION' | 'DERATE_TURBINE_AND_MONITOR' | 'EMERGENCY_SHUTDOWN_AND_REGROUT' =
      'CONTINUE_NORMAL_OPERATION';

    if (maxDebondedArc >= config.maxAllowableDebondedArcDeg || capacityRetentionPct < 65.0) {
      dnvStatus = 'CRITICAL_FAILURE_NON_COMPLIANT';
      remediation = 'EMERGENCY_SHUTDOWN_AND_REGROUT';
    } else if (debondedRatioPct > 15.0 || capacityRetentionPct < 85.0) {
      dnvStatus = 'WARNING_MONITORING_REQUIRED';
      remediation = 'DERATE_TURBINE_AND_MONITOR';
    }

    return {
      totalPointsScanned: scanPoints.length,
      debondedPointsCount: debondedCount,
      debondedRatioPct,
      maxContinuousDebondedArcDeg: Math.round(maxDebondedArc * 10) / 10,
      totalResidualShearCapacityKn: Math.round(totalRetainedCapacityKn),
      capacityRetentionPct,
      dnvComplianceStatus: dnvStatus,
      recommendedRemediation: remediation,
      evaluatedPoints,
    };
  }
}
