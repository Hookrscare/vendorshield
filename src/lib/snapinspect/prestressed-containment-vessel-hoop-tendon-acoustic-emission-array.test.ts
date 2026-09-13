/**
 * src/lib/snapinspect/prestressed-containment-vessel-hoop-tendon-acoustic-emission-array.test.ts
 * Unit tests for SNAP-73: Pre-Stressed Containment Vessel Hoop Tendon Acoustic Emission Array.
 */

import { describe, it, expect } from "vitest";
import {
  PrestressedContainmentHoopTendonArray,
  type PiezoelectricRingSensor,
  type AcousticEmissionHit,
} from "./prestressed-containment-vessel-hoop-tendon-acoustic-emission-array";

describe("SNAP-73: Pre-Stressed Containment Vessel Hoop Tendon Acoustic Emission Array", () => {
  const setupArray = () => {
    const array = new PrestressedContainmentHoopTendonArray(22.0, 50.0, 4000.0);

    // Register 4 ring sensors at Z = 25m
    const sensors: PiezoelectricRingSensor[] = [
      { sensorId: "S1", coord: { radiusMeters: 22.0, thetaRad: 0, zMeters: 25.0 }, frequencyBandKhz: [50, 400], sensitivityDb: -65 },
      { sensorId: "S2", coord: { radiusMeters: 22.0, thetaRad: Math.PI / 2, zMeters: 25.0 }, frequencyBandKhz: [50, 400], sensitivityDb: -65 },
      { sensorId: "S3", coord: { radiusMeters: 22.0, thetaRad: Math.PI, zMeters: 25.0 }, frequencyBandKhz: [50, 400], sensitivityDb: -65 },
      { sensorId: "S4", coord: { radiusMeters: 22.0, thetaRad: (3 * Math.PI) / 2, zMeters: 25.0 }, frequencyBandKhz: [50, 400], sensitivityDb: -65 },
    ];

    sensors.forEach((s) => array.registerSensor(s));
    return { array, sensors };
  };

  it("should calculate correct cylindrical geodesic distance", () => {
    const { array } = setupArray();
    const c1 = { radiusMeters: 22.0, thetaRad: 0, zMeters: 10.0 };
    const c2 = { radiusMeters: 22.0, thetaRad: 0, zMeters: 14.0 };
    expect(array.surfaceDistance(c1, c2)).toBeCloseTo(4.0, 2);

    // Quarter circle arc: 22.0 * (PI / 2) ≈ 34.5575m
    const c3 = { radiusMeters: 22.0, thetaRad: Math.PI / 2, zMeters: 10.0 };
    expect(array.surfaceDistance(c1, c3)).toBeCloseTo(22.0 * (Math.PI / 2), 2);
  });

  it("should triangulate an acoustic wire-break event near S1", () => {
    const { array } = setupArray();

    // Wire break near S1 (theta=0.05, z=25.2)
    const hits: AcousticEmissionHit[] = [
      { sensorId: "S1", arrivalTimeSeconds: 0.0001, peakAmplitudeDb: 88, durationMicroseconds: 240, energyEu: 1500 },
      { sensorId: "S2", arrivalTimeSeconds: 0.0087, peakAmplitudeDb: 72, durationMicroseconds: 180, energyEu: 600 },
      { sensorId: "S4", arrivalTimeSeconds: 0.0088, peakAmplitudeDb: 71, durationMicroseconds: 175, energyEu: 580 },
    ];

    const event = array.triangulateEvent(hits, 0.96);
    expect(event.eventId).toBeDefined();
    expect(event.estimatedLocation.radiusMeters).toBe(22.0);
    expect(event.estimatedLocation.zMeters).toBeGreaterThan(0);
    expect(event.estimatedLocation.zMeters).toBeLessThan(50);
    expect(event.felicityRatio).toBeGreaterThan(0.7);
    expect(event.severity).toBe("NORMAL");
    expect(event.alert).toBe(false);
  });

  it("should trigger ELEVATED and CRITICAL severity when localized cluster count escalates", () => {
    const { array } = setupArray();

    const hits: AcousticEmissionHit[] = [
      { sensorId: "S1", arrivalTimeSeconds: 0.0001, peakAmplitudeDb: 88, durationMicroseconds: 240, energyEu: 1500 },
      { sensorId: "S2", arrivalTimeSeconds: 0.0087, peakAmplitudeDb: 72, durationMicroseconds: 180, energyEu: 600 },
      { sensorId: "S4", arrivalTimeSeconds: 0.0088, peakAmplitudeDb: 71, durationMicroseconds: 175, energyEu: 580 },
    ];

    // Event 1
    const ev1 = array.triangulateEvent(hits, 0.96);
    expect(ev1.localizedClusterCount1m).toBe(1);

    // Event 2 in same vicinity
    const ev2 = array.triangulateEvent(hits, 0.96);
    expect(ev2.localizedClusterCount1m).toBe(2);
    expect(ev2.severity).toBe("ELEVATED");
    expect(ev2.alert).toBe(true);

    // Event 3 in same vicinity -> CRITICAL cluster
    const ev3 = array.triangulateEvent(hits, 0.96);
    expect(ev3.localizedClusterCount1m).toBe(3);
    expect(ev3.severity).toBe("CRITICAL");
    expect(ev3.alert).toBe(true);
  });

  it("should throw error if fewer than 3 sensor hits provided", () => {
    const { array } = setupArray();
    const hits: AcousticEmissionHit[] = [
      { sensorId: "S1", arrivalTimeSeconds: 0.0001, peakAmplitudeDb: 88, durationMicroseconds: 240, energyEu: 1500 },
      { sensorId: "S2", arrivalTimeSeconds: 0.0087, peakAmplitudeDb: 72, durationMicroseconds: 180, energyEu: 600 },
    ];
    expect(() => array.triangulateEvent(hits)).toThrow("Insufficient sensor hits for triangulation");
  });
});
