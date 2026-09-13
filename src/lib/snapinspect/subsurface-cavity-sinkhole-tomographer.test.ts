/**
 * Unit Test Suite for SNAP-56: Subsurface Cavity Karst Ground Sinkhole Early Warning Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  SubsurfaceCavitySinkholeTomographer,
  type KarstSurveyRequest
} from "./subsurface-cavity-sinkhole-tomographer";

describe("SNAP-56: Subsurface Cavity Karst Tomographer", () => {
  it("detects critical imminent sinkhole collapse from shallow air cavity", () => {
    const request: KarstSurveyRequest = {
      siteId: "SITE-HIGHWAY-I80-KARST",
      baselineResistivityOhmM: 400.0,
      scanPoints: [
        { stationMeters: 0, depthMeters: 1.5, apparentResistivityOhmM: 420 },
        { stationMeters: 10, depthMeters: 2.0, apparentResistivityOhmM: 2800 }, // Massive air void at 2m
        { stationMeters: 15, depthMeters: 2.5, apparentResistivityOhmM: 3100 }, // Continuous void
        { stationMeters: 20, depthMeters: 2.2, apparentResistivityOhmM: 2600 },
        { stationMeters: 30, depthMeters: 5.0, apparentResistivityOhmM: 450 }
      ]
    };

    const res = SubsurfaceCavitySinkholeTomographer.analyzeSurvey(request);

    expect(res.hazardLevel).toBe("CRITICAL_IMMINENT_COLLAPSE");
    expect(res.anomalousVoidCount).toBe(3);
    expect(res.shallowestVoidDepthMeters).toBe(2.0);
    expect(res.overburdenCrownCollapseRisk).toBeGreaterThanOrEqual(65);
    expect(res.geophysicalRiskHash).toHaveLength(64);
  });

  it("verifies stable homogeneous bedrock when all readings match baseline", () => {
    const request: KarstSurveyRequest = {
      siteId: "SITE-RUNWAY-SOLID-DOLOMITE",
      baselineResistivityOhmM: 500.0,
      scanPoints: [
        { stationMeters: 0, depthMeters: 5.0, apparentResistivityOhmM: 490 },
        { stationMeters: 10, depthMeters: 8.0, apparentResistivityOhmM: 520 },
        { stationMeters: 20, depthMeters: 12.0, apparentResistivityOhmM: 510 },
        { stationMeters: 30, depthMeters: 15.0, apparentResistivityOhmM: 480 },
        { stationMeters: 40, depthMeters: 20.0, apparentResistivityOhmM: 530 }
      ]
    };

    const res = SubsurfaceCavitySinkholeTomographer.analyzeSurvey(request);

    expect(res.hazardLevel).toBe("HOMOGENEOUS_BEDROCK");
    expect(res.anomalousVoidCount).toBe(0);
    expect(res.overburdenCrownCollapseRisk).toBe(0);
  });

  it("rejects surveys with insufficient scan points", () => {
    expect(() => {
      SubsurfaceCavitySinkholeTomographer.analyzeSurvey({
        siteId: "FAIL",
        baselineResistivityOhmM: 300,
        scanPoints: [{ stationMeters: 0, depthMeters: 1, apparentResistivityOhmM: 300 }]
      });
    }).toThrow("requires at least 5 resistivity scan points.");
  });
});
