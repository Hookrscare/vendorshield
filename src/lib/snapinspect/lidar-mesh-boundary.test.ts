import { describe, it, expect } from 'vitest';
import {
  computeBoundingBox3D,
  extractConvexHull2D,
  computePolygonMetrics,
  extractLiDARBoundaryMesh,
  exportBoundaryGeoJSON,
  LiDARPoint
} from './lidar-mesh-boundary';

describe('SNAP-16: Automated 3D LiDAR Point Cloud Mesh Boundary Extractor', () => {
  it('computes 3D bounding box dimensions and centroid correctly', () => {
    const points: LiDARPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 20, z: 3 },
      { x: 0, y: 20, z: 3 }
    ];

    const bbox = computeBoundingBox3D(points);
    expect(bbox.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(bbox.max).toEqual({ x: 10, y: 20, z: 3 });
    expect(bbox.dimensions.width).toBe(10);
    expect(bbox.dimensions.length).toBe(20);
    expect(bbox.dimensions.height).toBe(3);
    expect(bbox.centroid).toEqual({ x: 5, y: 10, z: 1.5 });
  });

  it('extracts convex hull and computes area/perimeter for rectangular room', () => {
    // 5m x 4m rectangle with interior noisy points
    const points: LiDARPoint[] = [
      { x: 0, y: 0, z: 1 },
      { x: 5, y: 0, z: 1.2 },
      { x: 5, y: 4, z: 1.5 },
      { x: 0, y: 4, z: 0.8 },
      { x: 2.5, y: 2, z: 1.0 }, // interior
      { x: 1.0, y: 3, z: 1.1 }  // interior
    ];

    const res = extractLiDARBoundaryMesh(points);
    expect(res.pointCount).toBe(6);
    expect(res.floorAreaSqMeters).toBe(20); // 5 * 4 = 20
    expect(res.perimeterMeters).toBe(18);   // 2*(5+4) = 18
  });

  it('filters point cloud by vertical height slice and classification', () => {
    const points: LiDARPoint[] = [
      { x: 0, y: 0, z: -0.5, classification: 'UNCLASSIFIED' }, // below min
      { x: 0, y: 0, z: 1.0, classification: 'WALL' },
      { x: 4, y: 0, z: 1.0, classification: 'WALL' },
      { x: 4, y: 3, z: 1.0, classification: 'WALL' },
      { x: 0, y: 3, z: 1.0, classification: 'WALL' },
      { x: 2, y: 1.5, z: 3.5, classification: 'CEILING' }    // ceiling
    ];

    const res = extractLiDARBoundaryMesh(points, {
      minHeightMeters: 0.0,
      maxHeightMeters: 3.0,
      excludeCeiling: true
    });

    expect(res.filteredCount).toBe(4);
    expect(res.floorAreaSqMeters).toBe(12); // 4 * 3 = 12
  });

  it('exports valid GeoJSON polygon geometry with room properties', () => {
    const points: LiDARPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 6, y: 0, z: 0 },
      { x: 6, y: 5, z: 2.8 },
      { x: 0, y: 5, z: 2.8 }
    ];

    const res = extractLiDARBoundaryMesh(points);
    const geojson = exportBoundaryGeoJSON(res, { roomId: 'RM-101', roomType: 'Conference' });

    expect(geojson.type).toBe('Feature');
    expect(geojson.properties.roomId).toBe('RM-101');
    expect(geojson.properties.floorAreaSqMeters).toBe(30);
    expect(geojson.geometry.type).toBe('Polygon');
    // Closed polygon ring has first and last vertex identical
    const coords = geojson.geometry.coordinates[0];
    expect(coords.length).toBe(res.boundaryVertices.length + 1);
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });
});
