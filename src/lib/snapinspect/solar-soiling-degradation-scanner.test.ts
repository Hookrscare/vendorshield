/**
 * Unit tests for SNAP-39: Drone LiDAR Rooftop Solar Panel Degradation & Soiling Scanner.
 */

import { describe, it, expect } from "vitest";
import {
  SolarSoilingDegradationScanner,
  SolarPanelTelemetry
} from "./solar-soiling-degradation-scanner";

describe("SNAP-39: SolarSoilingDegradationScanner", () => {
  const scanner = new SolarSoilingDegradationScanner(0.20, 10.0, 160);

  it("verifies clean nominal solar panel requires no action", () => {
    const cleanPanel: SolarPanelTelemetry = {
      stringId: "STR_01",
      panelId: "PV_01_01",
      ratedCapacityKw: 0.40, // 400W commercial panel
      lidarReflectanceRatio: 0.94,
      hotspotDeltaTCelsius: 2.1,
      actualYieldRatio: 0.98
    };

    const res = scanner.scanPanel(cleanPanel);
    expect(res.defectType).toBe("NORMAL_OPERATION");
    expect(res.urgency).toBe("NO_ACTION");
    expect(res.soilingLossPercentage).toBe(2.0);
  });

  it("identifies heavy soiling and calculates rapid wash ROI payback", () => {
    const soiledPanel: SolarPanelTelemetry = {
      stringId: "STR_01",
      panelId: "PV_01_02",
      ratedCapacityKw: 0.40,
      lidarReflectanceRatio: 0.62, // Heavily dusted
      hotspotDeltaTCelsius: 4.5,
      actualYieldRatio: 0.78 // 22% yield loss
    };

    const res = scanner.scanPanel(soiledPanel);
    expect(res.defectType).toBe("HEAVY_SOILING");
    expect(res.urgency).toBe("SCHEDULE_CYCLE");
    expect(res.soilingLossPercentage).toBe(22.0);
    expect(res.monthlyLostRevenueUsd).toBeGreaterThan(0);
    expect(res.washPaybackDays).toBeLessThan(120);
  });

  it("flags severe thermal hotspot shading for immediate maintenance dispatch", () => {
    const hotspotPanel: SolarPanelTelemetry = {
      stringId: "STR_02",
      panelId: "PV_02_05",
      ratedCapacityKw: 0.40,
      lidarReflectanceRatio: 0.85,
      hotspotDeltaTCelsius: 24.5, // Critical localized thermal spike
      actualYieldRatio: 0.65
    };

    const res = scanner.scanPanel(hotspotPanel);
    expect(res.defectType).toBe("HOTSPOT_SHADING");
    expect(res.urgency).toBe("IMMEDIATE_DISPATCH");
  });

  it("evaluates complete rooftop array inspection with SHA-256 certificate", () => {
    const panels: SolarPanelTelemetry[] = [
      {
        stringId: "S1",
        panelId: "P1",
        ratedCapacityKw: 0.40,
        lidarReflectanceRatio: 0.95,
        hotspotDeltaTCelsius: 1.0,
        actualYieldRatio: 0.99
      },
      {
        stringId: "S1",
        panelId: "P2",
        ratedCapacityKw: 0.40,
        lidarReflectanceRatio: 0.60,
        hotspotDeltaTCelsius: 3.0,
        actualYieldRatio: 0.75
      }
    ];

    const summary = scanner.evaluateArray(panels);
    expect(summary.totalPanelsAudited).toBe(2);
    expect(summary.compromisedPanelsCount).toBe(1);
    expect(summary.cleaningRecommended).toBe(true);
    expect(summary.auditSha256).toHaveLength(64);
  });
});
