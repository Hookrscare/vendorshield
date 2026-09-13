/**
 * Unit Test Suite for SNAP-56: Subsurface Cavity Karst Ground Sinkhole Early Warning Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Geotechnical Platform.
 */

import { describe, it, expect } from "vitest";
import {
  KarstSinkholeEarlyWarningTomographer,
  GeophysicalProbePoint,
  SoilOverburdenProperties
} from "./karst-sinkhole-early-warning-tomographer";

describe("SNAP-56: Subsurface Cavity Karst Ground Sinkhole Early Warning Tomographer", () => {
  const standardOverburden: SoilOverburdenProperties = {
    soilCohesionKPa: 20.0,
    soilFrictionAngleDeg: 28.0,
    soilUnitWeightKNm3: 18.0,
    surfaceSurchargeLoadKPa: 15.0
  };

  it("detects shallow imminent collapse karst cavity with emergency evacuation radius", () => {
    // Air void very close to surface (depth 1.0m to 3.5m)
    const probes: GeophysicalProbePoint[] = [
      { x: 10, y: 10, depthZ: 1.0, relativePermittivity: 1.2, apparentResistivityOhmM: 4500, microgravityAnomalyUGal: -45 },
      { x: 14, y: 10, depthZ: 2.2, relativePermittivity: 1.1, apparentResistivityOhmM: 5200, microgravityAnomalyUGal: -50 },
      { x: 10, y: 14, depthZ: 2.5, relativePermittivity: 1.3, apparentResistivityOhmM: 4100, microgravityAnomalyUGal: -42 },
      { x: 14, y: 14, depthZ: 3.5, relativePermittivity: 1.2, apparentResistivityOhmM: 4800, microgravityAnomalyUGal: -48 }
    ];

    const result = KarstSinkholeEarlyWarningTomographer.evaluateKarstCavity(
      "cavity-critical-01",
      probes,
      standardOverburden
    );

    expect(result.sinkholeCollapseRiskTier).toBe("IMMINENT_COLLAPSE_CRITICAL");
    expect(result.voidCrownDepthMeters).toBeLessThanOrEqual(1.5);
    expect(result.evacuationZoneRadiusMeters).toBeGreaterThan(15.0);
    expect(result.recommendedGroutingVolumeM3).toBeGreaterThan(0);
    expect(result.auditHash).toBeDefined();
  });

  it("evaluates deep stable limestone dissolution cave with high arching safety factor", () => {
    // Deep cave at 20m depth with thick rock overburden
    const probes: GeophysicalProbePoint[] = [
      { x: 20, y: 20, depthZ: 18.0, relativePermittivity: 1.5, apparentResistivityOhmM: 3500, microgravityAnomalyUGal: -22 },
      { x: 22, y: 20, depthZ: 21.0, relativePermittivity: 1.4, apparentResistivityOhmM: 3800, microgravityAnomalyUGal: -25 },
      { x: 20, y: 22, depthZ: 20.5, relativePermittivity: 1.6, apparentResistivityOhmM: 3200, microgravityAnomalyUGal: -20 },
      { x: 22, y: 22, depthZ: 23.0, relativePermittivity: 1.5, apparentResistivityOhmM: 3600, microgravityAnomalyUGal: -24 }
    ];

    const deepRockOverburden: SoilOverburdenProperties = {
      soilCohesionKPa: 120.0, // strong rock/hardpan
      soilFrictionAngleDeg: 38.0,
      soilUnitWeightKNm3: 22.0,
      surfaceSurchargeLoadKPa: 0.0
    };

    const result = KarstSinkholeEarlyWarningTomographer.evaluateKarstCavity(
      "cavity-deep-02",
      probes,
      deepRockOverburden
    );

    expect(result.sinkholeCollapseRiskTier).toBe("STABLE_SECURE");
    expect(result.crownArchingSafetyFactor).toBeGreaterThan(2.0);
    expect(result.evacuationZoneRadiusMeters).toBe(0);
  });

  it("throws error when probe point array is empty", () => {
    expect(() => {
      KarstSinkholeEarlyWarningTomographer.evaluateKarstCavity("invalid", [], standardOverburden);
    }).toThrow("Geophysical probe data cannot be empty.");
  });
});
