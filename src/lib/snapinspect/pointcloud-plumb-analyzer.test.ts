import { describe, it, expect } from 'vitest';
import {
  PointcloudPlumbAnalyzer,
  Point3D
} from './pointcloud-plumb-analyzer';

describe('SNAP-77: LiDAR Point Cloud Wall Plumb Analyzer', () => {
  it('validates a true vertical concrete shear wall within ACI 117 limits', () => {
    // 3-meter tall wall with minimal deviation
    const points: Point3D[] = [
      { x: 0.0, y: 0.001, z: 0.1 },
      { x: 2.0, y: 0.002, z: 0.1 },
      { x: 1.0, y: 0.001, z: 1.5 },
      { x: 0.0, y: 0.003, z: 2.9 },
      { x: 2.0, y: 0.002, z: 2.9 }
    ];

    const res = PointcloudPlumbAnalyzer.analyzeWallPlumb('wall_shear_w1', points, 6.0);

    expect(res.isCompliantWithAci117).toBe(true);
    expect(res.complianceTier).toBe('PASS_WITHIN_TOLERANCE');
    expect(res.plumbDeviationMmPer3Meters).toBeLessThan(3.0);
  });

  it('detects severe structural outward lean exceeding code thresholds', () => {
    // Wall leaning outward by 15mm over 3m height
    const points: Point3D[] = [
      { x: 0.0, y: 0.000, z: 0.0 }, // Bottom at Y = 0mm
      { x: 2.0, y: 0.000, z: 0.0 },
      { x: 1.0, y: 0.008, z: 1.5 },
      { x: 0.0, y: 0.015, z: 3.0 }, // Top at Y = 15mm
      { x: 2.0, y: 0.015, z: 3.0 }
    ];

    const res = PointcloudPlumbAnalyzer.analyzeWallPlumb('wall_settling_tilt', points, 6.0);

    expect(res.isCompliantWithAci117).toBe(false);
    expect(res.complianceTier).toBe('PLUMB_LEAN_EXCEEDS_CODE');
    expect(res.plumbDeviationMmPer3Meters).toBe(15.0);
    expect(res.wallLeanDirection).toBe('OUTWARD_LEAN');
    expect(res.fieldPunchlistAction).toContain('CRITICAL');
  });
});
