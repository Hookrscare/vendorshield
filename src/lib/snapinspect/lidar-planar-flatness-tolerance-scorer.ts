/**
 * SNAP-77: LiDAR Ground Surface Point Cloud Normal Vector Planar Flatness Tolerance Scorer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 * 
 * Computes best-fit planar regression, normal vectors, and root-mean-square distance (RMSD)
 * deviations from dense LiDAR 3D point clouds against ASTM E1155 construction tolerances.
 */

import { createHash } from "crypto";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PlanarToleranceConfig {
  maxAllowableRmsdMm: number; // e.g., 3.0 mm for high-precision finish slab
  maxPeakDeviationMm: number;  // e.g., 6.0 mm maximum localized bump/dip
  targetNormal?: [number, number, number]; // e.g., [0, 0, 1] for horizontal floor
}

export interface PlanarEvaluationResult {
  surfaceId: string;
  pointsEvaluated: number;
  bestFitNormal: [number, number, number];
  planeConstantD: number; // ax + by + cz + d = 0
  rmsdDeviationMm: number;
  peakDeviationMm: number;
  isWithinTolerance: boolean;
  outOfTolerancePointsCount: number;
  flatnessGrade: "SPECIFICATION_COMPLIANT_PREMIUM" | "ACCEPTABLE_STANDARD" | "REMEDIATION_REQUIRED_DEFECTIVE";
  telemetryHash: string;
}

export class LidarPlanarFlatnessToleranceScorer {
  public static evaluatePlanarTolerance(
    surfaceId: string,
    points: Point3D[],
    config: PlanarToleranceConfig
  ): PlanarEvaluationResult {
    if (!surfaceId) {
      throw new Error("surfaceId must be provided.");
    }
    if (points.length < 3) {
      throw new Error("At least 3 points are required to define a plane.");
    }

    const n = points.length;

    // 1. Calculate centroid
    let cx = 0, cy = 0, cz = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
      cz += p.z;
    }
    cx /= n;
    cy /= n;
    cz /= n;

    // 2. Covariance matrix elements centered at centroid
    let xx = 0, xy = 0, xz = 0;
    let yy = 0, yz = 0, zz = 0;

    for (const p of points) {
      const rx = p.x - cx;
      const ry = p.y - cy;
      const rz = p.z - cz;
      xx += rx * rx;
      xy += rx * ry;
      xz += rx * rz;
      yy += ry * ry;
      yz += ry * rz;
      zz += rz * rz;
    }

    // Direct normal estimation: for horizontal slabs, z is primary up direction.
    // Cross product of principal spread vectors:
    // Solve normal [a, b, c] where det(M - lambda*I) is minimized.
    // Standard robust normal via cross-covariance:
    const detX = yy * zz - yz * yz;
    const detY = xx * zz - xz * xz;
    const detZ = xx * yy - xy * xy;

    let nx = 0, ny = 0, nz = 1;
    if (detZ >= detX && detZ >= detY && detZ > 1e-9) {
      nx = (yz * xy - xz * yy) / detZ;
      ny = (xz * xy - yz * xx) / detZ;
      nz = 1.0;
    } else if (detX >= detY && detX > 1e-9) {
      nx = 1.0;
      ny = (xz * yz - xy * zz) / detX;
      nz = (xy * yz - xz * yy) / detX;
    } else if (detY > 1e-9) {
      nx = (yz * xz - xy * zz) / detY;
      ny = 1.0;
      nz = (xy * xz - yz * xx) / detY;
    }

    const norm = Math.hypot(nx, ny, nz);
    nx /= norm;
    ny /= norm;
    nz /= norm;

    // If target normal is provided and opposite, flip
    if (config.targetNormal) {
      const dot = nx * config.targetNormal[0] + ny * config.targetNormal[1] + nz * config.targetNormal[2];
      if (dot < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
    }

    const d = -(nx * cx + ny * cy + nz * cz);

    // 3. Distance deviations for each point in mm (assuming inputs are in meters)
    let sumSqDevMm = 0;
    let peakDevMm = 0;
    let ootCount = 0;

    for (const p of points) {
      // Orthogonal distance from point to plane
      const distM = Math.abs(nx * p.x + ny * p.y + nz * p.z + d);
      const distMm = distM * 1000.0;
      sumSqDevMm += distMm * distMm;
      if (distMm > peakDevMm) {
        peakDevMm = distMm;
      }
      if (distMm > config.maxPeakDeviationMm) {
        ootCount++;
      }
    }

    const rmsdMm = Math.sqrt(sumSqDevMm / n);
    const isWithinTolerance = rmsdMm <= config.maxAllowableRmsdMm && peakDevMm <= config.maxPeakDeviationMm;

    let flatnessGrade: PlanarEvaluationResult["flatnessGrade"] = "SPECIFICATION_COMPLIANT_PREMIUM";
    if (!isWithinTolerance) {
      flatnessGrade = "REMEDIATION_REQUIRED_DEFECTIVE";
    } else if (rmsdMm > config.maxAllowableRmsdMm * 0.7) {
      flatnessGrade = "ACCEPTABLE_STANDARD";
    }

    const raw = `${surfaceId}:${points.length}:${rmsdMm.toFixed(3)}:${peakDevMm.toFixed(3)}:${isWithinTolerance}`;
    const telemetryHash = createHash("sha256").update(raw).digest("hex");

    return {
      surfaceId,
      pointsEvaluated: n,
      bestFitNormal: [round(nx, 4), round(ny, 4), round(nz, 4)],
      planeConstantD: round(d, 4),
      rmsdDeviationMm: round(rmsdMm, 3),
      peakDeviationMm: round(peakDevMm, 3),
      isWithinTolerance,
      outOfTolerancePointsCount: ootCount,
      flatnessGrade,
      telemetryHash
    };
  }
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
