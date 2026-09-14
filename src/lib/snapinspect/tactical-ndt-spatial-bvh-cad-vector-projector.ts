/**
 * SNAP-140: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 *
 * Ray-triangle surface projection and ultrasonic volumetric coverage calculation
 * aligning field NDT transducer beam trajectories with 3D CAD surfaces.
 */

import { createHash } from "crypto";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TriangleMesh {
  id: string;
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

export interface TransducerBeamPose {
  sampleId: string;
  origin: Vec3;
  directionVector: Vec3; // Normalized beam steering vector
  apertureWidthMm: number;
}

export interface BeamIntersectionResult {
  sampleId: string;
  meshTriangleId: string;
  hitPoint: Vec3;
  distanceMm: number;
  incidentAngleDeg: number;
  isPerpendicularCompliant: boolean; // ASME: within +/- 15 deg of surface normal
}

export class TacticalNdtSpatialBvhCadVectorProjector {
  private static dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private static cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  private static sub(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  /**
   * Möller–Trumbore ray-triangle intersection algorithm.
   */
  public static intersectRayTriangle(
    rayOrigin: Vec3,
    rayDir: Vec3,
    tri: TriangleMesh
  ): { hit: boolean; t: number; point?: Vec3; normal?: Vec3 } {
    const EPSILON = 1e-7;
    const edge1 = this.sub(tri.v1, tri.v0);
    const edge2 = this.sub(tri.v2, tri.v0);

    const h = this.cross(rayDir, edge2);
    const a = this.dot(edge1, h);

    if (a > -EPSILON && a < EPSILON) {
      return { hit: false, t: -1 }; // Ray is parallel to triangle
    }

    const f = 1.0 / a;
    const s = this.sub(rayOrigin, tri.v0);
    const u = f * this.dot(s, h);

    if (u < 0.0 || u > 1.0) {
      return { hit: false, t: -1 };
    }

    const q = this.cross(s, edge1);
    const v = f * this.dot(rayDir, q);

    if (v < 0.0 || u + v > 1.0) {
      return { hit: false, t: -1 };
    }

    const t = f * this.dot(edge2, q);
    if (t > EPSILON) {
      const normalUnnorm = this.cross(edge1, edge2);
      const len = Math.hypot(normalUnnorm.x, normalUnnorm.y, normalUnnorm.z);
      const normal = {
        x: normalUnnorm.x / (len || 1),
        y: normalUnnorm.y / (len || 1),
        z: normalUnnorm.z / (len || 1)
      };

      return {
        hit: true,
        t,
        point: {
          x: rayOrigin.x + rayDir.x * t,
          y: rayOrigin.y + rayDir.y * t,
          z: rayOrigin.z + rayDir.z * t
        },
        normal
      };
    }

    return { hit: false, t: -1 };
  }

  /**
   * Projects transducer beam vectors against a collection of CAD mesh triangles.
   */
  public static projectBeams(
    beams: TransducerBeamPose[],
    mesh: TriangleMesh[]
  ): {
    intersections: BeamIntersectionResult[];
    coverageRatio: number;
    tamperVerificationSha256: string;
  } {
    if (!beams || beams.length === 0) throw new Error("beams array cannot be empty.");
    if (!mesh || mesh.length === 0) throw new Error("mesh array cannot be empty.");

    const intersections: BeamIntersectionResult[] = [];
    let hitCount = 0;

    for (const beam of beams) {
      let closestHit: { t: number; tri: TriangleMesh; point: Vec3; normal: Vec3 } | null = null;

      for (const tri of mesh) {
        const res = this.intersectRayTriangle(beam.origin, beam.directionVector, tri);
        if (res.hit && res.point && res.normal) {
          if (!closestHit || res.t < closestHit.t) {
            closestHit = { t: res.t, tri, point: res.point, normal: res.normal };
          }
        }
      }

      if (closestHit) {
        hitCount++;
        // Calculate angle between beam and normal (dot product)
        const cosAngle = Math.abs(this.dot(beam.directionVector, closestHit.normal));
        const angleDeg = Math.acos(Math.min(1.0, cosAngle)) * (180.0 / Math.PI);

        intersections.push({
          sampleId: beam.sampleId,
          meshTriangleId: closestHit.tri.id,
          hitPoint: closestHit.point,
          distanceMm: parseFloat(closestHit.t.toFixed(2)),
          incidentAngleDeg: parseFloat(angleDeg.toFixed(2)),
          isPerpendicularCompliant: angleDeg <= 15.0
        });
      }
    }

    const coverageRatio = hitCount / beams.length;
    const digest = createHash("sha256")
      .update(`${beams.length}:${mesh.length}:${hitCount}:${coverageRatio.toFixed(3)}`)
      .digest("hex");

    return {
      intersections,
      coverageRatio: parseFloat(coverageRatio.toFixed(3)),
      tamperVerificationSha256: digest
    };
  }
}
