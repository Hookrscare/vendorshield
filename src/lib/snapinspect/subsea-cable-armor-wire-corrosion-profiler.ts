/**
 * SNAP-83: Subsea High-Voltage Inter-Array Cable Armor Wire Corrosion Profiler
 * 
 * Inspects galvanized steel armor wire layers on offshore wind 33kV/66kV subsea cables.
 * Evaluates ultrasonic wall-loss thickness, localized pitting depth, cathodic protection
 * potential (Ag/AgCl), and computes residual axial tensile capacity and structural integrity status.
 */

import { createHash } from 'crypto';

export interface CableArmorReading {
  chainageMeters: number;
  measuredOuterDiameterMm: number;
  corrosionPitDepthMm: number;
  cpPotentialMv: number; // Ag/AgCl reference electrode, mV (e.g. -800 to -1050 mV is protected)
  brokenWireCount: number;
}

export interface CableArmorDesignSpec {
  nominalWireDiameterMm: number;
  totalArmorWireCount: number;
  nominalTensileStrengthMpa: number; // e.g. 1770 MPa for galvanized high-strength steel
  maxPermissibleDiameterLossPct: number; // e.g. 15%
  maxAllowedBrokenWires: number; // e.g. 2
}

export interface ArmorPointAssessment {
  chainageMeters: number;
  diameterLossPct: number;
  effectiveWireDiameterMm: number;
  residualTensileCapacityKn: number;
  cpStatus: 'FULLY_PROTECTED' | 'UNDER_PROTECTED' | 'OVER_PROTECTED_HYDROGEN_RISK' | 'DEPLETED_CORROSIVE';
  integrityStatus: 'NORMAL' | 'WARNING_PITTING' | 'CRITICAL_REPLACEMENT_URGENT';
  assessmentDigest: string;
}

export interface SubseaArmorSurveySummary {
  surveyLengthMeters: number;
  totalPointsEvaluated: number;
  maxDiameterLossPct: number;
  averageDiameterLossPct: number;
  criticalPointsCount: number;
  overallIntegrity: 'PASS' | 'DEFECTS_DETECTED' | 'CRITICAL_FAIL';
  surveyDigestSha256: string;
  points: ArmorPointAssessment[];
}

export class SubseaCableArmorWireCorrosionProfiler {
  /**
   * Evaluates subsea cable inspection point readings against design specifications.
   */
  public evaluateSurvey(
    readings: CableArmorReading[],
    spec: CableArmorDesignSpec
  ): SubseaArmorSurveySummary {
    if (!readings || readings.length === 0) {
      throw new Error('Survey readings cannot be empty.');
    }
    if (spec.nominalWireDiameterMm <= 0 || spec.totalArmorWireCount <= 0) {
      throw new Error('Invalid cable design spec: wire diameter and count must be positive.');
    }

    let maxLossPct = 0;
    let sumLossPct = 0;
    let criticalCount = 0;

    const nominalSingleWireAreaMm2 = (Math.PI / 4) * Math.pow(spec.nominalWireDiameterMm, 2);

    const points: ArmorPointAssessment[] = readings.map((r) => {
      // Net diameter accounting for uniform thinning and pitting depth
      const effectiveDiameter = Math.max(0, r.measuredOuterDiameterMm - r.corrosionPitDepthMm);
      const diameterLossPct = Math.max(
        0,
        ((spec.nominalWireDiameterMm - effectiveDiameter) / spec.nominalWireDiameterMm) * 100
      );

      if (diameterLossPct > maxLossPct) {
        maxLossPct = diameterLossPct;
      }
      sumLossPct += diameterLossPct;

      // Residual tensile capacity calculation
      // Active intact wires = totalArmorWireCount - brokenWireCount
      const activeWires = Math.max(0, spec.totalArmorWireCount - r.brokenWireCount);
      const singleWireArea = (Math.PI / 4) * Math.pow(effectiveDiameter, 2);
      const totalAreaMm2 = activeWires * singleWireArea;
      // Force (kN) = Area (mm^2) * TensileStrength (MPa = N/mm^2) / 1000
      const residualTensileCapacityKn = (totalAreaMm2 * spec.nominalTensileStrengthMpa) / 1000.0;

      // Cathodic Protection status against standard DNV-RP-F106 / ISO 15589-2 criteria
      let cpStatus: ArmorPointAssessment['cpStatus'] = 'FULLY_PROTECTED';
      if (r.cpPotentialMv > -800) {
        // Less negative than -800 mV indicates under-protection / free corrosion
        cpStatus = r.cpPotentialMv > -650 ? 'DEPLETED_CORROSIVE' : 'UNDER_PROTECTED';
      } else if (r.cpPotentialMv < -1100) {
        // More negative than -1100 mV indicates hydrogen embrittlement danger for high-strength steel
        cpStatus = 'OVER_PROTECTED_HYDROGEN_RISK';
      }

      // Overall point integrity classification
      let integrityStatus: ArmorPointAssessment['integrityStatus'] = 'NORMAL';
      if (
        diameterLossPct >= spec.maxPermissibleDiameterLossPct ||
        r.brokenWireCount > spec.maxAllowedBrokenWires ||
        cpStatus === 'DEPLETED_CORROSIVE'
      ) {
        integrityStatus = 'CRITICAL_REPLACEMENT_URGENT';
        criticalCount++;
      } else if (diameterLossPct > spec.maxPermissibleDiameterLossPct * 0.6 || r.brokenWireCount > 0) {
        integrityStatus = 'WARNING_PITTING';
      }

      const pointHash = createHash('sha256')
        .update(`${r.chainageMeters}:${diameterLossPct.toFixed(2)}:${residualTensileCapacityKn.toFixed(1)}:${integrityStatus}`)
        .digest('hex');

      return {
        chainageMeters: r.chainageMeters,
        diameterLossPct: Math.round(diameterLossPct * 100) / 100,
        effectiveWireDiameterMm: Math.round(effectiveDiameter * 100) / 100,
        residualTensileCapacityKn: Math.round(residualTensileCapacityKn * 10) / 10,
        cpStatus,
        integrityStatus,
        assessmentDigest: pointHash
      };
    });

    const avgLossPct = sumLossPct / readings.length;
    const startChainage = readings[0].chainageMeters;
    const endChainage = readings[readings.length - 1].chainageMeters;
    const surveyLength = Math.abs(endChainage - startChainage);

    let overallIntegrity: SubseaArmorSurveySummary['overallIntegrity'] = 'PASS';
    if (criticalCount > 0) {
      overallIntegrity = 'CRITICAL_FAIL';
    } else if (points.some((p) => p.integrityStatus === 'WARNING_PITTING')) {
      overallIntegrity = 'DEFECTS_DETECTED';
    }

    const summaryDigest = createHash('sha256')
      .update(`${surveyLength}:${readings.length}:${maxLossPct.toFixed(2)}:${overallIntegrity}`)
      .digest('hex');

    return {
      surveyLengthMeters: Math.round(surveyLength * 10) / 10,
      totalPointsEvaluated: readings.length,
      maxDiameterLossPct: Math.round(maxLossPct * 100) / 100,
      averageDiameterLossPct: Math.round(avgLossPct * 100) / 100,
      criticalPointsCount: criticalCount,
      overallIntegrity,
      surveyDigestSha256: summaryDigest,
      points
    };
  }
}
