/**
 * src/lib/snapinspect/roof-ponding-load-analyzer.test.ts
 * Unit tests for SNAP-43: Commercial Flat Roof Ponding Water Load & Structural Deflection Risk Analyzer.
 */

import { describe, it, expect } from "vitest";
import { RoofPondingLoadAnalyzer, ElevationPoint, RoofDrainagePoint } from "./roof-ponding-load-analyzer";

describe("SNAP-43: Commercial Flat Roof Ponding Water Load & Structural Deflection Risk Analyzer", () => {
  const analyzer = new RoofPondingLoadAnalyzer();

  it("detects safe drainage on properly sloped roof with functioning scuppers", () => {
    // 1/4" per ft slope downwards towards drain at elevation 0.0m
    const mesh: ElevationPoint[] = [
      { x: 0, y: 0, elevationM: 0.10 },
      { x: 1, y: 0, elevationM: 0.08 },
      { x: 2, y: 0, elevationM: 0.05 },
      { x: 3, y: 0, elevationM: 0.02 }
    ];
    const drains: RoofDrainagePoint[] = [
      { id: "drain-1", x: 4, y: 0, elevationM: 0.0, drainType: "PRIMARY_DRAIN", diameterMm: 100, isClogged: false }
    ];

    const result = analyzer.analyzePondingRisk("roof-safe-01", mesh, drains, 20.0);

    expect(result.overallRiskLevel).toBe("SAFE");
    expect(result.totalPondingVolumeLiters).toBe(0);
    expect(result.zones.length).toBe(0);
    expect(result.evidenceToken).toHaveLength(64);
  });

  it("identifies structural overload when clogged drains cause severe standing ponding depth", () => {
    // Depressed basin at elevation -0.15m (-150mm) while drain is at 0.0m and clogged
    const mesh: ElevationPoint[] = [
      { x: 0, y: 0, elevationM: -0.15 },
      { x: 1, y: 0, elevationM: -0.12 },
      { x: 2, y: 0, elevationM: -0.10 }
    ];
    const drains: RoofDrainagePoint[] = [
      { id: "drain-clogged-1", x: 3, y: 0, elevationM: 0.0, drainType: "PRIMARY_DRAIN", diameterMm: 100, isClogged: true }
    ];

    // Design live load 20 PSF
    const result = analyzer.analyzePondingRisk("roof-clogged-critical", mesh, drains, 20.0);

    expect(result.cloggedDrainsCount).toBe(1);
    expect(result.zones.length).toBe(1);
    // Depth: up to 100mm + 150mm = 250mm water -> 250 kg/m^2 * 0.2048 ~= 51 PSF > 20 PSF
    expect(result.zones[0].exceedsDesignLiveLoad).toBe(true);
    expect(result.overallRiskLevel).toBe("IMMINENT_PONDING_INSTABILITY");
    expect(result.inspectionRecommendation).toContain("CRITICAL HAZARD");
  });

  it("handles empty elevation matrices gracefully", () => {
    const result = analyzer.analyzePondingRisk("roof-empty", [], []);
    expect(result.overallRiskLevel).toBe("SAFE");
    expect(result.zones).toHaveLength(0);
  });
});
