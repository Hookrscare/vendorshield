import { describe, it, expect } from 'vitest';
import {
  DeepwaterMooringChainInterlinkWearLaserScanner,
  MooringChainScanParameters,
} from './deepwater-mooring-chain-interlink-wear-laser-scanner';

describe('SNAP-81: DeepwaterMooringChainInterlinkWearLaserScanner', () => {
  it('evaluates nominal mooring chain within acceptable service limits', () => {
    const params: MooringChainScanParameters = {
      chainGrade: 'R4',
      nominalDiameterMm: 120,
      measuredMinDiameterMm: 118,
      nominalLinkPitchMm: 480,
      linkPitchMeasuredMm: 484,
      annualTensionCycles: 500000,
      nominalTensionKn: 3200,
    };

    const assessment = DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear(params);

    expect(assessment.dnvStatus).toBe('ACCEPTABLE_SERVICE_LIMIT');
    expect(assessment.requiresImmediateDecommission).toBe(false);
    expect(assessment.crossSectionalAreaLossPercent).toBeLessThan(5.0);
    expect(assessment.estimatedRemainingLifeYears).toBeGreaterThan(5.0);
  });

  it('triggers ACTION_REQUIRED_SCHEDULE_REPLACEMENT when area loss or wear is elevated', () => {
    const params: MooringChainScanParameters = {
      chainGrade: 'R4S',
      nominalDiameterMm: 120,
      measuredMinDiameterMm: 112,
      nominalLinkPitchMm: 480,
      linkPitchMeasuredMm: 495,
      annualTensionCycles: 800000,
      nominalTensionKn: 3500,
    };

    const assessment = DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear(params);

    expect(assessment.dnvStatus).toBe('ACTION_REQUIRED_SCHEDULE_REPLACEMENT');
    expect(assessment.requiresImmediateDecommission).toBe(false);
  });

  it('triggers CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION on severe cross-sectional area loss or elongation', () => {
    const params: MooringChainScanParameters = {
      chainGrade: 'R5',
      nominalDiameterMm: 120,
      measuredMinDiameterMm: 100, // >16% diameter reduction, >30% area loss
      nominalLinkPitchMm: 480,
      linkPitchMeasuredMm: 510, // >6% pitch elongation
      annualTensionCycles: 1200000,
      nominalTensionKn: 4000,
    };

    const assessment = DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear(params);

    expect(assessment.dnvStatus).toBe('CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION');
    expect(assessment.requiresImmediateDecommission).toBe(true);
    expect(assessment.estimatedRemainingLifeYears).toBe(0.0);
  });

  it('throws an error on invalid negative or zero diameters', () => {
    expect(() =>
      DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear({
        chainGrade: 'R3',
        nominalDiameterMm: 0,
        measuredMinDiameterMm: 100,
        nominalLinkPitchMm: 480,
        linkPitchMeasuredMm: 480,
        annualTensionCycles: 1000,
        nominalTensionKn: 1000,
      })
    ).toThrow('Diameters must be positive.');
  });
});
