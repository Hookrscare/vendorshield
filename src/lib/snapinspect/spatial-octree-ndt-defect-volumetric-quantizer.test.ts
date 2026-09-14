import { describe, it, expect } from "vitest";
import {
  SpatialOctreeNdtDefectVolumetricQuantizer,
  NdtPointVoxel
} from "./spatial-octree-ndt-defect-volumetric-quantizer";

describe("SNAP-145: SpatialOctreeNdtDefectVolumetricQuantizer", () => {
  it("should cluster wall loss defects and calculate ASME Level 2 criticality", () => {
    const voxels: NdtPointVoxel[] = [
      { x: 10, y: 20, z: 5, measuredThicknessMm: 12.0, nominalThicknessMm: 12.0, amplitudeDb: 40 }, // 0% loss
      { x: 15, y: 25, z: 6, measuredThicknessMm: 5.0, nominalThicknessMm: 12.0, amplitudeDb: 65 },  // 58.3% loss -> CRITICAL
      { x: 18, y: 28, z: 7, measuredThicknessMm: 8.0, nominalThicknessMm: 12.0, amplitudeDb: 55 },  // 33.3% loss
    ];

    const result = SpatialOctreeNdtDefectVolumetricQuantizer.quantizeDefects(voxels, 15.0);
    expect(result.totalAnomalousVoxels).toBe(2);
    expect(result.clusters).toHaveLength(1);
    const c = result.clusters[0];
    expect(c.asmeLevel2Criticality).toBe("CRITICAL_REPAIR_REQUIRED");
    expect(c.minRemainingThicknessMm).toBe(5.0);
    expect(c.boundingBoxMm.lengthX).toBe(3.0);
    expect(result.verificationSha256).toHaveLength(64);
  });

  it("should return empty clusters when all voxels are within acceptable nominal thickness", () => {
    const voxels: NdtPointVoxel[] = [
      { x: 0, y: 0, z: 0, measuredThicknessMm: 11.5, nominalThicknessMm: 12.0, amplitudeDb: 35 },
      { x: 1, y: 1, z: 1, measuredThicknessMm: 11.8, nominalThicknessMm: 12.0, amplitudeDb: 32 },
    ];

    const result = SpatialOctreeNdtDefectVolumetricQuantizer.quantizeDefects(voxels, 15.0);
    expect(result.totalAnomalousVoxels).toBe(0);
    expect(result.clusters).toHaveLength(0);
  });

  it("should throw error on invalid inputs", () => {
    expect(() => SpatialOctreeNdtDefectVolumetricQuantizer.quantizeDefects([], 15)).toThrow("empty");
    expect(() => SpatialOctreeNdtDefectVolumetricQuantizer.quantizeDefects(
      [{ x: 0, y: 0, z: 0, measuredThicknessMm: 10, nominalThicknessMm: 10, amplitudeDb: 30 }],
      150
    )).toThrow("between 0 and 100");
  });
});
