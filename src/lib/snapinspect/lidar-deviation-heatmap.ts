/**
 * SNAP-27: Automated As-Built vs Design LiDAR Point Cloud Deviation Heatmap.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Analyzes high-density LiDAR point clouds against 3D CAD/BIM design surface planes.
 * Computes signed orthogonal deviations (protrusions vs depressions), computes statistical
 * metrics (RMSE, MAD, out-of-tolerance ratio), and generates color-coded deviation heatmaps
 * (Blue-Green-Red palette) with automated construction rework zone detection.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
  intensity?: number;
}

export interface DesignPlane {
  id: string;
  name: string;
  // Plane equation: Ax + By + Cz + D = 0 where normal [A, B, C] is normalized
  normal: [number, number, number];
  d: number;
  bounds: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
  };
  toleranceMm: number; // e.g. 5mm or 10mm
}

export type DeviationClassification = "IN_TOLERANCE" | "POSITIVE_PROTRUSION" | "NEGATIVE_DEPRESSION" | "CRITICAL_DEFECT";

export interface PointDeviation {
  point: Point3D;
  signedDeviationMm: number;
  absoluteDeviationMm: number;
  classification: DeviationClassification;
  colorHex: string; // Hex color for heatmap rendering
}

export interface DeviationGridCell {
  cellX: number;
  cellY: number;
  sampleCount: number;
  avgDeviationMm: number;
  maxDeviationMm: number;
  minDeviationMm: number;
  colorHex: string;
  isReworkRequired: boolean;
}

export interface DeviationHeatmapReport {
  planeId: string;
  planeName: string;
  totalPointsEvaluated: number;
  inToleranceCount: number;
  outOfToleranceCount: number;
  inTolerancePercentage: number;
  rmseMm: number;
  meanAbsoluteDeviationMm: number;
  maxProtrusionMm: number;
  maxDepressionMm: number;
  reworkRequiredZonesCount: number;
  gridCells: DeviationGridCell[];
  points: PointDeviation[];
  generatedAtIso: string;
}

export class LidarDeviationHeatmapEngine {
  /**
   * Normalizes a vector [A, B, C].
   */
  public static normalizeNormal(normal: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (len === 0) return [0, 0, 1];
    return [normal[0] / len, normal[1] / len, normal[2] / len];
  }

  /**
   * Maps signed deviation in mm to a heatmap hex color:
   * Negative (depression): Blue shades (#0000FF -> #00FFFF)
   * Within tolerance: Green shades (#00FF00)
   * Positive (protrusion/bulge): Red/Orange shades (#FFFF00 -> #FF0000)
   */
  public static deviationToColor(signedDeviationMm: number, toleranceMm: number): string {
    const absDev = Math.abs(signedDeviationMm);
    if (absDev <= toleranceMm) {
      return "#22C55E"; // Clean Tailwind Green
    }
    if (signedDeviationMm > toleranceMm) {
      const excess = signedDeviationMm - toleranceMm;
      if (excess > toleranceMm * 2) return "#EF4444"; // Critical Red
      return "#F97316"; // Warning Orange
    } else {
      const defect = Math.abs(signedDeviationMm) - toleranceMm;
      if (defect > toleranceMm * 2) return "#1D4ED8"; // Deep Blue
      return "#3B82F6"; // Warning Light Blue
    }
  }

  /**
   * Classifies deviation severity relative to design tolerance.
   */
  public static classifyDeviation(signedDeviationMm: number, toleranceMm: number): DeviationClassification {
    const abs = Math.abs(signedDeviationMm);
    if (abs <= toleranceMm) return "IN_TOLERANCE";
    if (abs > toleranceMm * 2.5) return "CRITICAL_DEFECT";
    return signedDeviationMm > 0 ? "POSITIVE_PROTRUSION" : "NEGATIVE_DEPRESSION";
  }

  /**
   * Analyzes an as-built point cloud against a target design surface plane.
   */
  public static analyzeDeviation(
    points: Point3D[],
    plane: DesignPlane,
    gridResolutionMeters: number = 0.5
  ): DeviationHeatmapReport {
    const norm = this.normalizeNormal(plane.normal);
    const evaluatedDeviations: PointDeviation[] = [];

    let sumSquaredDeviation = 0;
    let sumAbsoluteDeviation = 0;
    let maxProtrusion = 0;
    let maxDepression = 0;
    let inToleranceCount = 0;

    const gridMap: Map<string, { sumDev: number; maxDev: number; minDev: number; count: number; cellX: number; cellY: number }> = new Map();

    for (const pt of points) {
      // Check if point falls roughly within plane bounds
      if (
        pt.x < plane.bounds.minX - 0.5 || pt.x > plane.bounds.maxX + 0.5 ||
        pt.y < plane.bounds.minY - 0.5 || pt.y > plane.bounds.maxY + 0.5 ||
        pt.z < plane.bounds.minZ - 0.5 || pt.z > plane.bounds.maxZ + 0.5
      ) {
        continue;
      }

      // Signed distance from point to plane: (Ax + By + Cz + D) in meters, converted to mm
      const distanceMeters = norm[0] * pt.x + norm[1] * pt.y + norm[2] * pt.z + plane.d;
      const signedDeviationMm = distanceMeters * 1000;
      const absDeviationMm = Math.abs(signedDeviationMm);

      sumSquaredDeviation += signedDeviationMm ** 2;
      sumAbsoluteDeviation += absDeviationMm;

      if (signedDeviationMm > maxProtrusion) maxProtrusion = signedDeviationMm;
      if (signedDeviationMm < maxDepression) maxDepression = signedDeviationMm;

      const classification = this.classifyDeviation(signedDeviationMm, plane.toleranceMm);
      if (classification === "IN_TOLERANCE") inToleranceCount++;

      const colorHex = this.deviationToColor(signedDeviationMm, plane.toleranceMm);
      evaluatedDeviations.push({
        point: pt,
        signedDeviationMm: Math.round(signedDeviationMm * 100) / 100,
        absoluteDeviationMm: Math.round(absDeviationMm * 100) / 100,
        classification,
        colorHex
      });

      // Aggregate into 2D heatmap spatial grid (X/Y plane projection)
      const cellX = Math.floor(pt.x / gridResolutionMeters);
      const cellY = Math.floor(pt.y / gridResolutionMeters);
      const cellKey = `${cellX}:${cellY}`;

      const cell = gridMap.get(cellKey) || { sumDev: 0, maxDev: -Infinity, minDev: Infinity, count: 0, cellX, cellY };
      cell.sumDev += signedDeviationMm;
      cell.count += 1;
      if (signedDeviationMm > cell.maxDev) cell.maxDev = signedDeviationMm;
      if (signedDeviationMm < cell.minDev) cell.minDev = signedDeviationMm;
      gridMap.set(cellKey, cell);
    }

    const totalPts = evaluatedDeviations.length;
    const rmse = totalPts > 0 ? Math.sqrt(sumSquaredDeviation / totalPts) : 0;
    const mad = totalPts > 0 ? sumAbsoluteDeviation / totalPts : 0;
    const outOfToleranceCount = totalPts - inToleranceCount;
    const inTolerancePercentage = totalPts > 0 ? (inToleranceCount / totalPts) * 100 : 100;

    const gridCells: DeviationGridCell[] = [];
    let reworkCount = 0;

    for (const [, cell] of gridMap.entries()) {
      const avgDev = cell.sumDev / cell.count;
      const isRework = Math.abs(avgDev) > plane.toleranceMm * 1.5;
      if (isRework) reworkCount++;

      gridCells.push({
        cellX: cell.cellX,
        cellY: cell.cellY,
        sampleCount: cell.count,
        avgDeviationMm: Math.round(avgDev * 100) / 100,
        maxDeviationMm: Math.round(cell.maxDev * 100) / 100,
        minDeviationMm: Math.round(cell.minDev * 100) / 100,
        colorHex: this.deviationToColor(avgDev, plane.toleranceMm),
        isReworkRequired: isRework
      });
    }

    return {
      planeId: plane.id,
      planeName: plane.name,
      totalPointsEvaluated: totalPts,
      inToleranceCount,
      outOfToleranceCount,
      inTolerancePercentage: Math.round(inTolerancePercentage * 10) / 10,
      rmseMm: Math.round(rmse * 100) / 100,
      meanAbsoluteDeviationMm: Math.round(mad * 100) / 100,
      maxProtrusionMm: Math.round(maxProtrusion * 100) / 100,
      maxDepressionMm: Math.round(maxDepression * 100) / 100,
      reworkRequiredZonesCount: reworkCount,
      gridCells,
      points: evaluatedDeviations,
      generatedAtIso: new Date().toISOString()
    };
  }
}
