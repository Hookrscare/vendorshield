/**
 * src/lib/snapinspect/natural-gas-pipeline-cathodic-protection-predictor.test.ts
 * Vitest unit tests for SNAP-61: NaturalGasPipelineCathodicProtectionPredictor.
 */

import { describe, it, expect } from 'vitest';
import {
  NaturalGasPipelineCathodicProtectionPredictor,
  PipelineParameters
} from './natural-gas-pipeline-cathodic-protection-predictor';

describe('SNAP-61: NaturalGasPipelineCathodicProtectionPredictor', () => {
  it('predicts compliant attenuation profile for high-quality coated pipeline', () => {
    const pipeline: PipelineParameters = {
      lengthMeters: 10000,          // 10 km
      outerDiameterMeters: 0.610,   // 24-inch pipe
      wallThicknessMeters: 0.0127,  // 0.5-inch wall
      coatingQuality: 'GOOD_3LPE',
      soilResistivityOhmMeter: 50,
      nativePotentialMvCse: -600,
      drainagePointPotentialMvCse: -1100,
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(pipeline, 2000);

    expect(result.stations.length).toBe(6);
    expect(result.attenuationConstantAlpha).toBeGreaterThan(0);
    expect(result.characteristicResistanceOhm).toBeGreaterThan(0);
    expect(result.totalCurrentDemandAmps).toBeGreaterThan(0);

    // Feed point potential should be ~ -1100 mV CSE
    expect(result.stations[0].pipeToSoilPotentialMvCse).toBeCloseTo(-1100, 0);
    expect(result.stations[0].isCriterionSatisfied).toBe(true);
    expect(result.stations[0].isOverProtected).toBe(false);

    // Far end should still be satisfied (> -850 mV criterion)
    const farEnd = result.stations[result.stations.length - 1];
    expect(farEnd.pipeToSoilPotentialMvCse).toBeLessThanOrEqual(-850);
    expect(result.overallCompliance).toBe(true);
    expect(result.recommendations[0]).toContain('OPTIMAL');
  });

  it('detects under-protection when coating is degraded over long distances', () => {
    const degradedPipeline: PipelineParameters = {
      lengthMeters: 25000,          // 25 km
      outerDiameterMeters: 0.508,   // 20-inch pipe
      wallThicknessMeters: 0.0095,
      coatingQuality: 'POOR_ASPHALT', // High leakage to ground
      soilResistivityOhmMeter: 20,
      nativePotentialMvCse: -550,
      drainagePointPotentialMvCse: -1150,
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(degradedPipeline, 5000);

    expect(result.overallCompliance).toBe(false);
    const lastStation = result.stations[result.stations.length - 1];
    expect(lastStation.status).toBe('UNDER_PROTECTED');
    expect(result.recommendations.some((r) => r.includes('INSTALL_INTERMEDIATE_ANODES'))).toBe(true);
  });

  it('detects over-protection risk when rectifier drives beyond -1200 mV CSE', () => {
    const overDrivenPipeline: PipelineParameters = {
      lengthMeters: 5000,
      outerDiameterMeters: 0.406,
      wallThicknessMeters: 0.008,
      coatingQuality: 'EXCELLENT_FBE',
      soilResistivityOhmMeter: 100,
      nativePotentialMvCse: -600,
      drainagePointPotentialMvCse: -1350, // Exceeds -1200 mV
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(overDrivenPipeline, 1000);

    expect(result.overallCompliance).toBe(false);
    expect(result.stations[0].status).toBe('OVER_PROTECTED');
    expect(result.recommendations.some((r) => r.includes('REDUCE_RECTIFIER_OUTPUT'))).toBe(true);
  });
});
