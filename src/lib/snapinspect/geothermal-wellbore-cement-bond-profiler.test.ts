import { describe, it, expect } from "vitest";
import {
  GeothermalWellboreCementBondProfiler,
  WellboreCasingTelemetry
} from "./geothermal-wellbore-cement-bond-profiler";

describe("SNAP-89: Geothermal Deep Wellbore Casing Acoustic Caliper & Cement Bond Integrity Profiler", () => {
  it("verifies solid acoustic bond and hydraulic isolation in deep geothermal well", () => {
    const telemetry: WellboreCasingTelemetry = {
      wellboreId: "GEO-WELL-ICELAND-4A",
      measuredDepthMeters: 3100.0,
      bottomHoleTemperatureCelsius: 240.0,
      casingNominalThicknessMm: 12.0,
      measuredUltrasonicThicknessMm: 11.8,
      cblAttenuationDbPerMeter: 31.5,
      measuredAnnularImpedanceMrayl: 5.4,
      radialCoverageSectors: 16
    };

    const result = GeothermalWellboreCementBondProfiler.assessCementBondIntegrity(telemetry);

    expect(result.wellboreId).toBe("GEO-WELL-ICELAND-4A");
    expect(result.casingWallLossPercent).toBeLessThan(5.0);
    expect(result.casingOvalityStatus).toBe("NOMINAL");
    expect(result.cementBondIndex).toBeGreaterThanOrEqual(0.8);
    expect(result.hydraulicIsolationIntegrity).toBe("SOLID_CEMENT_ISOLATED");
    expect(result.remedialSqueezeCementRequired).toBe(false);
    expect(result.wellboreSafetyCertificate).toHaveLength(64);
  });

  it("detects steam/gas channeling and triggers remedial squeeze cementing", () => {
    const telemetry: WellboreCasingTelemetry = {
      wellboreId: "GEO-WELL-NEVADA-09",
      measuredDepthMeters: 2850.0,
      bottomHoleTemperatureCelsius: 215.0,
      casingNominalThicknessMm: 14.0,
      measuredUltrasonicThicknessMm: 13.5,
      cblAttenuationDbPerMeter: 8.5,   // Poor attenuation indicates fluid/gas channel behind pipe
      measuredAnnularImpedanceMrayl: 1.4, // Low impedance = drilling mud/water/steam
      radialCoverageSectors: 8
    };

    const result = GeothermalWellboreCementBondProfiler.assessCementBondIntegrity(telemetry);

    expect(result.hydraulicIsolationIntegrity).toBe("STEAM_GAS_CHANNELING_BREACH");
    expect(result.remedialSqueezeCementRequired).toBe(true);
  });

  it("triggers critical collapse risk and remedial squeeze on severe casing thinning", () => {
    const telemetry: WellboreCasingTelemetry = {
      wellboreId: "GEO-WELL-SALTON-SEA-02",
      measuredDepthMeters: 2400.0,
      bottomHoleTemperatureCelsius: 280.0,
      casingNominalThicknessMm: 15.0,
      measuredUltrasonicThicknessMm: 9.0, // >30% metal loss from corrosive brine
      cblAttenuationDbPerMeter: 30.0,
      measuredAnnularImpedanceMrayl: 4.5,
      radialCoverageSectors: 16
    };

    const result = GeothermalWellboreCementBondProfiler.assessCementBondIntegrity(telemetry);

    expect(result.casingOvalityStatus).toBe("CRITICAL_BURST_COLLAPSE_RISK");
    expect(result.remedialSqueezeCementRequired).toBe(true);
  });
});
