/**
 * SNAP-42: High-Rise Facade Drone Wind Pressure Differential Infiltration Auditor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 * 
 * Implements ASTM E783 (Air Leakage Through Exterior Windows/Curtain Walls),
 * ASTM E1105 (Water Penetration by Static Air Pressure Difference),
 * and ASCE 7-22 Wind Load velocity pressure differential dynamics.
 * Analyzes drone UAV anemometer telemetry, envelope pressure gradients,
 * thermal stack effect differentials, and fenestration air/water infiltration vulnerabilities.
 */

import { createHash } from "crypto";

export type FacadeOrientation = "NORTH" | "SOUTH" | "EAST" | "WEST";

export interface DroneWindTelemetryPoint {
  telemetryId: string;
  altitudeMeters: number;
  floorLevel: number;
  facadeOrientation: FacadeOrientation;
  windSpeedMps: number;
  windGustMps: number;
  outdoorTempCelsius: number;
  indoorTempCelsius: number;
  airDensityKgPerM3?: number;
}

export interface CurtainWallZoneSpec {
  zoneId: string;
  floorLevel: number;
  facadeOrientation: FacadeOrientation;
  surfaceAreaSqMeters: number;
  fenestrationPerimeterMeters: number;
  measuredInfiltrationCfm: number;
  allowableInfiltrationCfmPerSqFt?: number; // Standard ASTM E283 is 0.06 cfm/sqft
  waterPenetrationObserved: boolean;
}

export type InfiltrationRiskTier = "COMPLIANT" | "MODERATE_LEAK" | "HIGH_INFILTRATION" | "CRITICAL_WATER_BREACH";

export interface FacadeWindPressureAuditReport {
  totalEnvelopeAreaSqFt: number;
  peakVelocityPressurePa: number;
  stackEffectPressurePa: number;
  totalInfiltrationCfm: number;
  averageInfiltrationRateCfmPerSqFt: number;
  exceedancePercentage: number;
  waterPenetrationRisk: InfiltrationRiskTier;
  worstFloorLevel: number;
  worstZoneId: string;
  recommendedActions: string[];
  auditDigest: string;
  timestamp: string;
}

export class FacadeWindPressureAuditor {
  private static readonly SQ_METERS_TO_SQ_FT = 10.7639;
  private static readonly DEFAULT_ALLOWABLE_CFM_PER_SQFT = 0.06; // ASTM E283 / E783 benchmark

  /**
   * Calculates dynamic velocity wind pressure in Pascals: q = 0.5 * rho * V^2 (Bernoulli).
   */
  public static calculateVelocityPressure(windSpeedMps: number, airDensity: number = 1.225): number {
    return Math.round(0.5 * airDensity * Math.pow(windSpeedMps, 2) * 100) / 100;
  }

  /**
   * Calculates thermal stack effect pressure differential: Delta P = rho * g * h * ((Ti - To) / Ti_K).
   */
  public static calculateStackEffectPressure(
    heightMeters: number,
    indoorTempC: number,
    outdoorTempC: number,
    airDensity: number = 1.225
  ): number {
    const g = 9.80665;
    const indoorK = indoorTempC + 273.15;
    const outdoorK = outdoorTempC + 273.15;
    if (indoorK <= 0) return 0;
    const deltaP = airDensity * g * heightMeters * ((indoorK - outdoorK) / indoorK);
    return Math.round(Math.abs(deltaP) * 100) / 100;
  }

  /**
   * Evaluates curtain wall zone infiltration against ASCE 7-22 and ASTM E783/E1105.
   */
  public static auditFacade(
    zones: CurtainWallZoneSpec[],
    telemetry: DroneWindTelemetryPoint[]
  ): FacadeWindPressureAuditReport {
    if (!zones || zones.length === 0) {
      throw new Error("No curtain wall zones provided for wind infiltration audit.");
    }
    if (!telemetry || telemetry.length === 0) {
      throw new Error("Drone wind telemetry required to establish facade pressure gradients.");
    }

    // Find peak wind speed across telemetry points
    let peakWindMps = 0;
    let maxAltitudeM = 0;
    let indoorTemp = 21.0;
    let outdoorTemp = 5.0;

    for (const t of telemetry) {
      if (t.windGustMps > peakWindMps) peakWindMps = t.windGustMps;
      if (t.windSpeedMps > peakWindMps) peakWindMps = t.windSpeedMps;
      if (t.altitudeMeters > maxAltitudeM) maxAltitudeM = t.altitudeMeters;
      indoorTemp = t.indoorTempCelsius;
      outdoorTemp = t.outdoorTempCelsius;
    }

    const peakVelocityPressure = this.calculateVelocityPressure(peakWindMps);
    const stackEffectPressure = this.calculateStackEffectPressure(maxAltitudeM, indoorTemp, outdoorTemp);

    let totalAreaSqFt = 0;
    let totalInfiltrationCfm = 0;
    let nonCompliantAreaSqFt = 0;
    let waterPenetrationCount = 0;

    let worstInfiltrationRate = 0;
    let worstZoneId = zones[0].zoneId;
    let worstFloor = zones[0].floorLevel;

    for (const zone of zones) {
      const areaSqFt = zone.surfaceAreaSqMeters * this.SQ_METERS_TO_SQ_FT;
      totalAreaSqFt += areaSqFt;
      totalInfiltrationCfm += zone.measuredInfiltrationCfm;

      const infiltrationRate = areaSqFt > 0 ? zone.measuredInfiltrationCfm / areaSqFt : 0;
      const allowable = zone.allowableInfiltrationCfmPerSqFt ?? this.DEFAULT_ALLOWABLE_CFM_PER_SQFT;

      if (infiltrationRate > allowable) {
        nonCompliantAreaSqFt += areaSqFt;
      }

      if (zone.waterPenetrationObserved) {
        waterPenetrationCount++;
      }

      if (infiltrationRate > worstInfiltrationRate) {
        worstInfiltrationRate = infiltrationRate;
        worstZoneId = zone.zoneId;
        worstFloor = zone.floorLevel;
      }
    }

    const avgInfiltrationRate = totalAreaSqFt > 0 ? Math.round((totalInfiltrationCfm / totalAreaSqFt) * 1000) / 1000 : 0;
    const exceedancePct = totalAreaSqFt > 0 ? Math.round((nonCompliantAreaSqFt / totalAreaSqFt) * 10000) / 100 : 0;

    let waterPenetrationRisk: InfiltrationRiskTier = "COMPLIANT";
    const recommendedActions: string[] = [];

    if (waterPenetrationCount > 0 || exceedancePct >= 40) {
      waterPenetrationRisk = "CRITICAL_WATER_BREACH";
      recommendedActions.push("Immediate curtain wall gasket replacement required on high-windward elevations.");
      recommendedActions.push("Conduct ASTM E1105 chamber water spray test on fenestration perimeter joints.");
      recommendedActions.push(`Deploy mastic sealant injection along worst zone ${worstZoneId} (Floor ${worstFloor}).`);
    } else if (exceedancePct >= 20 || peakVelocityPressure > 350) {
      waterPenetrationRisk = "HIGH_INFILTRATION";
      recommendedActions.push("Perform thermographic smoke pencil tracer analysis at operable window sashes.");
      recommendedActions.push("Re-torque curtain wall pressure plates to ASCE 7-22 specified clamp pressure.");
    } else if (exceedancePct > 0) {
      waterPenetrationRisk = "MODERATE_LEAK";
      recommendedActions.push("Schedule localized weatherstrip re-sealing during next scheduled maintenance cycle.");
    } else {
      waterPenetrationRisk = "COMPLIANT";
      recommendedActions.push("Building envelope airtightness complies with ASTM E783 / ASHRAE 90.1 standards.");
    }

    const digestPayload = `${totalAreaSqFt}|${peakVelocityPressure}|${totalInfiltrationCfm}|${waterPenetrationRisk}|${worstZoneId}`;
    const auditDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      totalEnvelopeAreaSqFt: Math.round(totalAreaSqFt * 100) / 100,
      peakVelocityPressurePa: peakVelocityPressure,
      stackEffectPressurePa: stackEffectPressure,
      totalInfiltrationCfm: Math.round(totalInfiltrationCfm * 100) / 100,
      averageInfiltrationRateCfmPerSqFt: avgInfiltrationRate,
      exceedancePercentage: exceedancePct,
      waterPenetrationRisk,
      worstFloorLevel: worstFloor,
      worstZoneId,
      recommendedActions,
      auditDigest,
      timestamp: new Date().toISOString()
    };
  }
}
