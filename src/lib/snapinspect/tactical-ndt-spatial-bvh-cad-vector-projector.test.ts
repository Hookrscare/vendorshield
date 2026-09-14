import { describe, it, expect } from "vitest";
import {
  TacticalNdtSpatialBvhCadVectorProjector,
  TriangleMesh,
  TransducerBeamPose
} from "./tactical-ndt-spatial-bvh-cad-vector-projector";

describe("SNAP-140: TacticalNdtSpatialBvhCadVectorProjector", () => {
  const floorTriangle: TriangleMesh = {
    id: "tri_pipe_weld_01",
    v0: { x: -100, y: -100, z: 0 },
    v1: { x: 100, y: -100, z: 0 },
    v2: { x: 0, y: 100, z: 0 }
  };

  it("projects perpendicular beam hitting CAD surface accurately", () => {
    const beam: TransducerBeamPose = {
      sampleId: "paut_probe_hit_01",
      origin: { x: 0, y: 0, z: 50 },
      directionVector: { x: 0, y: 0, z: -1 }, // pointing straight down
      apertureWidthMm: 32.0
    };

    const res = TacticalNdtSpatialBvhCadVectorProjector.projectBeams([beam], [floorTriangle]);
    expect(res.intersections).toHaveLength(1);
    const hit = res.intersections[0];
    expect(hit.sampleId).toBe("paut_probe_hit_01");
    expect(hit.distanceMm).toBe(50.0);
    expect(hit.hitPoint).toEqual({ x: 0, y: 0, z: 0 });
    expect(hit.isPerpendicularCompliant).toBe(true);
    expect(res.coverageRatio).toBe(1.0);
    expect(res.tamperVerificationSha256).toHaveLength(64);
  });

  it("handles ray missing CAD triangle", () => {
    const missingBeam: TransducerBeamPose = {
      sampleId: "paut_miss_02",
      origin: { x: 500, y: 500, z: 50 },
      directionVector: { x: 0, y: 0, z: -1 },
      apertureWidthMm: 32.0
    };

    const res = TacticalNdtSpatialBvhCadVectorProjector.projectBeams([missingBeam], [floorTriangle]);
    expect(res.intersections).toHaveLength(0);
    expect(res.coverageRatio).toBe(0.0);
  });

  it("validates empty inputs", () => {
    expect(() =>
      TacticalNdtSpatialBvhCadVectorProjector.projectBeams([], [floorTriangle])
    ).toThrow("beams array cannot be empty.");

    expect(() =>
      TacticalNdtSpatialBvhCadVectorProjector.projectBeams(
        [{ sampleId: "b1", origin: { x: 0, y: 0, z: 0 }, directionVector: { x: 0, y: 0, z: 1 }, apertureWidthMm: 10 }],
        []
      )
    ).toThrow("mesh array cannot be empty.");
  });
});
