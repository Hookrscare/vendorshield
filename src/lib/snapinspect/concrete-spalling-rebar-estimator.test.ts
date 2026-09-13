import { describe, it, expect } from 'vitest';
import {
  ConcreteSpallingRebarEstimator,
  Point3D,
} from './concrete-spalling-rebar-estimator';

describe('SNAP-51: ConcreteSpallingRebarEstimator', () => {
  const estimator = new ConcreteSpallingRebarEstimator({
    spallingDepthThresholdMm: 15,
    rebarDepthThresholdMm: 40,
    rebarIntensityThreshold: 200,
    voxelSizeMm: 10,
  });

  it('handles empty or planar surface scans with zero spall detection', () => {
    const planarPoints: Point3D[] = [
      { x: 0.1, y: 0.1, z: 0.0, intensity: 120 },
      { x: 0.2, y: 0.1, z: -0.005, intensity: 110 }, // 5mm depth deviation (< 15mm threshold)
    ];

    const res = estimator.analyzePointcloud(planarPoints);
    expect(res.spalledPointsCount).toBe(0);
    expect(res.estimatedVoidVolumeLiters).toBe(0);
    expect(res.repairClassification).toBe('COSMETIC_SURFACE_PATCH');
    expect(res.rebarExposed).toBe(false);
  });

  it('calculates void volume and detects exposed rebar from LiDAR depth and intensity', () => {
    const points: Point3D[] = [];

    // Simulate 20cm x 20cm spall pocket with 45mm intrusion depth and rebar cluster
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const xM = x * 0.01;
        const yM = y * 0.01;
        const isRebarLine = y === 10;
        const depthM = isRebarLine ? -0.045 : -0.025; // 45mm at rebar, 25mm elsewhere
        const intensity = isRebarLine ? 230 : 100; // high return intensity for steel

        points.push({ x: xM, y: yM, z: depthM, intensity });
      }
    }

    const res = estimator.analyzePointcloud(points);

    expect(res.spalledPointsCount).toBe(400);
    expect(res.maxSpallDepthMm).toBe(45);
    expect(res.rebarExposed).toBe(true);
    expect(res.estimatedVoidVolumeLiters).toBeGreaterThan(0.5);
    expect(res.recommendedMortarVolumeLiters).toBeGreaterThan(res.estimatedVoidVolumeLiters);
    expect(res.repairClassification).toBe('STRUCTURAL_MORTAR_REPAIR');
  });

  it('triggers FULL_SECTION_JACKETING when spall depth exceeds severe structural limit (80mm)', () => {
    const severePoints: Point3D[] = [
      { x: 0.1, y: 0.1, z: -0.095, intensity: 220 }, // 95mm depth intrusion
      { x: 0.11, y: 0.1, z: -0.090, intensity: 210 },
    ];

    const res = estimator.analyzePointcloud(severePoints);
    expect(res.maxSpallDepthMm).toBe(95);
    expect(res.repairClassification).toBe('FULL_SECTION_JACKETING');
  });
});
