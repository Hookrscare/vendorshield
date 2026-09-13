import { describe, it, expect } from 'vitest';
import { UPVConcreteVoidTriangulator } from './upv-concrete-void-triangulator';

describe('SNAP-48: UPVConcreteVoidTriangulator Suite', () => {
  const triangulator = new UPVConcreteVoidTriangulator(4.2);

  it('analyzes direct transmission velocity and classifies sound concrete', () => {
    // 400 mm path length, 95 us transit time -> V = 400 / 95 ≈ 4.21 km/s (GOOD)
    const result = triangulator.analyzeVelocity({
      sensorPairId: 'P1-P2',
      mode: 'DIRECT',
      pathLengthMm: 400,
      transitTimeUs: 95,
    });

    expect(result.velocityKmS).toBeCloseTo(4.211, 2);
    expect(result.qualityRating).toBe('GOOD');
    expect(result.isVoidSuspected).toBe(false);
    expect(result.estimatedCompressiveStrengthMpa).toBeGreaterThan(30);
  });

  it('flags internal honeycombing or void when velocity drops significantly', () => {
    // 400 mm path length, 145 us transit time -> V = 400 / 145 ≈ 2.76 km/s (DOUBTFUL)
    const result = triangulator.analyzeVelocity({
      sensorPairId: 'P3-P4',
      mode: 'DIRECT',
      pathLengthMm: 400,
      transitTimeUs: 145,
    });

    expect(result.velocityKmS).toBeLessThan(3.0);
    expect(result.qualityRating).toBe('DOUBTFUL');
    expect(result.isVoidSuspected).toBe(true);
  });

  it('calculates crack depth using BS 1881-203 indirect transit time delay', () => {
    // x = 150mm, uncracked transit time = 60 us, cracked transit time = 90 us
    // ratio = 90 / 60 = 1.5
    // depth = 150 * sqrt(1.5^2 - 1) = 150 * sqrt(2.25 - 1) = 150 * sqrt(1.25) ≈ 167.7 mm
    const crack = triangulator.calculateCrackDepth('CRACK-01', 150, 60, 90);

    expect(crack.crackId).toBe('CRACK-01');
    expect(crack.calculatedDepthMm).toBeCloseTo(167.7, 1);
    expect(crack.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
