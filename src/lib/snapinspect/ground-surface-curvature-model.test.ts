/**
 * SNAP-44: Laser Scanning Point Cloud Ground Surface Curvature Deformation Model Tests
 */

import { describe, it, expect } from 'vitest';
import {
  GroundSurfaceCurvatureModel,
  Point3D
} from './ground-surface-curvature-model';

describe('SNAP-44: GroundSurfaceCurvatureModel', () => {
  it('throws error when point cloud has insufficient points', () => {
    const sparsePoints: Point3D[] = [
      { x: 0, y: 0, z: 10 },
      { x: 1, y: 0, z: 10 }
    ];
    expect(() => {
      GroundSurfaceCurvatureModel.analyzePointCloud('SITE-SPARSE', sparsePoints);
    }).toThrow('LiDAR point cloud must contain at least 9 points');
  });

  it('correctly assesses a flat, stable slab grade', () => {
    const points: Point3D[] = [];
    for (let x = 0; x < 6; x += 0.5) {
      for (let y = 0; y < 6; y += 0.5) {
        // Flat slab with minor measurement noise
        const z = 100.0 + (Math.sin(x) * 0.002);
        points.push({ x, y, z });
      }
    }

    const analysis = GroundSurfaceCurvatureModel.analyzePointCloud('SITE-STABLE-01', points, 2.0);
    expect(analysis.siteId).toBe('SITE-STABLE-01');
    expect(analysis.overallSeverity).toBe('PASS_STABLE');
    expect(analysis.primaryDeformationType).toBe('STABLE_PLANAR_GRADE');
    expect(analysis.globalMaxSubsidenceM).toBeLessThan(0.05);
    expect(analysis.criticalPatchCount).toBe(0);
    expect(analysis.patches.length).toBeGreaterThan(0);
  });

  it('detects a severe localized sinkhole depression', () => {
    const points: Point3D[] = [];
    for (let x = 0; x < 6; x += 0.5) {
      for (let y = 0; y < 6; y += 0.5) {
        let z = 50.0;
        // Severe localized depression centered at (3, 3)
        const dist = Math.hypot(x - 3, y - 3);
        if (dist < 1.5) {
          z -= 0.45 * Math.cos((dist / 1.5) * (Math.PI / 2));
        }
        points.push({ x, y, z });
      }
    }

    const analysis = GroundSurfaceCurvatureModel.analyzePointCloud('SITE-SINKHOLE-02', points, 2.0);
    expect(analysis.overallSeverity).toBe('CRITICAL_COLLAPSE_HAZARD');
    expect(analysis.primaryDeformationType).toBe('LOCALIZED_SINKHOLE_DEPRESSION');
    expect(analysis.criticalPatchCount).toBeGreaterThan(0);
    expect(analysis.globalMaxSubsidenceM).toBeGreaterThan(0.18);
    expect(analysis.recommendedMitigation).toContain('EVACUATION');
  });

  it('detects ground subsidence trough and estimates settlement volume', () => {
    const points: Point3D[] = [];
    for (let x = 0; x < 6; x += 0.5) {
      for (let y = 0; y < 6; y += 0.5) {
        // Uniform trough depression of 10 cm along Y axis
        const z = 20.0 - (x > 2 && x < 4 ? 0.12 : 0.0);
        points.push({ x, y, z });
      }
    }

    const analysis = GroundSurfaceCurvatureModel.analyzePointCloud('SITE-TROUGH-03', points, 2.0);
    expect(analysis.overallSeverity).toBe('ACTION_REQUIRED_SETTLEMENT');
    expect(analysis.estimatedSettlementVolumeM3).toBeGreaterThan(0);
    expect(analysis.recommendedMitigation).toContain('grouting');
  });
});
