/**
 * natural-gas-pipeline-cathodic-protection-predictor.test.ts
 * Unit tests for SNAP-61: High-Pressure Natural Gas Pipeline Cathodic Protection Voltage Drop Predictor.
 */

import { describe, it, expect } from 'vitest';
import {
  NaturalGasPipelineCathodicProtectionPredictor,
  PipelineParameters
} from './natural-gas-pipeline-cathodic-protection-predictor';

describe('SNAP-61: NaturalGasPipelineCathodicProtectionPredictor', () => {
  it('correctly models compliant potential attenuation along high-grade 3LPE pipeline', () => {
    const pipeline: PipelineParameters = {
      lengthMeters: 20000, // 20 km
      outerDiameterMeters: 0.762, // 30-inch pipeline
      wallThicknessMeters: 0.0127, // 12.7 mm
      coatingQuality: 'GOOD_3LPE',
      soilResistivityOhmMeter: 50,
      nativePotentialMvCse: -600,
      drainagePointPotentialMvCse: -1150 // Well protected without hydrogen risk
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(pipeline, 5000);

    expect(result.stations.length).toBeGreaterThanOrEqual(5);
    expect(result.overallCompliance).toBe(true);
    expect(result.stations[0].pipeToSoilPotentialMvCse).toBe(-1150);
    expect(result.stations[0].isCriterionSatisfied).toBe(true);
    expect(result.stations[0].isOverProtected).toBe(false);
    expect(result.attenuationConstantAlpha).toBeGreaterThan(0);
    expect(result.totalCurrentDemandAmps).toBeGreaterThan(0);
  });

  it('detects over-protection risk at drainage point', () => {
    const pipeline: PipelineParameters = {
      lengthMeters: 10000,
      outerDiameterMeters: 0.508,
      wallThicknessMeters: 0.0095,
      coatingQuality: 'EXCELLENT_FBE',
      soilResistivityOhmMeter: 30,
      drainagePointPotentialMvCse: -1350 // Exceeds -1200 mV limit!
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(pipeline, 2500);

    expect(result.stations[0].isOverProtected).toBe(true);
    expect(result.stations[0].status).toBe('OVER_PROTECTED');
    expect(result.recommendations.some(r => r.includes('REDUCE_RECTIFIER_OUTPUT'))).toBe(true);
  });

  it('flags under-protection along degraded coal-tar coated long pipeline', () => {
    const pipeline: PipelineParameters = {
      lengthMeters: 50000, // 50 km long
      outerDiameterMeters: 0.610,
      wallThicknessMeters: 0.010,
      coatingQuality: 'DEGRADED_COAL_TAR', // High current leakage
      soilResistivityOhmMeter: 20,
      drainagePointPotentialMvCse: -1050
    };

    const result = NaturalGasPipelineCathodicProtectionPredictor.predictAttenuation(pipeline, 10000);

    expect(result.overallCompliance).toBe(false);
    const lastStation = result.stations[result.stations.length - 1];
    expect(lastStation.isCriterionSatisfied).toBe(false);
    expect(lastStation.status).toBe('UNDER_PROTECTED');
    expect(result.recommendations.some(r => r.includes('INSTALL_INTERMEDIATE_GROUNDBED'))).toBe(true);
  });
});
