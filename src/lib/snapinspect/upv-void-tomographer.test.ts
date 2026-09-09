/**
 * Unit tests for SNAP-38: Multi-Sensor Concrete Rebar Ultrasonic Pulse Velocity (UPV) Void Tomographer.
 */

import { describe, it, expect } from "vitest";
import {
  UPVVoidTomographer,
  UPVMeasurementRay,
} from "./upv-void-tomographer";

describe("SNAP-38: Ultrasonic Pulse Velocity (UPV) Void Tomographer", () => {
  it("should calculate exact propagation path length and velocity (km/s)", () => {
    // 300 mm thickness, direct transmission taking 75 µs -> 300 / 75 = 4.0 km/s (Good concrete)
    const dist = UPVVoidTomographer.calculatePathLengthMm([0, 0], [300, 0]);
    expect(dist).toBe(300);

    const v = UPVVoidTomographer.calculateRawVelocity(dist, 75);
    expect(v).toBe(4.0);
    expect(UPVVoidTomographer.classifyQuality(v)).toBe("GOOD");
  });

  it("should adjust raw velocity when near high-velocity steel reinforcement (BS 1881-203)", () => {
    const rawV = 4.8; // Appears excellent due to rebar
    const correctedV = UPVVoidTomographer.applyRebarCorrection(rawV, 25, 16); // 16mm rebar at 25mm depth
    expect(correctedV).toBeLessThan(rawV);
    expect(correctedV).toBeGreaterThan(3.5);
  });

  it("should reconstruct 2D tomogram and flag internal voids/delaminations", () => {
    const rays: UPVMeasurementRay[] = [
      // Ray 1: Sound concrete zone
      {
        rayId: "RAY-01",
        txCoordinatesMm: [50, 0],
        rxCoordinatesMm: [50, 300],
        transitTimeMicroseconds: 70, // 300 / 70 = 4.28 km/s
        mode: "DIRECT",
      },
      // Ray 2: Void / honeycomb anomaly zone (slow arrival)
      {
        rayId: "RAY-02",
        txCoordinatesMm: [250, 0],
        rxCoordinatesMm: [250, 300],
        transitTimeMicroseconds: 180, // 300 / 180 = 1.66 km/s -> Void
        mode: "DIRECT",
      },
      // Ray 3: Sound concrete zone
      {
        rayId: "RAY-03",
        txCoordinatesMm: [450, 0],
        rxCoordinatesMm: [450, 300],
        transitTimeMicroseconds: 72, // 300 / 72 = 4.16 km/s
        mode: "DIRECT",
      },
    ];

    const tomogram = UPVVoidTomographer.reconstructTomogram(rays, 500, 300, 50);
    expect(tomogram.totalRaysAnalyzed).toBe(3);
    expect(tomogram.minimumVelocityKmPerS).toBeLessThan(2.0);
    expect(tomogram.voidDetectedCount).toBeGreaterThan(0);
    expect(tomogram.criticalStructuralAlert).toBe(true);
    expect(tomogram.cadAnnotationRecommendations.length).toBeGreaterThanOrEqual(1);
    expect(tomogram.cadAnnotationRecommendations[0]).toContain("RED exclusion buffer");
  });
});
