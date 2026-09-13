import { describe, it, expect } from "vitest";
import {
  SubseaHvdcCableMagnetometerProfiler,
  SubseaCableSurveyScan,
  MagnetometerReading
} from "./subsea-hvdc-cable-magnetometer-profiler";

describe("SNAP-63: Subsea HVDC Cable Trench Depth-of-Burial Magnetometer Profiler", () => {
  const profiler = new SubseaHvdcCableMagnetometerProfiler();

  it("identifies compliant, securely buried subsea cable with accurate lateral offset", () => {
    // Current = 1000A. At r = 3m, theoretical B = (200 * 1000) / 3 = 66667 nT.
    // Let ROV altitude = 1.0m => expected DOB = 3.0 - 1.0 = 2.0m (>= target 1.5m)
    const scan: SubseaCableSurveyScan = {
      timestampIso: "2026-09-13T12:00:00Z",
      kpStationKm: 14.500,
      rovAltitudeSeabedM: 1.0,
      cableCurrentAmperes: 1000,
      targetBurialDepthM: 1.5,
      sensors: [
        {
          sensorId: "PORT_SENSOR",
          lateralOffsetM: -1.0,
          bxNanoTesla: 50000,
          byNanoTesla: 0,
          bzNanoTesla: -15000 // negative on port
        },
        {
          sensorId: "CTR_SENSOR",
          lateralOffsetM: 0.0,
          bxNanoTesla: 66667,
          byNanoTesla: 0,
          bzNanoTesla: 0 // zero crossing at center
        },
        {
          sensorId: "STBD_SENSOR",
          lateralOffsetM: 1.0,
          bxNanoTesla: 50000,
          byNanoTesla: 0,
          bzNanoTesla: 15000 // positive on starboard
        }
      ]
    };

    const res = profiler.analyzeSurveyScan(scan);
    expect(res.kpStationKm).toBe(14.500);
    expect(res.estimatedLateralOffsetM).toBeCloseTo(0.0, 1);
    expect(res.depthOfBurialM).toBeGreaterThanOrEqual(1.5);
    expect(res.burialStatus).toBe("COMPLIANT_SECURE");
    expect(res.isCableExposed).toBe(false);
    expect(res.isBurialDeficient).toBe(false);
    expect(res.confidenceScore).toBeGreaterThanOrEqual(0.8);
  });

  it("detects deficient burial depth requiring post-lay rock dumping", () => {
    // Current = 500A. At r = 2.0m, B = (200 * 500) / 2 = 50000 nT.
    // If ROV altitude = 1.2m => DOB = 2.0 - 1.2 = 0.8m (< target 1.5m)
    const scan: SubseaCableSurveyScan = {
      timestampIso: "2026-09-13T12:05:00Z",
      kpStationKm: 16.200,
      rovAltitudeSeabedM: 1.2,
      cableCurrentAmperes: 500,
      targetBurialDepthM: 1.5,
      sensors: [
        { sensorId: "S1", lateralOffsetM: -0.5, bxNanoTesla: 45000, byNanoTesla: 0, bzNanoTesla: -5000 },
        { sensorId: "S2", lateralOffsetM: 0.5, bxNanoTesla: 45000, byNanoTesla: 0, bzNanoTesla: 5000 }
      ]
    };

    const res = profiler.analyzeSurveyScan(scan);
    expect(res.depthOfBurialM).toBeLessThan(1.5);
    expect(res.burialStatus).toBe("DEFICIENT");
    expect(res.isBurialDeficient).toBe(true);
    expect(res.isCableExposed).toBe(false);
  });

  it("flags exposed cable or freespan hazard when DOB is zero or negative", () => {
    // Current = 200A. High magnetic field close to sensor: B = 40000 nT => r = (200*200)/40000 = 1.0m.
    // ROV altitude = 1.0m => DOB = 1.0 - 1.0 = 0.0m
    const scan: SubseaCableSurveyScan = {
      timestampIso: "2026-09-13T12:10:00Z",
      kpStationKm: 19.850,
      rovAltitudeSeabedM: 1.0,
      cableCurrentAmperes: 200,
      targetBurialDepthM: 1.5,
      sensors: [
        { sensorId: "S1", lateralOffsetM: -0.5, bxNanoTesla: 40000, byNanoTesla: 0, bzNanoTesla: -2000 },
        { sensorId: "S2", lateralOffsetM: 0.5, bxNanoTesla: 40000, byNanoTesla: 0, bzNanoTesla: 2000 }
      ]
    };

    const res = profiler.analyzeSurveyScan(scan);
    expect(res.depthOfBurialM).toBeLessThanOrEqual(0.05);
    expect(res.burialStatus).toBe("EXPOSED_RISK");
    expect(res.isCableExposed).toBe(true);
  });

  it("throws when less than two sensors are provided", () => {
    const invalidScan: SubseaCableSurveyScan = {
      timestampIso: "2026-09-13T12:15:00Z",
      kpStationKm: 20.0,
      rovAltitudeSeabedM: 1.0,
      cableCurrentAmperes: 100,
      targetBurialDepthM: 1.5,
      sensors: [
        { sensorId: "SINGLE", lateralOffsetM: 0, bxNanoTesla: 1000, byNanoTesla: 0, bzNanoTesla: 0 }
      ]
    };

    expect(() => profiler.analyzeSurveyScan(invalidScan)).toThrow("At least 2 transverse magnetometer");
  });
});
