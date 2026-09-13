/**
 * src/lib/snapinspect/subsea-hvdc-cable-trench-magnetometer-profiler.test.ts
 * Unit tests for SNAP-63: Subsea High-Voltage Direct Current (HVDC) Cable Trench Depth-of-Burial Magnetometer Profiler.
 */

import { describe, it, expect } from "vitest";
import {
  SubseaHvdcCableTrenchMagnetometerProfiler,
  MagnetometerReading
} from "./subsea-hvdc-cable-trench-magnetometer-profiler";

describe("SNAP-63: Subsea HVDC Cable Trench Depth-of-Burial Magnetometer Profiler", () => {
  const profiler = new SubseaHvdcCableTrenchMagnetometerProfiler(1.5); // Target 1.5m minimum DOB

  it("accurately inverts sensor distance from Biot-Savart magnetic anomaly", () => {
    // For I = 1000 A, at r = 2.0 m:
    // B = (4*pi*1e-7 * 1000) / (2*pi * 2.0) = 1e-4 T = 100,000 nT
    const cableCurrentAmperes = 1000.0;
    const expectedDist = 2.0;
    const anomalyNanoTesla = (4 * Math.PI * 1e-7 * cableCurrentAmperes) / (2 * Math.PI * expectedDist) * 1e9; // 100,000 nT

    const invertedDist = profiler.invertCableDistance(anomalyNanoTesla, cableCurrentAmperes);
    expect(invertedDist).toBeCloseTo(expectedDist, 2);

    // Calculated DOB when ROV flies at 0.5m above seabed:
    // DOB = 2.0 - 0.5 = 1.5m
    const dob = profiler.calculateDepthOfBurial(invertedDist, 0.5);
    expect(dob).toBeCloseTo(1.5, 2);
  });

  it("detects safe burial meeting maritime clearance criteria", () => {
    // Current = 800A, ROV altitude = 1.0m, Cable at DOB = 2.0m -> sensor dist = 3.0m
    const cableCurrent = 800.0;
    const sensorDist = 3.0;
    const anomaly = (4 * Math.PI * 1e-7 * cableCurrent) / (2 * Math.PI * sensorDist) * 1e9;
    const backgroundField = 48000.0;

    const readings: MagnetometerReading[] = [
      {
        sensorId: "MAG-ROV-01",
        chainageMeters: 100.0,
        lateralOffsetMeters: 0.0,
        altitudeAboveSeabedMeters: 1.0,
        totalMagneticIntensityNanoTesla: backgroundField + anomaly,
        backgroundEarthFieldNanoTesla: backgroundField
      },
      {
        sensorId: "MAG-ROV-01",
        chainageMeters: 110.0,
        lateralOffsetMeters: 0.0,
        altitudeAboveSeabedMeters: 1.0,
        totalMagneticIntensityNanoTesla: backgroundField + anomaly,
        backgroundEarthFieldNanoTesla: backgroundField
      }
    ];

    const result = profiler.analyzeSurveyTrack("SURVEY-NORTH-SEA-01", readings, cableCurrent);
    expect(result.surveyPassStatus).toBe("PASS");
    expect(result.compliancePercentage).toBe(100.0);
    expect(result.meanDepthOfBurialMeters).toBeCloseTo(2.0, 1);
    expect(result.profilePoints[0].exposureStatus).toBe("SAFE_BURIAL");
    expect(result.profilePoints[0].marineRiskLevel).toBe("LOW");
  });

  it("identifies exposed seabed sections and critical free-span suspension hazards", () => {
    const cableCurrent = 1000.0;
    const backgroundField = 50000.0;

    // Point 1: Safe burial (DOB = 1.8m, ROV alt = 1.0m, total dist = 2.8m)
    const anomaly1 = (4 * Math.PI * 1e-7 * cableCurrent) / (2 * Math.PI * 2.8) * 1e9;
    // Point 2: Exposed on seabed (DOB = 0.0m, ROV alt = 1.0m, total dist = 1.0m)
    const anomaly2 = (4 * Math.PI * 1e-7 * cableCurrent) / (2 * Math.PI * 1.0) * 1e9;
    // Point 3: Free span (DOB = -0.4m, suspended above seabed, ROV alt = 1.0m, total dist = 0.6m)
    const anomaly3 = (4 * Math.PI * 1e-7 * cableCurrent) / (2 * Math.PI * 0.6) * 1e9;

    const readings: MagnetometerReading[] = [
      {
        sensorId: "ROV-MAG",
        chainageMeters: 500.0,
        lateralOffsetMeters: 0.0,
        altitudeAboveSeabedMeters: 1.0,
        totalMagneticIntensityNanoTesla: backgroundField + anomaly1,
        backgroundEarthFieldNanoTesla: backgroundField
      },
      {
        sensorId: "ROV-MAG",
        chainageMeters: 510.0,
        lateralOffsetMeters: 0.0,
        altitudeAboveSeabedMeters: 1.0,
        totalMagneticIntensityNanoTesla: backgroundField + anomaly2,
        backgroundEarthFieldNanoTesla: backgroundField
      },
      {
        sensorId: "ROV-MAG",
        chainageMeters: 520.0,
        lateralOffsetMeters: 0.0,
        altitudeAboveSeabedMeters: 1.0,
        totalMagneticIntensityNanoTesla: backgroundField + anomaly3,
        backgroundEarthFieldNanoTesla: backgroundField
      }
    ];

    const result = profiler.analyzeSurveyTrack("SURVEY-BALTIC-02", readings, cableCurrent);
    expect(result.surveyPassStatus).toBe("FAIL_REQUIRES_REMEDIATION");
    expect(result.criticalAlertCount).toBeGreaterThanOrEqual(1);

    const pFreeSpan = result.profilePoints.find(p => p.chainageMeters === 520.0);
    expect(pFreeSpan).toBeDefined();
    expect(pFreeSpan?.exposureStatus).toBe("FREE_SPAN_HAZARD");
    expect(pFreeSpan?.marineRiskLevel).toBe("CRITICAL");
    expect(pFreeSpan?.recommendedMitigation).toContain("rock-placement or grout mattress");

    const pExposed = result.profilePoints.find(p => p.chainageMeters === 510.0);
    expect(pExposed).toBeDefined();
    expect(pExposed?.exposureStatus).toBe("EXPOSED_SEABED");
  });
});
