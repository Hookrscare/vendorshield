/**
 * SNAP-42: Facade Wind Pressure Differential Infiltration Auditor Unit Tests.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 */

import { describe, it, expect } from "vitest";
import {
  FacadeWindPressureAuditor,
  CurtainWallZoneSpec,
  DroneWindTelemetryPoint,
} from "./facade-wind-pressure-auditor";

describe("SNAP-42: FacadeWindPressureAuditor", () => {
  it("calculates velocity pressure and thermal stack effect correctly", () => {
    // 20 m/s wind speed, standard air density 1.225
    // q = 0.5 * 1.225 * 400 = 245 Pa
    const q = FacadeWindPressureAuditor.calculateVelocityPressure(20, 1.225);
    expect(q).toBe(245);

    // 100 meter high-rise, 21C inside, -5C outside
    const deltaP = FacadeWindPressureAuditor.calculateStackEffectPressure(100, 21, -5, 1.225);
    expect(deltaP).toBeGreaterThan(10);
    expect(deltaP).toBeLessThan(150);
  });

  it("evaluates compliant airtight building facade with zero water ingress", () => {
    const zones: CurtainWallZoneSpec[] = [
      {
        zoneId: "ZONE-L10-N",
        floorLevel: 10,
        facadeOrientation: "NORTH",
        surfaceAreaSqMeters: 50, // ~538 sq ft
        fenestrationPerimeterMeters: 20,
        measuredInfiltrationCfm: 15, // 15 / 538 = 0.027 cfm/sqft (< 0.06 limit)
        waterPenetrationObserved: false,
      },
      {
        zoneId: "ZONE-L10-S",
        floorLevel: 10,
        facadeOrientation: "SOUTH",
        surfaceAreaSqMeters: 50,
        fenestrationPerimeterMeters: 20,
        measuredInfiltrationCfm: 20, // 20 / 538 = 0.037 cfm/sqft
        waterPenetrationObserved: false,
      },
    ];

    const telemetry: DroneWindTelemetryPoint[] = [
      {
        telemetryId: "TEL-001",
        altitudeMeters: 35,
        floorLevel: 10,
        facadeOrientation: "NORTH",
        windSpeedMps: 8,
        windGustMps: 12,
        outdoorTempCelsius: 10,
        indoorTempCelsius: 21,
      },
    ];

    const res = FacadeWindPressureAuditor.auditFacade(zones, telemetry);
    expect(res.waterPenetrationRisk).toBe("COMPLIANT");
    expect(res.exceedancePercentage).toBe(0);
    expect(res.totalInfiltrationCfm).toBe(35);
    expect(res.auditDigest).toHaveLength(64);
  });

  it("identifies critical water breach when water penetration is detected", () => {
    const zones: CurtainWallZoneSpec[] = [
      {
        zoneId: "ZONE-L30-W",
        floorLevel: 30,
        facadeOrientation: "WEST",
        surfaceAreaSqMeters: 100,
        fenestrationPerimeterMeters: 40,
        measuredInfiltrationCfm: 150, // Significant leakage
        waterPenetrationObserved: true,
      },
    ];

    const telemetry: DroneWindTelemetryPoint[] = [
      {
        telemetryId: "TEL-002",
        altitudeMeters: 110,
        floorLevel: 30,
        facadeOrientation: "WEST",
        windSpeedMps: 22,
        windGustMps: 31,
        outdoorTempCelsius: 2,
        indoorTempCelsius: 22,
      },
    ];

    const res = FacadeWindPressureAuditor.auditFacade(zones, telemetry);
    expect(res.waterPenetrationRisk).toBe("CRITICAL_WATER_BREACH");
    expect(res.worstFloorLevel).toBe(30);
    expect(res.worstZoneId).toBe("ZONE-L30-W");
    expect(res.recommendedActions.some((a) => a.includes("gasket replacement"))).toBe(true);
  });

  it("throws error when zones or telemetry array is empty", () => {
    expect(() => FacadeWindPressureAuditor.auditFacade([], [])).toThrow();
  });
});
