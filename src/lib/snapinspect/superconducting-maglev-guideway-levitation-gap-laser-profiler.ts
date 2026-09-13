/**
 * SNAP-73: High-Speed Maglev Guideway Superconducting Levitation Gap Laser Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Inspects superconducting electrodynamic suspension (EDS) and electromagnetic suspension (EMS)
 * guideway levitation airgaps, stator pack vertical/lateral step misalignment, and high-speed dynamic stability.
 */

import { createHash } from "crypto";

export interface MaglevGuidewaySpec {
  guidewayType: "EDS_SUPERCONDUCTING" | "EMS_ELECTROMAGNETIC";
  nominalLevitationGapMm: number; // e.g. 100 mm for EDS, 10 mm for EMS
  allowableGapToleranceMm: number; // e.g. +/- 10 mm for EDS, +/- 2 mm for EMS
  maxStatorStepMisalignmentMm: number; // e.g. 1.5 mm at 500 km/h
  speedKmh: number;
}

export interface LaserGapMeasurementPoint {
  chainageKm: number;
  measuredLeftGapMm: number;
  measuredRightGapMm: number;
  statorStepJumpMm: number;
}

export interface GuidewayAnomalyAlert {
  chainageKm: number;
  severity: "CRITICAL_TRIP" | "WARNING" | "MAINTENANCE_REQUIRED";
  anomalyType: "LEVITATION_GAP_COLLAPSE" | "EXCESSIVE_AIRGAP" | "STATOR_STEP_MISALIGNMENT" | "ASYMMETRIC_ROLL_TILT";
  description: string;
}

export interface MaglevGuidewayProfileResult {
  totalInspectedDistanceKm: number;
  meanLeftGapMm: number;
  meanRightGapMm: number;
  maxStatorStepJumpMm: number;
  rmsRoughnessMm: number;
  isSafeForHighSpeedOperation: boolean;
  alerts: GuidewayAnomalyAlert[];
  inspectionDigest: string;
}

export class SuperconductingMaglevGuidewayLevitationGapLaserProfiler {
  public static profileGuideway(
    spec: MaglevGuidewaySpec,
    measurements: LaserGapMeasurementPoint[]
  ): MaglevGuidewayProfileResult {
    if (!measurements || measurements.length === 0) {
      throw new Error("Guideway laser measurements cannot be empty.");
    }

    let sumLeft = 0;
    let sumRight = 0;
    let maxStepJump = 0;
    let sumSquaredDeviation = 0;
    const alerts: GuidewayAnomalyAlert[] = [];

    const minCriticalGap = spec.nominalLevitationGapMm * 0.70;
    const maxCriticalGap = spec.nominalLevitationGapMm * 1.30;
    const minWarningGap = spec.nominalLevitationGapMm - spec.allowableGapToleranceMm;
    const maxWarningGap = spec.nominalLevitationGapMm + spec.allowableGapToleranceMm;

    for (const pt of measurements) {
      sumLeft += pt.measuredLeftGapMm;
      sumRight += pt.measuredRightGapMm;

      if (pt.statorStepJumpMm > maxStepJump) {
        maxStepJump = pt.statorStepJumpMm;
      }

      // Check stator step jump
      if (pt.statorStepJumpMm > spec.maxStatorStepMisalignmentMm) {
        alerts.push({
          chainageKm: pt.chainageKm,
          severity: pt.statorStepJumpMm > spec.maxStatorStepMisalignmentMm * 1.5 ? "CRITICAL_TRIP" : "WARNING",
          anomalyType: "STATOR_STEP_MISALIGNMENT",
          description: `Stator step misalignment ${pt.statorStepJumpMm.toFixed(2)} mm exceeds threshold ${spec.maxStatorStepMisalignmentMm} mm.`
        });
      }

      // Check left/right gaps
      for (const [side, gap] of [["Left", pt.measuredLeftGapMm], ["Right", pt.measuredRightGapMm]] as const) {
        const dev = gap - spec.nominalLevitationGapMm;
        sumSquaredDeviation += dev * dev;

        if (gap <= minCriticalGap) {
          alerts.push({
            chainageKm: pt.chainageKm,
            severity: "CRITICAL_TRIP",
            anomalyType: "LEVITATION_GAP_COLLAPSE",
            description: `${side} levitation gap collapsed to ${gap.toFixed(2)} mm (critical trip <= ${minCriticalGap.toFixed(1)} mm).`
          });
        } else if (gap >= maxCriticalGap) {
          alerts.push({
            chainageKm: pt.chainageKm,
            severity: "CRITICAL_TRIP",
            anomalyType: "EXCESSIVE_AIRGAP",
            description: `${side} levitation gap expanded to ${gap.toFixed(2)} mm (magnetic flux decoupling risk).`
          });
        } else if (gap < minWarningGap || gap > maxWarningGap) {
          alerts.push({
            chainageKm: pt.chainageKm,
            severity: "WARNING",
            anomalyType: gap < minWarningGap ? "LEVITATION_GAP_COLLAPSE" : "EXCESSIVE_AIRGAP",
            description: `${side} levitation gap ${gap.toFixed(2)} mm out of tolerance (${minWarningGap.toFixed(1)} - ${maxWarningGap.toFixed(1)} mm).`
          });
        }
      }

      // Check roll tilt asymmetry
      const tiltAsymmetry = Math.abs(pt.measuredLeftGapMm - pt.measuredRightGapMm);
      if (tiltAsymmetry > spec.allowableGapToleranceMm * 0.8) {
        alerts.push({
          chainageKm: pt.chainageKm,
          severity: "WARNING",
          anomalyType: "ASYMMETRIC_ROLL_TILT",
          description: `Differential airgap ${tiltAsymmetry.toFixed(2)} mm indicates excessive bogie roll angle.`
        });
      }
    }

    const n = measurements.length;
    const meanLeft = sumLeft / n;
    const meanRight = sumRight / n;
    const rmsRoughness = Math.sqrt(sumSquaredDeviation / (2 * n));

    const hasCritical = alerts.some((a) => a.severity === "CRITICAL_TRIP");
    const isSafe = !hasCritical;

    const startKm = measurements[0].chainageKm;
    const endKm = measurements[measurements.length - 1].chainageKm;
    const distanceKm = Math.max(0, endKm - startKm);

    const rawDigest = `${spec.guidewayType}:${spec.speedKmh}:${meanLeft.toFixed(2)}:${meanRight.toFixed(2)}:${isSafe}`;
    const digest = createHash("sha256").update(rawDigest).digest("hex");

    return {
      totalInspectedDistanceKm: Number(distanceKm.toFixed(3)),
      meanLeftGapMm: Number(meanLeft.toFixed(2)),
      meanRightGapMm: Number(meanRight.toFixed(2)),
      maxStatorStepJumpMm: Number(maxStepJump.toFixed(2)),
      rmsRoughnessMm: Number(rmsRoughness.toFixed(2)),
      isSafeForHighSpeedOperation: isSafe,
      alerts,
      inspectionDigest: digest
    };
  }
}
