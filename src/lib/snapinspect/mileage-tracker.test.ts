import { describe, it, expect } from "vitest";
import {
  MileageTracker,
  calculateHaversineDistance,
  DEFAULT_IRS_MILEAGE_RATE_USD,
} from "./mileage-tracker";

describe("SNAP-08: Field Inspector Mileage & GPS Trip Log Export Engine", () => {
  it("should accurately calculate Haversine geodesic distance", () => {
    // Times Square (40.7580, -73.9855) to Central Park Zoo (40.7678, -73.9718) ~ 0.98 miles
    const distMiles = calculateHaversineDistance(
      { latitude: 40.7580, longitude: -73.9855 },
      { latitude: 40.7678, longitude: -73.9718 },
      "miles"
    );
    expect(distMiles).toBeGreaterThan(0.9);
    expect(distMiles).toBeLessThan(1.1);

    const distKm = calculateHaversineDistance(
      { latitude: 40.7580, longitude: -73.9855 },
      { latitude: 40.7678, longitude: -73.9718 },
      "km"
    );
    expect(distKm).toBeCloseTo(distMiles * 1.60934, 1);
  });

  it("should track inspection trip, accumulate mileage, and compute IRS tax deduction", () => {
    const tracker = new MileageTracker(DEFAULT_IRS_MILEAGE_RATE_USD);
    const startT = 1725700000000;

    tracker.startTrip(
      "TRIP-001",
      "INSP-ROGER",
      "Commercial Roof Assessment - Facility 4",
      "Headquarters",
      startT
    );

    // Coordinate 1: Site HQ
    tracker.recordPoint({
      latitude: 37.7749,
      longitude: -122.4194,
      timestampMs: startT + 60000,
      accuracyMeters: 5,
    });

    // Coordinate 2: 5 miles away, 10 minutes later (30 mph)
    tracker.recordPoint({
      latitude: 37.8475,
      longitude: -122.4194,
      timestampMs: startT + 660000,
      accuracyMeters: 8,
    });

    const active = tracker.getActiveTrip();
    expect(active?.points).toHaveLength(2);
    expect(active?.totalMiles).toBeGreaterThan(4.5);
    expect(active?.totalMiles).toBeLessThan(5.5);
    expect(active?.irsDeductionUsd).toBeCloseTo(active!.totalMiles * 0.67, 1);

    const ended = tracker.endTrip(startT + 700000, "Facility 4");
    expect(ended?.isCompleted).toBe(true);
    expect(ended?.destinationName).toBe("Facility 4");
    expect(tracker.getActiveTrip()).toBeNull();
    expect(tracker.getCompletedTrips()).toHaveLength(1);
  });

  it("should discard low accuracy GPS noise and speed glitches", () => {
    const tracker = new MileageTracker();
    const startT = 1725700000000;
    tracker.startTrip("TRIP-002", "INSP-ALICE", "HVAC Dispatch", "HQ", startT);

    // Initial valid point
    tracker.recordPoint({
      latitude: 34.0522,
      longitude: -118.2437,
      timestampMs: startT,
      accuracyMeters: 5,
    });

    // Inaccurate sensor reading (accuracy = 85m > 50m limit)
    const acceptedInaccurate = tracker.recordPoint({
      latitude: 34.0530,
      longitude: -118.2440,
      timestampMs: startT + 10000,
      accuracyMeters: 85,
    });
    expect(acceptedInaccurate).toBe(false);

    // Glitch: Impossible 500-mile jump in 2 seconds (> 120 mph)
    const acceptedGlitch = tracker.recordPoint({
      latitude: 40.7128,
      longitude: -74.0060,
      timestampMs: startT + 2000,
      accuracyMeters: 5,
    });
    expect(acceptedGlitch).toBe(false);

    const trip = tracker.getActiveTrip();
    expect(trip?.points).toHaveLength(1); // only the initial valid point was recorded
  });

  it("should export standardized accounting CSV and GeoJSON FeatureCollection", () => {
    const tracker = new MileageTracker(0.67);
    const startT = 1725700000000;
    tracker.startTrip("TRIP-003", "INSP-BOB", "Building Structural QA", "Depot", startT);

    tracker.recordPoint({ latitude: 51.5074, longitude: -0.1278, timestampMs: startT });
    tracker.recordPoint({ latitude: 51.5200, longitude: -0.1278, timestampMs: startT + 600000 });
    const trip = tracker.endTrip(startT + 650000, "Site A")!;

    // CSV test
    const csv = tracker.exportCsv([trip]);
    expect(csv).toContain("Trip ID,Inspector ID,Purpose");
    expect(csv).toContain('"TRIP-003"');
    expect(csv).toContain('"Building Structural QA"');
    expect(csv).toContain("0.67");

    // GeoJSON test
    const geoJson = tracker.exportGeoJson(trip);
    expect(geoJson.type).toBe("FeatureCollection");
    expect(geoJson.features).toHaveLength(1);
    expect(geoJson.features[0].geometry.type).toBe("LineString");
    expect(geoJson.features[0].geometry.coordinates).toHaveLength(2);
    expect(geoJson.features[0].properties.tripId).toBe("TRIP-003");
  });
});
