/**
 * Test Suite for SNAP-67: Maglev Guideway Stator Pack Air-Gap Dynamic Laser Triangulation Profiler
 */

import { describe, it, expect } from 'vitest';
import {
  MaglevGuidewayStatorAirGapProfiler,
  type StatorGuidewaySpec,
  type StatorLaserSamplePoint,
} from './maglev-guideway-stator-airgap-profiler';

describe('SNAP-67: Maglev Guideway Stator Air-Gap Dynamic Laser Triangulation Profiler', () => {
  const profiler = new MaglevGuidewayStatorAirGapProfiler();

  const standardSpec: StatorGuidewaySpec = {
    guidewaySegmentId: 'GUIDEWAY-SECT-42B',
    nominalAirGapMm: 10.0,
    minSafeAirGapMm: 6.0,
    maxSafeAirGapMm: 14.0,
    maxAllowableJointStepMm: 1.0,
    packLengthM: 1.0,
    trackDesignSpeedKmH: 500,
  };

  it('evaluates optimal guideway air-gap profile with full speed clearance', () => {
    // Generate uniform smooth profile around 10.0mm
    const samples: StatorLaserSamplePoint[] = [];
    for (let i = 0; i <= 20; i++) {
      samples.push({
        chainageOffsetM: i * 0.1,
        measuredVerticalGapMm: 10.0 + Math.sin(i * 0.2) * 0.2, // Between 9.8 and 10.2
        measuredLateralGapMm: 0.0,
        laserConfidenceScore: 0.98,
      });
    }

    const report = profiler.analyzeProfile(standardSpec, samples);

    expect(report.safetyStatus).toBe('OPTIMAL_FULL_SPEED_PERMITTED');
    expect(report.maxRecommendedSpeedKmH).toBe(500);
    expect(report.guidewayQualityIndex).toBeGreaterThanOrEqual(90);
    expect(report.detectedJointAnomalies.length).toBe(0);
    expect(report.auditDigestSha256).toHaveLength(64);
  });

  it('detects dangerous air-gap pinch below safety floor and halts operations', () => {
    const samples: StatorLaserSamplePoint[] = [
      { chainageOffsetM: 0.0, measuredVerticalGapMm: 10.0, measuredLateralGapMm: 0, laserConfidenceScore: 1.0 },
      { chainageOffsetM: 0.1, measuredVerticalGapMm: 8.5, measuredLateralGapMm: 0, laserConfidenceScore: 1.0 },
      { chainageOffsetM: 0.2, measuredVerticalGapMm: 5.4, measuredLateralGapMm: 0, laserConfidenceScore: 1.0 }, // Danger! < 6.0mm
      { chainageOffsetM: 0.3, measuredVerticalGapMm: 8.0, measuredLateralGapMm: 0, laserConfidenceScore: 1.0 },
      { chainageOffsetM: 0.4, measuredVerticalGapMm: 10.1, measuredLateralGapMm: 0, laserConfidenceScore: 1.0 },
    ];

    const report = profiler.analyzeProfile(standardSpec, samples);

    expect(report.safetyStatus).toBe('DANGER_CRITICAL_AIRGAP_PINCH');
    expect(report.maxRecommendedSpeedKmH).toBe(0);
    expect(report.remedialActions.some(a => a.includes('CRITICAL: Air-gap pinch'))).toBe(true);
  });

  it('identifies excessive joint step height mismatch and recommends speed restriction', () => {
    const samples: StatorLaserSamplePoint[] = [
      { chainageOffsetM: 0.90, measuredVerticalGapMm: 10.0, measuredLateralGapMm: 0, laserConfidenceScore: 0.95 },
      { chainageOffsetM: 0.95, measuredVerticalGapMm: 10.1, measuredLateralGapMm: 0, laserConfidenceScore: 0.95 },
      { chainageOffsetM: 1.00, measuredVerticalGapMm: 11.6, measuredLateralGapMm: 0, laserConfidenceScore: 0.95 }, // Step of 1.5mm > 1.0mm
      { chainageOffsetM: 1.05, measuredVerticalGapMm: 11.5, measuredLateralGapMm: 0, laserConfidenceScore: 0.95 },
      { chainageOffsetM: 1.10, measuredVerticalGapMm: 11.4, measuredLateralGapMm: 0, laserConfidenceScore: 0.95 },
    ];

    const report = profiler.analyzeProfile(standardSpec, samples);

    expect(report.safetyStatus).toBe('WARNING_JOINT_STEP_MISMATCH');
    expect(report.maxRecommendedSpeedKmH).toBe(300);
    expect(report.detectedJointAnomalies.length).toBe(1);
    expect(report.detectedJointAnomalies[0].measuredStepMm).toBe(1.5);
    expect(report.detectedJointAnomalies[0].severity).toBe('ELEVATED');
  });

  it('filters out low-confidence laser triangulation reflections', () => {
    const samples: StatorLaserSamplePoint[] = [
      { chainageOffsetM: 0.0, measuredVerticalGapMm: 10.0, measuredLateralGapMm: 0, laserConfidenceScore: 0.9 },
      { chainageOffsetM: 0.1, measuredVerticalGapMm: 2.0, measuredLateralGapMm: 0, laserConfidenceScore: 0.1 }, // Low SNR outlier
      { chainageOffsetM: 0.2, measuredVerticalGapMm: 10.1, measuredLateralGapMm: 0, laserConfidenceScore: 0.9 },
      { chainageOffsetM: 0.3, measuredVerticalGapMm: 9.9, measuredLateralGapMm: 0, laserConfidenceScore: 0.9 },
      { chainageOffsetM: 0.4, measuredVerticalGapMm: 10.0, measuredLateralGapMm: 0, laserConfidenceScore: 0.9 },
      { chainageOffsetM: 0.5, measuredVerticalGapMm: 10.2, measuredLateralGapMm: 0, laserConfidenceScore: 0.9 },
    ];

    const report = profiler.analyzeProfile(standardSpec, samples);

    expect(report.sampleCount).toBe(5); // Filtered out the 0.1 SNR sample
    expect(report.minAirGapMm).toBeGreaterThan(6.0);
  });
});
