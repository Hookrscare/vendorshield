import { describe, it, expect } from 'vitest';
import { BridgePierScourDepthEstimator, BridgePierParameters } from './bridge-pier-scour-depth-estimator';

describe('SNAP-50: BridgePierScourDepthEstimator Unit Tests', () => {
  const estimator = new BridgePierScourDepthEstimator();

  it('computes subcritical flow pier scour within plausible physical bounds', () => {
    const params: BridgePierParameters = {
      pierId: 'PIER-04-NORTH',
      pierWidthMeters: 1.5,
      pierLengthMeters: 6.0,
      noseShape: 'ROUND',
      attackAngleDegrees: 0,
      approachDepthMeters: 3.5,
      flowVelocityMps: 2.2,
      bedCondition: 'PLANE_BED',
      medianGrainSizeD50Mm: 0.8,
      foundationFootingDepthMeters: 3.5,
    };

    const res = estimator.evaluateScour(params);
    expect(res.froudeNumber).toBeGreaterThan(0.3);
    expect(res.froudeNumber).toBeLessThan(1.0); // Subcritical
    expect(res.k1ShapeFactor).toBe(1.0);
    expect(res.k2AngleFactor).toBe(1.0);
    expect(res.estimatedScourDepthMeters).toBeGreaterThan(1.5);
    expect(res.estimatedScourDepthMeters).toBeLessThan(4.0);
    expect(res.remainingEmbedmentMeters).toBeGreaterThan(0.5);
    expect(res.scourRiskLevel).toBe('MONITOR');
    expect(res.recommendedRiprapDiameterD50Mm).toBeGreaterThan(50);
  });

  it('detects CRITICAL_UNDERMINING when high skew angle amplifies scour depth', () => {
    const params: BridgePierParameters = {
      pierId: 'PIER-02-BENT',
      pierWidthMeters: 1.8,
      pierLengthMeters: 9.0,
      noseShape: 'SQUARE',
      attackAngleDegrees: 25, // High skew amplifies vortex shed
      approachDepthMeters: 4.0,
      flowVelocityMps: 3.2,
      bedCondition: 'LARGE_DUNES',
      medianGrainSizeD50Mm: 0.5,
      foundationFootingDepthMeters: 4.0, // Shallow footing
    };

    const res = estimator.evaluateScour(params);
    expect(res.k2AngleFactor).toBeGreaterThan(1.5);
    expect(res.scourRiskLevel).toBe('CRITICAL_UNDERMINING');
    expect(res.remainingEmbedmentMeters).toBeLessThan(0.5);
  });

  it('evaluates SAFE classification for deeply embedded piles under mild flows', () => {
    const params: BridgePierParameters = {
      pierId: 'PIER-09-DEEP',
      pierWidthMeters: 1.0,
      pierLengthMeters: 4.0,
      noseShape: 'SHARP_NOSE',
      attackAngleDegrees: 0,
      approachDepthMeters: 2.0,
      flowVelocityMps: 1.0,
      bedCondition: 'PLANE_BED',
      medianGrainSizeD50Mm: 75.0, // Coarse gravel armoring
      foundationFootingDepthMeters: 6.0,
    };

    const res = estimator.evaluateScour(params);
    expect(res.k4ArmoringFactor).toBe(0.7);
    expect(res.scourRiskLevel).toBe('SAFE');
    expect(res.remainingEmbedmentMeters).toBeGreaterThan(4.0);
  });
});
