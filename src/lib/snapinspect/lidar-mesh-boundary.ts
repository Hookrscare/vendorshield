/**
 * SNAP-16: Automated 3D LiDAR Point Cloud Mesh Boundary Extractor.
 * Processes iPhone / iPad Pro LiDAR & drone point clouds, computes 3D bounding volumes,
 * extracts 2D floorplan boundary hulls via convex/concave boundary tracing,
 * and exports CAD/GeoJSON geometry for tactical building inspection.
 */

export interface LiDARPoint {
  x: number; // meters
  y: number; // meters
  z: number; // meters (height)
  intensity?: number;
  classification?: 'GROUND' | 'WALL' | 'CEILING' | 'ROOF' | 'UNCLASSIFIED';
}

export interface BoundingBox3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  dimensions: { width: number; length: number; height: number };
  centroid: { x: number; y: number; z: number };
}

export interface Point2D {
  x: number;
  y: number;
}

export interface MeshBoundaryResult {
  boundingBox: BoundingBox3D;
  pointCount: number;
  filteredCount: number;
  boundaryVertices: Point2D[];
  floorAreaSqMeters: number;
  perimeterMeters: number;
  estimatedRoomVolumeCuMeters: number;
}

export function computeBoundingBox3D(points: LiDARPoint[]): BoundingBox3D {
  if (points.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      dimensions: { width: 0, length: 0, height: 0 },
      centroid: { x: 0, y: 0, z: 0 }
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
    sumX += p.x;
    sumY += p.y;
    sumZ += p.z;
  }

  const n = points.length;
  return {
    min: { x: round3(minX), y: round3(minY), z: round3(minZ) },
    max: { x: round3(maxX), y: round3(maxY), z: round3(maxZ) },
    dimensions: {
      width: round3(maxX - minX),
      length: round3(maxY - minY),
      height: round3(maxZ - minZ)
    },
    centroid: {
      x: round3(sumX / n),
      y: round3(sumY / n),
      z: round3(sumZ / n)
    }
  };
}

/**
 * Computes 2D Convex Hull of points on XY plane using Andrew's Monotone Chain algorithm.
 */
export function extractConvexHull2D(points: Point2D[]): Point2D[] {
  if (points.length <= 2) return [...points];

  // Sort by x, then by y
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  // Cross product of OA and OB vectors: (A.x - O.x)*(B.y - O.y) - (A.y - O.y)*(B.x - O.x)
  const cross = (o: Point2D, a: Point2D, b: Point2D) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Lower hull
  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove duplicate last points
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Calculates 2D polygon area using Shoelace formula and perimeter.
 */
export function computePolygonMetrics(polygon: Point2D[]): { area: number; perimeter: number } {
  if (polygon.length < 3) return { area: 0, perimeter: 0 };

  let area = 0;
  let perimeter = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    area += (p1.x * p2.y) - (p2.x * p1.y);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  area = Math.abs(area) / 2.0;
  return {
    area: round3(area),
    perimeter: round3(perimeter)
  };
}

export function extractLiDARBoundaryMesh(
  points: LiDARPoint[],
  options?: {
    minHeightMeters?: number;
    maxHeightMeters?: number;
    excludeCeiling?: boolean;
  }
): MeshBoundaryResult {
  const minH = options?.minHeightMeters ?? -Infinity;
  const maxH = options?.maxHeightMeters ?? Infinity;

  const filtered = points.filter(p => {
    if (p.z < minH || p.z > maxH) return false;
    if (options?.excludeCeiling && p.classification === 'CEILING') return false;
    return true;
  });

  const bbox = computeBoundingBox3D(filtered);
  const points2D: Point2D[] = filtered.map(p => ({ x: p.x, y: p.y }));
  const boundaryHull = extractConvexHull2D(points2D);
  const { area, perimeter } = computePolygonMetrics(boundaryHull);

  return {
    boundingBox: bbox,
    pointCount: points.length,
    filteredCount: filtered.length,
    boundaryVertices: boundaryHull,
    floorAreaSqMeters: area,
    perimeterMeters: perimeter,
    estimatedRoomVolumeCuMeters: round3(area * bbox.dimensions.height)
  };
}

export function exportBoundaryGeoJSON(result: MeshBoundaryResult, properties: Record<string, any> = {}): Record<string, any> {
  const coordinates = result.boundaryVertices.map(v => [v.x, v.y]);
  if (coordinates.length > 0) {
    // Close GeoJSON ring
    coordinates.push([coordinates[0][0], coordinates[0][1]]);
  }

  return {
    type: 'Feature',
    properties: {
      ...properties,
      floorAreaSqMeters: result.floorAreaSqMeters,
      perimeterMeters: result.perimeterMeters,
      heightMeters: result.boundingBox.dimensions.height,
      estimatedRoomVolumeCuMeters: result.estimatedRoomVolumeCuMeters
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
