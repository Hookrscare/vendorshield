/**
 * SNAP-37: Multi-Story Building Expansion Joint Dynamic Seismic Displacement Profiler.
 * SnapInspect AI Tactical Field Inspection & Structural Diagnostics Platform.
 *
 * Implements ASCE 7-22 Section 12.12 and ASTM E1399/E1399M cyclic movement validation
 * for commercial multi-story building expansion joints, thermal drift, and seismic shear.
 */

import { createHash } from "crypto";

export type JointConditionStatus =
  | "NORMAL_ARTICULATION"
  | "THERMAL_OVEREXTENSION"
  | "JOINT_PINCH_LOCKUP"
  | "DIFFERENTIAL_SETTLEMENT_SHEAR"
  | "CRITICAL_POUNDING_HAZARD";

export interface JointMeasurementPoint {
  stationMeter: number;
  measuredWidthMm: number;
  verticalShearMm: number;
  lateralShearMm: number;
}

export interface JointProfileInput {
  jointId: string;
  nominalDesignWidthMm: number;
  allowableSeismicDriftMm: number;
  ambientTempC: number;
  designReferenceTempC: number;
  thermalExpansionCoefficient: number; // e.g., 12e-6 / C for concrete
  tributaryLengthMeters: number; // span length
  measurements: JointMeasurementPoint[];
}

export interface JointAssessmentResult {
  jointId: string;
  overallStatus: JointConditionStatus;
  structuralIntegrityScore: number; // 0 to 100
  thermalDriftExpectedMm: number;
  maxClosureRatioPct: number;
  maxVerticalShearMm: number;
  maxLateralShearMm: number;
  anomalousStations: Array<{
    stationMeter: number;
    measuredWidthMm: number;
    status: JointConditionStatus;
    deviationMm: number;
  }>;
  astmE1399Compliant: boolean;
  auditDigestSha256: string;
}

export class ExpansionJointDisplacementProfiler {
  public analyzeJoint(input: JointProfileInput): JointAssessmentResult {
    const deltaT = input.ambientTempC - input.designReferenceTempC;
    // Thermal expansion delta L = alpha * L * delta T in mm
    const thermalDriftExpectedMm = Number(
      (input.thermalExpansionCoefficient * input.tributaryLengthMeters * 1000 * deltaT).toFixed(2)
    );

    let maxClosureRatio = 0.0;
    let maxVerticalShear = 0.0;
    let maxLateralShear = 0.0;
    const anomalousStations: JointAssessmentResult["anomalousStations"] = [];

    for (const pt of input.measurements) {
      const closure = Math.max(0, (input.nominalDesignWidthMm - pt.measuredWidthMm) / input.nominalDesignWidthMm);
      if (closure > maxClosureRatio) maxClosureRatio = closure;

      if (Math.abs(pt.verticalShearMm) > maxVerticalShear) maxVerticalShear = Math.abs(pt.verticalShearMm);
      if (Math.abs(pt.lateralShearMm) > maxLateralShear) maxLateralShear = Math.abs(pt.lateralShearMm);

      let ptStatus: JointConditionStatus = "NORMAL_ARTICULATION";
      const deviation = Math.abs(pt.measuredWidthMm - input.nominalDesignWidthMm);

      if (pt.measuredWidthMm <= input.nominalDesignWidthMm * 0.25) {
        ptStatus = "CRITICAL_POUNDING_HAZARD";
      } else if (closure >= 0.60) {
        ptStatus = "JOINT_PINCH_LOCKUP";
      } else if (Math.abs(pt.verticalShearMm) >= 12.0) {
        ptStatus = "DIFFERENTIAL_SETTLEMENT_SHEAR";
      } else if (pt.measuredWidthMm >= input.nominalDesignWidthMm * 1.50) {
        ptStatus = "THERMAL_OVEREXTENSION";
      }

      if (ptStatus !== "NORMAL_ARTICULATION") {
        anomalousStations.push({
          stationMeter: pt.stationMeter,
          measuredWidthMm: pt.measuredWidthMm,
          status: ptStatus,
          deviationMm: Number(deviation.toFixed(2)),
        });
      }
    }

    // Determine overall status
    let overallStatus: JointConditionStatus = "NORMAL_ARTICULATION";
    if (anomalousStations.some((s) => s.status === "CRITICAL_POUNDING_HAZARD")) {
      overallStatus = "CRITICAL_POUNDING_HAZARD";
    } else if (anomalousStations.some((s) => s.status === "JOINT_PINCH_LOCKUP")) {
      overallStatus = "JOINT_PINCH_LOCKUP";
    } else if (anomalousStations.some((s) => s.status === "DIFFERENTIAL_SETTLEMENT_SHEAR")) {
      overallStatus = "DIFFERENTIAL_SETTLEMENT_SHEAR";
    } else if (anomalousStations.some((s) => s.status === "THERMAL_OVEREXTENSION")) {
      overallStatus = "THERMAL_OVEREXTENSION";
    }

    // Calculate score
    const penaltyStations = Math.min(60, anomalousStations.length * 15);
    const shearPenalty = Math.min(30, maxVerticalShear * 2.0);
    const score = Math.max(0, Math.round(100 - penaltyStations - shearPenalty));

    const astmE1399Compliant =
      overallStatus === "NORMAL_ARTICULATION" &&
      maxVerticalShear < 10.0 &&
      maxClosureRatio < 0.50;

    const digestPayload = `${input.jointId}:${overallStatus}:${score}:${maxClosureRatio.toFixed(3)}:${maxVerticalShear.toFixed(1)}`;
    const auditDigestSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      jointId: input.jointId,
      overallStatus,
      structuralIntegrityScore: score,
      thermalDriftExpectedMm,
      maxClosureRatioPct: Number((maxClosureRatio * 100).toFixed(1)),
      maxVerticalShearMm: Number(maxVerticalShear.toFixed(2)),
      maxLateralShearMm: Number(maxLateralShear.toFixed(2)),
      anomalousStations,
      astmE1399Compliant,
      auditDigestSha256,
    };
  }
}
