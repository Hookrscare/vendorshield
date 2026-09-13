import { describe, it, expect } from "vitest";
import {
  SolarPvThermalTomographer,
  PvInverterTelemetry,
} from "./solar-pv-thermal-tomographer";

describe("SNAP-60: Solar PV Inverter Thermal Tomographer", () => {
  const tomographer = new SolarPvThermalTomographer();

  it("should detect nominal healthy operating array with optimal status", () => {
    const telemetry: PvInverterTelemetry = {
      inverterId: "INV-ROOF-01",
      nominalAcPowerKw: 50,
      measuredDcVoltageV: 680,
      measuredDcCurrentA: 72,
      ambientTempC: 25,
      irradianceWPerM2: 850,
      heatsinkTempC: 62,
      maxRatedHeatsinkTempC: 75,
      moduleThermalGrid: [
        { xCoord: 1, yCoord: 1, measuredTempC: 45 },
        { xCoord: 1, yCoord: 2, measuredTempC: 46 },
        { xCoord: 2, yCoord: 1, measuredTempC: 45.5 },
        { xCoord: 2, yCoord: 2, measuredTempC: 44.8 },
      ],
    };

    const report = tomographer.analyzeInverterAndArray(telemetry);
    expect(report.irradianceValid).toBe(true);
    expect(report.overallHealthStatus).toBe("OPTIMAL");
    expect(report.anomalies).toHaveLength(0);
    expect(report.inverterThermalDeratingPct).toBe(0);
  });

  it("should flag Class 3 critical hotspot when cell delta-T exceeds 20°C", () => {
    const telemetry: PvInverterTelemetry = {
      inverterId: "INV-ROOF-02",
      nominalAcPowerKw: 100,
      measuredDcVoltageV: 700,
      measuredDcCurrentA: 140,
      ambientTempC: 30,
      irradianceWPerM2: 920,
      heatsinkTempC: 70,
      maxRatedHeatsinkTempC: 80,
      moduleThermalGrid: [
        { xCoord: 1, yCoord: 1, measuredTempC: 48 },
        { xCoord: 1, yCoord: 2, measuredTempC: 49 },
        { xCoord: 2, yCoord: 1, measuredTempC: 73 }, // +24°C Delta-T!
        { xCoord: 2, yCoord: 2, measuredTempC: 49 },
      ],
    };

    const report = tomographer.analyzeInverterAndArray(telemetry);
    expect(report.overallHealthStatus).toBe("ACTION_REQUIRED");
    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0].iecClass).toBe("CLASS_3_CRITICAL");
    expect(report.anomalies[0].severity).toBe("CRITICAL");
    expect(report.totalEstimatedYieldLossKwhPerYear).toBeGreaterThan(0);
  });

  it("should calculate inverter derating and trigger alert when heatsink exceeds maximum rating", () => {
    const telemetry: PvInverterTelemetry = {
      inverterId: "INV-ROOF-03",
      nominalAcPowerKw: 60,
      measuredDcVoltageV: 650,
      measuredDcCurrentA: 90,
      ambientTempC: 38,
      irradianceWPerM2: 800,
      heatsinkTempC: 88, // 13°C over rated 75°C
      maxRatedHeatsinkTempC: 75,
      moduleThermalGrid: [
        { xCoord: 1, yCoord: 1, measuredTempC: 50 },
        { xCoord: 1, yCoord: 2, measuredTempC: 51 },
      ],
    };

    const report = tomographer.analyzeInverterAndArray(telemetry);
    expect(report.inverterThermalDeratingPct).toBe(65); // 13 * 5%
    expect(report.overallHealthStatus).toBe("SHUTDOWN_RECOMMENDED");
    expect(report.anomalies.some((a) => a.anomalyType === "INVERTER_IGBT_OVERHEAT")).toBe(true);
  });

  it("should flag insufficient irradiance warning if under 600 W/m² per IEC 62446-3", () => {
    const telemetry: PvInverterTelemetry = {
      inverterId: "INV-ROOF-04",
      nominalAcPowerKw: 25,
      measuredDcVoltageV: 600,
      measuredDcCurrentA: 30,
      ambientTempC: 18,
      irradianceWPerM2: 450, // Low irradiance overcast
      heatsinkTempC: 40,
      maxRatedHeatsinkTempC: 75,
      moduleThermalGrid: [{ xCoord: 1, yCoord: 1, measuredTempC: 30 }],
    };

    const report = tomographer.analyzeInverterAndArray(telemetry);
    expect(report.irradianceValid).toBe(false);
  });
});
