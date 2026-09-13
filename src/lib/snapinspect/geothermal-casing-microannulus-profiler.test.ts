/**
 * Unit Test Suite for SNAP-65: Geothermal Well Casing High-Temperature Cement Sheath Micro-Annulus Ultrasonic Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  GeothermalCasingMicroAnnulusProfiler,
  type GeothermalWellInspectionRequest
} from "./geothermal-casing-microannulus-profiler";

describe("SNAP-65: Geothermal Well Cement Sheath Micro-Annulus Profiler", () => {
  it("certifies intact cement sheath with excellent hydraulic isolation", () => {
    const req: GeothermalWellInspectionRequest = {
      wellId: "GEO-WELL-SALTON-09",
      depthMeters: 2450.0,
      boreholeTemperatureCelsius: 280.0,
      nominalSteelImpedanceMRayls: 45.0,
      sectorLogs: [
        { sectorAngleDegrees: 0, acousticImpedanceMRayls: 4.2, casingResonanceAmplitudeDb: 10.0 },
        { sectorAngleDegrees: 90, acousticImpedanceMRayls: 3.9, casingResonanceAmplitudeDb: 11.5 },
        { sectorAngleDegrees: 180, acousticImpedanceMRayls: 4.1, casingResonanceAmplitudeDb: 9.8 },
        { sectorAngleDegrees: 270, acousticImpedanceMRayls: 4.0, casingResonanceAmplitudeDb: 10.2 }
      ]
    };

    const res = GeothermalCasingMicroAnnulusProfiler.evaluateCementSheath(req);

    expect(res.isolationStatus).toBe("EXCELLENT_HYDRAULIC_ISOLATION");
    expect(res.bondedCoverageFraction).toBe(1.0);
    expect(res.microAnnulusDetected).toBe(false);
    expect(res.profilerDigest).toHaveLength(64);
  });

  it("detects micro-annulus gas/steam channel risk", () => {
    const req: GeothermalWellInspectionRequest = {
      wellId: "GEO-WELL-HELLISHEIDI-04",
      depthMeters: 1800.0,
      boreholeTemperatureCelsius: 260.0,
      nominalSteelImpedanceMRayls: 45.0,
      sectorLogs: [
        { sectorAngleDegrees: 0, acousticImpedanceMRayls: 3.8, casingResonanceAmplitudeDb: 12.0 },
        { sectorAngleDegrees: 90, acousticImpedanceMRayls: 0.8, casingResonanceAmplitudeDb: 34.0 }, // gas channel
        { sectorAngleDegrees: 180, acousticImpedanceMRayls: 3.5, casingResonanceAmplitudeDb: 14.0 },
        { sectorAngleDegrees: 270, acousticImpedanceMRayls: 3.6, casingResonanceAmplitudeDb: 13.0 }
      ]
    };

    const res = GeothermalCasingMicroAnnulusProfiler.evaluateCementSheath(req);

    expect(res.isolationStatus).toBe("MICRO_ANNULUS_GAS_CHANNEL_RISK");
    expect(res.microAnnulusDetected).toBe(true);
    expect(res.bondedCoverageFraction).toBe(0.75);
  });

  it("throws error for unrealistic borehole temperature", () => {
    expect(() => {
      GeothermalCasingMicroAnnulusProfiler.evaluateCementSheath({
        wellId: "GEO-ERR",
        depthMeters: 100,
        boreholeTemperatureCelsius: 600, // exceeds physical bounds
        nominalSteelImpedanceMRayls: 45.0,
        sectorLogs: [{ sectorAngleDegrees: 0, acousticImpedanceMRayls: 3.0, casingResonanceAmplitudeDb: 10 }]
      });
    }).toThrow("valid physical range");
  });
});
