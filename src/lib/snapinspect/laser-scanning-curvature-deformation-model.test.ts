import { describe, it, expect } from 'vitest';
import {
  LaserSurfaceDeformationModel,
  Point3D,
} from './laser-scanning-curvature-deformation-model';

describe('LaserSurfaceDeformationModel (SNAP-44)', () => {
  const model = new LaserSurfaceDeformationModel();

  it('correctly classifies a laser point cloud of a super-flat floor slab', () => {
    // Generate a 10x10 grid with minute random sub-millimeter roughness (< 0.5mm)
    const points: Point3D[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const noiseM = (Math.sin(x * 3 + y) * 0.0004); // +/- 0.4 mm
        points.push({
          x: x * 0.5,
          y: y * 0.5,
          z: noiseM,
        });
      }
    }

    const report = model.analyzePointCloud(points);

    expect(report.totalPointsAnalyzed).toBe(100);
    expect(report.rmsDeviationMm).toBeLessThan(1.5);
    expect(report.estimatedFloorFlatnessFF).toBeGreaterThanOrEqual(50);
    expect(report.astmComplianceTier).toBe('SUPER_FLAT_CRITICAL');
    expect(report.structuralWarning).toBe(false);
    expect(report.criticalDeformationHotspots.length).toBe(0);
  });

  it('detects severe subsidence depression and triggers structural warning', () => {
    const points: Point3D[] = [];
    // Floor with a severe 25mm settlement depression at center
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const distFromCenter = Math.hypot(x - 5, y - 5);
        const settlementM = distFromCenter < 2 ? -0.025 : 0.0; // -25mm depression
        points.push({
          x: x * 0.5,
          y: y * 0.5,
          z: settlementM,
        });
      }
    }

    const report = model.analyzePointCloud(points);

    expect(report.maxSettlementMm).toBeLessThan(-15.0);
    expect(report.astmComplianceTier).toBe('NON_COMPLIANT_DEFECTIVE');
    expect(report.structuralWarning).toBe(true);
    expect(report.criticalDeformationHotspots.length).toBeGreaterThan(0);
    expect(report.criticalDeformationHotspots[0].defectType).toBe('SUBSIDENCE_DEPRESSION');
  });
});
