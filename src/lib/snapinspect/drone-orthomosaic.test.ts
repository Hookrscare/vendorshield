import { describe, it, expect } from "vitest";
import {
  latLonToTileCoords,
  computeSurveyBoundingBox,
  calculatePolygonSurfaceArea,
  projectCadPointToGeo,
  generateOrthomosaicManifest,
  DroneCaptureFrame,
  RooftopPolygonVertex
} from "./drone-orthomosaic";

describe("SNAP-14: Drone Aerial Rooftop Orthomosaic Tile Map Exporter", () => {
  it("converts GPS coordinates to Web Mercator XYZ tile indices at high zoom", () => {
    // San Francisco coordinate
    const tile = latLonToTileCoords(37.7749, -122.4194, 19);
    expect(tile.z).toBe(19);
    expect(tile.x).toBeGreaterThan(0);
    expect(tile.y).toBeGreaterThan(0);
  });

  it("computes accurate survey bounding box from drone telemetry captures", () => {
    const frames: DroneCaptureFrame[] = [
      {
        photoId: "DRONE-01",
        latitude: 37.7750,
        longitude: -122.4200,
        altitudeMeters: 45.2,
        gimbalPitchDeg: -90.0,
        headingDeg: 0.0,
        gsdCmPerPixel: 1.25,
        timestampIso: "2026-09-08T14:00:00.000Z"
      },
      {
        photoId: "DRONE-02",
        latitude: 37.7760,
        longitude: -122.4180,
        altitudeMeters: 45.5,
        gimbalPitchDeg: -90.0,
        headingDeg: 90.0,
        gsdCmPerPixel: 1.26,
        timestampIso: "2026-09-08T14:00:15.000Z"
      }
    ];

    const bbox = computeSurveyBoundingBox(frames);
    expect(bbox.minLat).toBe(37.7750);
    expect(bbox.maxLat).toBe(37.7760);
    expect(bbox.minLon).toBe(-122.4200);
    expect(bbox.maxLon).toBe(-122.4180);
  });

  it("calculates commercial rooftop polygon square footage and square meterage", () => {
    // Approx 30m x 20m commercial building footprint
    const refLat = 37.7750;
    const refLon = -122.4200;
    const deltaLat = 20 / 111132.92; // 20m north
    const deltaLon = 30 / (111412.84 * Math.cos((refLat * Math.PI) / 180)); // 30m east

    const vertices: RooftopPolygonVertex[] = [
      { lat: refLat, lon: refLon },
      { lat: refLat + deltaLat, lon: refLon },
      { lat: refLat + deltaLat, lon: refLon + deltaLon },
      { lat: refLat, lon: refLon + deltaLon }
    ];

    const area = calculatePolygonSurfaceArea(vertices);
    expect(area.sqMeters).toBeGreaterThan(580);
    expect(area.sqMeters).toBeLessThan(620); // ~600 m²
    expect(area.sqFeet).toBeGreaterThan(6200);
    expect(area.sqFeet).toBeLessThan(6700);  // ~6458 ft²
  });

  it("generates full orthomosaic survey manifest with georeferenced defect projection", () => {
    const frames: DroneCaptureFrame[] = [
      {
        photoId: "DRONE-01",
        latitude: 37.7750,
        longitude: -122.4200,
        altitudeMeters: 50.0,
        gimbalPitchDeg: -90.0,
        headingDeg: 0.0,
        gsdCmPerPixel: 1.5,
        timestampIso: "2026-09-08T14:00:00.000Z"
      }
    ];

    const vertices: RooftopPolygonVertex[] = [
      { lat: 37.7750, lon: -122.4200 },
      { lat: 37.7752, lon: -122.4200 },
      { lat: 37.7752, lon: -122.4197 },
      { lat: 37.7750, lon: -122.4197 }
    ];

    const manifest = generateOrthomosaicManifest({
      surveyId: "SURV-DRONE-882",
      propertyAddress: "100 Industrial Parkway",
      frames,
      rooftopBoundary: vertices,
      cadDefects: [
        {
          pin: {
            id: "PIN-HAIL-01",
            location: { x: 100, y: 50 },
            code: "HAIL-IMPACT",
            title: "Cracked membrane from severe hail",
            trade: "ROOFING",
            severity: "CRITICAL"
          },
          anchorGeo: { lat: 37.7750, lon: -122.4200 },
          scale: 20,
          unit: "M"
        }
      ]
    });

    expect(manifest.surveyId).toBe("SURV-DRONE-882");
    expect(manifest.meanAltitudeMeters).toBe(50.0);
    expect(manifest.meanGsdCmPerPixel).toBe(1.5);
    expect(manifest.georeferencedDefects.length).toBe(1);
    expect(manifest.georeferencedDefects[0].code).toBe("HAIL-IMPACT");
    expect(manifest.georeferencedDefects[0].lat).toBeGreaterThan(37.7750);
  });
});
