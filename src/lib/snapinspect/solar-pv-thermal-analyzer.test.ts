import { describe, it, expect } from "vitest";
import {
  SolarPVThermalAnalyzer,
  PVModuleThermalReading
} from "./solar-pv-thermal-analyzer";

describe("SNAP-33: Solar PV Thermal Analyzer", () => {
  const analyzer = new SolarPVThermalAnalyzer(0.18, 5.0);

  it("classifies single cell hotspot and computes kWh degradation", () => {
    const reading: PVModuleThermalReading = {
      moduleId: "MOD_STR1_04",
      stringId: "STRING_NORTH_1",
      nominalWatts: 420,
      moduleBaselineTempC: 38.0,
      anomalyMaxTempC: 51.5, // deltaT = 13.5C => Point hotspot
      irradianceWm2: 850,
      ambientTempC: 25.0,
      areaSqMeters: 2.1,
    };

    const result = analyzer.classifyAnomaly(reading);
    expect(result.deltaTCelsius).toBe(13.5);
    expect(result.severity).toBe("CLASS_2_MEDIUM");
    expect(result.anomalyType).toBe("POINT_HOTSPOT_SHUT");
    expect(result.estimatedPowerLossWatts).toBe(63); // 15% of 420
    expect(result.annualGenerationLossKWh).toBeGreaterThan(0);
  });

  it("detects critical sub-string bypass activation with severe delta-T", () => {
    const reading: PVModuleThermalReading = {
      moduleId: "MOD_STR2_12",
      stringId: "STRING_SOUTH_2",
      nominalWatts: 400,
      moduleBaselineTempC: 35.0,
      anomalyMaxTempC: 68.0, // deltaT = 33.0C => Sub-string bypass
      irradianceWm2: 900,
      ambientTempC: 26.0,
      areaSqMeters: 2.0,
    };

    const result = analyzer.classifyAnomaly(reading);
    expect(result.deltaTCelsius).toBe(33.0);
    expect(result.severity).toBe("CLASS_3_CRITICAL");
    expect(result.anomalyType).toBe("SUB_STRING_BYPASS_ACTIVE");
    expect(result.replacementRecommended).toBe(true);
  });

  it("analyzes multi-module rooftop array and generates financial takeoff with hash", () => {
    const readings: PVModuleThermalReading[] = [
      {
        moduleId: "M1",
        stringId: "S1",
        nominalWatts: 400,
        moduleBaselineTempC: 35.0,
        anomalyMaxTempC: 36.0, // Normal
        irradianceWm2: 800,
        ambientTempC: 22.0,
        areaSqMeters: 2.0,
      },
      {
        moduleId: "M2",
        stringId: "S1",
        nominalWatts: 400,
        moduleBaselineTempC: 35.0,
        anomalyMaxTempC: 66.0, // Critical
        irradianceWm2: 800,
        ambientTempC: 22.0,
        areaSqMeters: 2.0,
      }
    ];

    const summary = analyzer.analyzeArray("INSP_ROOF_SOLAR_2026", readings);
    expect(summary.totalModulesScanned).toBe(2);
    expect(summary.anomaliesDetectedCount).toBe(1);
    expect(summary.criticalClass3Count).toBe(1);
    expect(summary.complianceHash).toContain("IEC62446-PV-");
    expect(summary.arrayOperationalHealthScore).toBe(50);
  });
});
