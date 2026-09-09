/**
 * SNAP-14: Drone Aerial Rooftop Orthomosaic Tile Map Exporter.
 * Converts drone UAV aerial capture surveys into georeferenced Web Mercator (EPSG:3857)
 * orthomosaic tile grids, computes rooftop surface polygons, and projects defect pins.
 */

import { CADPoint, DefectPin } from "./floorplan-cad";

export interface DroneCaptureFrame {
  photoId: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  gimbalPitchDeg: number;
  headingDeg: number;
  gsdCmPerPixel: number; // Ground Sampling Distance
  timestampIso: string;
}

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface WebMercatorTileCoord {
  z: number;
  x: number;
  y: number;
}

export interface RooftopPolygonVertex {
  lat: number;
  lon: number;
}

export interface OrthomosaicSurveyManifest {
  surveyId: string;
  propertyAddress: string;
  boundingBox: GeoBoundingBox;
  centerCoordinate: { lat: number; lon: number };
  meanAltitudeMeters: number;
  meanGsdCmPerPixel: number;
  zoomLevels: number[];
  tilesCount: number;
  roofSurfaceAreaSqFt: number;
  roofSurfaceAreaSqM: number;
  georeferencedDefects: Array<{
    defectId: string;
    code: string;
    severity: string;
    lat: number;
    lon: number;
  }>;
  generatedAtIso: string;
}

/**
 * Converts Latitude/Longitude to Web Mercator XYZ Tile Coordinates at a given zoom level.
 */
export function latLonToTileCoords(lat: number, lon: number, zoom: number): WebMercatorTileCoord {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { z: zoom, x, y };
}

/**
 * Computes the minimum bounding box for a series of drone survey frames.
 */
export function computeSurveyBoundingBox(frames: DroneCaptureFrame[]): GeoBoundingBox {
  if (frames.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const f of frames) {
    if (f.latitude < minLat) minLat = f.latitude;
    if (f.latitude > maxLat) maxLat = f.latitude;
    if (f.longitude < minLon) minLon = f.longitude;
    if (f.longitude > maxLon) maxLon = f.longitude;
  }

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Computes polygon surface area in square meters using spherical excess (Shoelace on equirectangular projection).
 */
export function calculatePolygonSurfaceArea(vertices: RooftopPolygonVertex[]): { sqMeters: number; sqFeet: number } {
  if (vertices.length < 3) {
    return { sqMeters: 0, sqFeet: 0 };
  }

  // Reference latitude for planar projection in meters
  const refLat = (vertices[0].lat * Math.PI) / 180;
  const metersPerDegreeLat = 111132.92;
  const metersPerDegreeLon = 111412.84 * Math.cos(refLat);

  const pointsMeters = vertices.map(v => ({
    x: v.lon * metersPerDegreeLon,
    y: v.lat * metersPerDegreeLat
  }));

  // Shoelace formula
  let area = 0;
  const n = pointsMeters.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pointsMeters[i].x * pointsMeters[j].y;
    area -= pointsMeters[j].x * pointsMeters[i].y;
  }

  const sqMeters = Math.abs(area) / 2;
  const sqFeet = sqMeters * 10.7639;

  return {
    sqMeters: Math.round(sqMeters * 100) / 100,
    sqFeet: Math.round(sqFeet * 10) / 10
  };
}

/**
 * Projects a 2D floorplan CAD point onto GPS coordinates using anchor transformation.
 */
export function projectCadPointToGeo(
  point: CADPoint,
  anchorGeo: { lat: number; lon: number },
  cadScalePixelsPerUnit: number, // e.g. 20 px/meter
  unit: "FT" | "M"
): { lat: number; lon: number } {
  const metersPerUnit = unit === "FT" ? 0.3048 : 1.0;
  const dxMeters = (point.x / cadScalePixelsPerUnit) * metersPerUnit;
  const dyMeters = (point.y / cadScalePixelsPerUnit) * metersPerUnit;

  const latRad = (anchorGeo.lat * Math.PI) / 180;
  const deltaLat = dyMeters / 111132.92;
  const deltaLon = dxMeters / (111412.84 * Math.cos(latRad));

  return {
    lat: anchorGeo.lat + deltaLat,
    lon: anchorGeo.lon + deltaLon
  };
}

/**
 * Generates an Orthomosaic Survey Manifest and Tile Pyramid index for client map renderers.
 */
export function generateOrthomosaicManifest(params: {
  surveyId: string;
  propertyAddress: string;
  frames: DroneCaptureFrame[];
  rooftopBoundary: RooftopPolygonVertex[];
  cadDefects?: Array<{ pin: DefectPin; anchorGeo: { lat: number; lon: number }; scale: number; unit: "FT" | "M" }>;
  minZoom?: number;
  maxZoom?: number;
}): OrthomosaicSurveyManifest {
  const bbox = computeSurveyBoundingBox(params.frames);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;

  const meanAlt = params.frames.reduce((sum, f) => sum + f.altitudeMeters, 0) / Math.max(1, params.frames.length);
  const meanGsd = params.frames.reduce((sum, f) => sum + f.gsdCmPerPixel, 0) / Math.max(1, params.frames.length);

  const minZoom = params.minZoom || 19;
  const maxZoom = params.maxZoom || 21;
  const zoomLevels = [];
  let totalTiles = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    zoomLevels.push(z);
    const minTile = latLonToTileCoords(bbox.maxLat, bbox.minLon, z);
    const maxTile = latLonToTileCoords(bbox.minLat, bbox.maxLon, z);
    const tilesInZoom = (Math.abs(maxTile.x - minTile.x) + 1) * (Math.abs(maxTile.y - minTile.y) + 1);
    totalTiles += tilesInZoom;
  }

  const { sqMeters, sqFeet } = calculatePolygonSurfaceArea(params.rooftopBoundary);

  const georeferencedDefects = (params.cadDefects || []).map(item => {
    const geo = projectCadPointToGeo(item.pin.location, item.anchorGeo, item.scale, item.unit);
    return {
      defectId: item.pin.id,
      code: item.pin.code,
      severity: item.pin.severity,
      lat: geo.lat,
      lon: geo.lon
    };
  });

  return {
    surveyId: params.surveyId,
    propertyAddress: params.propertyAddress,
    boundingBox: bbox,
    centerCoordinate: { lat: centerLat, lon: centerLon },
    meanAltitudeMeters: Math.round(meanAlt * 10) / 10,
    meanGsdCmPerPixel: Math.round(meanGsd * 100) / 100,
    zoomLevels,
    tilesCount: totalTiles,
    roofSurfaceAreaSqFt: sqFeet,
    roofSurfaceAreaSqM: sqMeters,
    georeferencedDefects,
    generatedAtIso: new Date().toISOString()
  };
}
