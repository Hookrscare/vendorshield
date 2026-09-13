import { describe, it, expect } from 'vitest';
import {
  LidarConcreteSpallingEstimator,
  Point3D,
} from './lidar-concrete-spalling-estimator';

describe('SNAP-51: LidarConcreteSpallingEstimator Unit Tests', () => {
  const estimator = new LidarConcreteSpallingEstimator(15.0, 10.0);

  it('detects no spalling on planar concrete face within tolerances', () => {
    const points: Point3D[] = [];
    for (let x = 0; x < 50; x += 10) {
      for (let y = 0; y < 50; y += 10) {
        points.push({ x, y, z: 2.0 }); // only 2mm deviation, well under 15mm
      }
    }

    const res = estimator.estimateSpallDamage(points, 0.0);
    expect(res.spalledPointsCount).toBe(0);
    expect(res.estimatedVolumeLossCm3).toBe(0);
    expect(res.urgencyRating).toBe('COSMETIC');
  });

  it('detects severe spalling cavity with exposed reinforcing bar', () => {
    const points: Point3D[] = [];
    // Planar surround
    for (let x = 0; x < 100; x += 10) {
      for (let y = 0; y < 100; y += 10) {
        // Create 40mm deep spall cavity in the center
        if (x >= 40 && x <= 60 && y >= 40 && y <= 60) {
          // Rebar exposed at depth 40mm
          points.push({ x, y, z: 40.0, intensity: 230 });
        } else {
          points.push({ x, y, z: 0.0, intensity: 50 });
        }
      }
    }

    const res = estimator.estimateSpallDamage(points, 0.0, 35.0);
    expect(res.spalledPointsCount).toBe(9);
    expect(res.maxSpallDepthMm).toBe(40.0);
    expect(res.rebarExposedFlag).toBe(true);
    expect(res.urgencyRating).toBe('MODERATE_STRUCTURAL');
    expect(res.estimatedVolumeLossCm3).toBeGreaterThan(20.0);
  });

  it('classifies deep section loss as CRITICAL_EMERGENCY', () => {
    const points: Point3D[] = [
      { x: 0, y: 0, z: 65.0, intensity: 240 },
      { x: 10, y: 0, z: 70.0, intensity: 240 },
    ];

    const res = estimator.estimateSpallDamage(points, 0.0, 35.0);
    expect(res.maxSpallDepthMm).toBe(70.0);
    expect(res.urgencyRating).toBe('CRITICAL_EMERGENCY');
    expect(res.repairRecommended).toContain('Immediate structural shoring');
  });
});
