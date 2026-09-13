import { describe, it, expect } from 'vitest';
import {
  DeepwaterMooringChainInterlinkWearLaserScanner,
  MooringChainScanParameters,
} from './deepwater-mooring-chain-interlink-wear-laser-scanner';

describe('SNAP-81: DeepwaterMooringChainInterlinkWearLaserScanner', () => {
  it('evaluates acceptable service limit for minor chain wear', () => {
    const params: MooringChainScanParameters = {
      chainGrade: 'R4',
      nominalDiameterMm: 120.0,
      measuredMinDiameterMm: 118.0, // minor ~1.6% diameter loss
      nominalLinkPitchMm: 720.0,
      linkPitchMeasuredMm: 724.0,   // minor elongation < 1%
      annualTensionCycles: 1e6,
      nominalTensionKn: 3500,
    };

    const assessment = DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear(params);

    expect(assessment.dnvStatus).toBe('ACCEPTABLE_SERVICE_LIMIT');
    expect(assessment.requiresImmediateDecommission).toBe(false);
    expect(assessment.crossSectionalAreaLossPercent).toBeLessThan(5.0);
    expect(assessment.estimatedRemainingLifeYears).toBeGreaterThan(15.0);
  });

  it('triggers critical discard and immediate decommission on severe wear exceeding 15% area loss', () => {
    const params: MooringChainScanParameters = {
      chainGrade: 'R4',
      nominalDiameterMm: 120.0,
      measuredMinDiameterMm: 108.0, // 10% diameter loss -> ~19% area loss
      nominalLinkPitchMm: 720.0,
      linkPitchMeasuredMm: 735.0,
      annualTensionCycles: 1e6,
      nominalTensionKn: 3500,
    };

    const assessment = DeepwaterMooringChainInterlinkWearLaserScanner.evaluateChainWear(params);

    expect(assessment.dnvStatus).toBe('CRITICAL_DISCARD_IMMEDIATE_DECOMMISSION');
    expect(assessment.requiresImmediateDecommission).toBe(true);
    expect(assessment.crossSectionalAreaLossPercent).toBeGreaterThan(15.0);
    expect(assessment.estimatedRemainingLifeYears).toBe(0.0);
  });
});
