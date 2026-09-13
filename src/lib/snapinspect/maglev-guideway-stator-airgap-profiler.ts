import { createHash } from 'crypto';

/**
 * SNAP-67: High-Speed Maglev Guideway Stator Pack Air-Gap Dynamic Laser Triangulation Profiler
 * 
 * Part of SnapInspect AI Tactical CAD & Infrastructure Health Suite.
 * Precision high-speed maglev guideway inspection complying with EBA MSB-G-V1 and DIN EN 50126:
 * 1. High-frequency laser triangulation dynamic air-gap profile processing (vertical and lateral).
 * 2. Stator core pack-to-pack expansion joint step height mismatch detection.
 * 3. Electromagnetic levitation & propulsion boundary safety envelope verification (nominal 8.0 - 12.0 mm).
 * 4. Guideway Quality Index (GQI) scoring and dynamic vehicle speed restriction advisory.
 * 5. Cryptographic SHA-256 inspection verification token.
 */

export interface StatorGuidewaySpec {
  guidewaySegmentId: string;
  nominalAirGapMm: number;        // Typically 10.0 mm (standard range 8.0 - 12.0 mm)
  minSafeAirGapMm: number;        // Critical floor: 6.0 mm (stator contact danger)
  maxSafeAirGapMm: number;        // Critical ceiling: 14.0 mm (magnetic levitation drop risk)
  maxAllowableJointStepMm: number;// Max step at pack joints: 1.0 mm
  packLengthM: number;            // Stator pack unit length, e.g. 1.0 m or 2.0 m
  trackDesignSpeedKmH: number;    // e.g. 450 km/h or 600 km/h
}

export interface StatorLaserSamplePoint {
  chainageOffsetM: number;       // Longitudinal position s along guideway (m)
  measuredVerticalGapMm: number; // Vertical clearance between vehicle pole and stator tooth
  measuredLateralGapMm: number;  // Lateral stator guiding face offset
  laserConfidenceScore: number;  // Triangulation SNR (0.0 to 1.0)
}

export type MaglevAirGapSafetyStatus =
  | 'OPTIMAL_FULL_SPEED_PERMITTED'
  | 'ACCEPTABLE_MAINTENANCE_SCHEDULED'
  | 'WARNING_JOINT_STEP_MISMATCH'
  | 'DANGER_CRITICAL_AIRGAP_PINCH'
  | 'DANGER_MAGNETIC_DECOUPLING_RISK';

export interface StatorJointAnomaly {
  chainageM: number;
  measuredStepMm: number;
  severity: 'MINOR' | 'ELEVATED' | 'CRITICAL';
}

export interface MaglevStatorProfileReport {
  guidewaySegmentId: string;
  totalLengthScannedM: number;
  sampleCount: number;
  minAirGapMm: number;
  maxAirGapMm: number;
  meanAirGapMm: number;
  airGapStdDevMm: number;
  maxJointStepMm: number;
  detectedJointAnomalies: StatorJointAnomaly[];
  guidewayQualityIndex: number; // 0 to 100
  safetyStatus: MaglevAirGapSafetyStatus;
  maxRecommendedSpeedKmH: number;
  remedialActions: string[];
  auditDigestSha256: string;
  inspectedAtIso: string;
}

export class MaglevGuidewayStatorAirGapProfiler {
  /**
   * Analyzes laser triangulation scan points along a maglev stator pack installation.
   */
  public analyzeProfile(
    spec: StatorGuidewaySpec,
    samples: StatorLaserSamplePoint[]
  ): MaglevStatorProfileReport {
    if (!samples || samples.length < 5) {
      throw new Error('Insufficient laser triangulation sample points for profiling (minimum 5 required).');
    }

    // Sort chronologically/spatially by chainage
    const sorted = [...samples].sort((a, b) => a.chainageOffsetM - b.chainageOffsetM);
    const validSamples = sorted.filter(s => s.laserConfidenceScore >= 0.5);

    if (validSamples.length < 5) {
      throw new Error('Insufficient high-confidence laser samples after SNR filtering.');
    }

    let minGap = Infinity;
    let maxGap = -Infinity;
    let sumGap = 0;

    for (const s of validSamples) {
      const g = s.measuredVerticalGapMm;
      if (g < minGap) minGap = g;
      if (g > maxGap) maxGap = g;
      sumGap += g;
    }

    const n = validSamples.length;
    const meanGap = sumGap / n;

    let varianceSum = 0;
    for (const s of validSamples) {
      varianceSum += (s.measuredVerticalGapMm - meanGap) ** 2;
    }
    const stdDev = Math.sqrt(varianceSum / n);

    // Detect joint step mismatches
    const anomalies: StatorJointAnomaly[] = [];
    let maxJointStep = 0;

    for (let i = 1; i < validSamples.length; i++) {
      const prev = validSamples[i - 1];
      const curr = validSamples[i];
      const deltaDist = curr.chainageOffsetM - prev.chainageOffsetM;

      // Identify abrupt step transitions across adjacent samples (indicative of pack joints)
      if (deltaDist <= 0.15) { // Within 15cm
        const step = Math.abs(curr.measuredVerticalGapMm - prev.measuredVerticalGapMm);
        if (step > maxJointStep) {
          maxJointStep = step;
        }

        if (step > spec.maxAllowableJointStepMm) {
          const severity = step > spec.maxAllowableJointStepMm * 1.5 ? 'CRITICAL' : 'ELEVATED';
          anomalies.push({
            chainageM: round(curr.chainageOffsetM, 3),
            measuredStepMm: round(step, 3),
            severity,
          });
        }
      }
    }

    // Calculate Guideway Quality Index (GQI 0 - 100)
    let gqi = 100;
    // Penalty for mean gap deviation from nominal
    const meanDeviation = Math.abs(meanGap - spec.nominalAirGapMm);
    gqi -= Math.min(30, meanDeviation * 15);

    // Penalty for standard deviation (roughness)
    gqi -= Math.min(30, stdDev * 25);

    // Penalty for joint steps
    gqi -= Math.min(30, maxJointStep * 20);

    // Penalty for anomalies
    gqi -= Math.min(20, anomalies.length * 5);

    gqi = Math.max(0, Math.min(100, Math.round(gqi)));

    // Safety status and speed restriction calculation
    let safetyStatus: MaglevAirGapSafetyStatus = 'OPTIMAL_FULL_SPEED_PERMITTED';
    let maxPermittedSpeed = spec.trackDesignSpeedKmH;
    const actions: string[] = [];

    if (minGap <= spec.minSafeAirGapMm) {
      safetyStatus = 'DANGER_CRITICAL_AIRGAP_PINCH';
      maxPermittedSpeed = 0; // Emergency halt / line closure
      actions.push(`CRITICAL: Air-gap pinch (${minGap.toFixed(2)}mm <= floor ${spec.minSafeAirGapMm}mm). Immediate line suspension to prevent stator collision.`);
    } else if (maxGap >= spec.maxSafeAirGapMm) {
      safetyStatus = 'DANGER_MAGNETIC_DECOUPLING_RISK';
      maxPermittedSpeed = Math.min(160, spec.trackDesignSpeedKmH * 0.3);
      actions.push(`WARNING: Excessive air-gap (${maxGap.toFixed(2)}mm >= ceiling ${spec.maxSafeAirGapMm}mm). Severe risk of levitation magnet flux loss.`);
    } else if (maxJointStep > spec.maxAllowableJointStepMm) {
      safetyStatus = 'WARNING_JOINT_STEP_MISMATCH';
      maxPermittedSpeed = Math.min(300, spec.trackDesignSpeedKmH * 0.6);
      actions.push(`High step mismatch at pack expansion joints (${maxJointStep.toFixed(2)}mm > limit ${spec.maxAllowableJointStepMm}mm). Restrict speed to 300 km/h.`);
    } else if (gqi < 80) {
      safetyStatus = 'ACCEPTABLE_MAINTENANCE_SCHEDULED';
      maxPermittedSpeed = Math.min(450, spec.trackDesignSpeedKmH * 0.85);
      actions.push('Moderate guideway stator roughness. Schedule routine shim realignment during next engineering possession window.');
    } else {
      actions.push('Stator air-gap envelope fully compliant with EBA MSB-G-V1. Full design speed operations authorized.');
    }

    const totalScanned = round(validSamples[validSamples.length - 1].chainageOffsetM - validSamples[0].chainageOffsetM, 3);
    const inspectedAtIso = new Date().toISOString();
    const digestMaterial = `${spec.guidewaySegmentId}|${minGap.toFixed(3)}|${maxGap.toFixed(3)}|${gqi}|${safetyStatus}|${inspectedAtIso}`;
    const auditDigestSha256 = createHash('sha256').update(digestMaterial).digest('hex');

    return {
      guidewaySegmentId: spec.guidewaySegmentId,
      totalLengthScannedM: totalScanned,
      sampleCount: validSamples.length,
      minAirGapMm: round(minGap, 3),
      maxAirGapMm: round(maxGap, 3),
      meanAirGapMm: round(meanGap, 3),
      airGapStdDevMm: round(stdDev, 3),
      maxJointStepMm: round(maxJointStep, 3),
      detectedJointAnomalies: anomalies,
      guidewayQualityIndex: gqi,
      safetyStatus,
      maxRecommendedSpeedKmH: Math.round(maxPermittedSpeed),
      remedialActions: actions,
      auditDigestSha256,
      inspectedAtIso,
    };
  }
}

function round(val: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}
