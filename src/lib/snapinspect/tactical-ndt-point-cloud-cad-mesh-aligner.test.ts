import { describe, it, expect } from "vitest";
import {
  TacticalNdtPointCloudCadMeshAligner,
  Point3D,
  CadMeshFace
} from "./tactical-ndt-point-cloud-cad-mesh-aligner";

describe("SNAP-132: TacticalNdtPointCloudCadMeshAligner", () => {
  const cadFaces: CadMeshFace[] = [
    {
      faceId: "face-nominal-pipe-01",
      centroid: { x: 100, y: 100, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      designToleranceMm: 2.0
    },
    {
      faceId: "face-nominal-pipe-02",
      centroid: { x: 200, y: 100, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      designToleranceMm: 2.0
    }
  ];

  it("evaluates tight point cloud alignment within engineering tolerance", () => {
    const points: Point3D[] = [
      { x: 100.5, y: 100.2, z: 0.1 },
      { x: 199.8, y: 99.7, z: -0.2 }
    ];

    const res = TacticalNdtPointCloudCadMeshAligner.alignPointCloudToCadMesh(points, cadFaces);
    expect(res.sourcePointCount).toBe(2);
    expect(res.residualRmseMm).toBeLessThan(1.0);
    expect(res.structuralDeformationStatus).toBe("WITHIN_TOLERANCE");
    expect(res.verificationSha256).toHaveLength(64);
  });

  it("detects severe buckling deformation exceeding tolerance threshold", () => {
    const points: Point3D[] = [
      { x: 100, y: 100, z: 12.0 }, // 12mm bulge vs 2mm tolerance
      { x: 200, y: 100, z: 0 }
    ];

    const res = TacticalNdtPointCloudCadMeshAligner.alignPointCloudToCadMesh(points, cadFaces);
    expect(res.structuralDeformationStatus).toBe("CRITICAL_BUCKLING_EXCEEDED");
    expect(res.maxDisplacementMm).toBeGreaterThan(10.0);
  });

  it("throws validation errors on empty inputs", () => {
    expect(() =>
      TacticalNdtPointCloudCadMeshAligner.alignPointCloudToCadMesh([], cadFaces)
    ).toThrow("Measured points array cannot be empty.");

    expect(() =>
      TacticalNdtPointCloudCadMeshAligner.alignPointCloudToCadMesh([{ x: 0, y: 0, z: 0 }], [])
    ).toThrow("CAD reference mesh faces array cannot be empty.");
  });
});
