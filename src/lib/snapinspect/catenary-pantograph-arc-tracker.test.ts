/**
 * Unit Test Suite for SNAP-79: Automated High-Speed Catenary Pantograph Contact Force & Arc Erosion Tracker.
 * Complies with EN 50367 / EN 50318 rail standards.
 */

import { describe, it, expect } from "vitest";
import {
  CatenaryPantographArcTracker,
  PantographTelemetryFrame
} from "./catenary-pantograph-arc-tracker";

describe("SNAP-79: High-Speed Catenary Pantograph Contact Force & Arc Erosion Tracker", () => {
  const tracker = new CatenaryPantographArcTracker(120.0, 250.0, 20.0);

  it("handles empty telemetry data gracefully", () => {
    const result = tracker.evaluateInteraction([]);
    expect(result.interactionStatus).toBe("OPTIMAL");
    expect(result.activeAlerts).toContain("NO_TELEMETRY_DATA");
  });

  it("validates optimal pantograph-catenary interaction under nominal cruising", () => {
    // 100 frames at 300 km/h with stable contact force ~120N +/- 10N
    const frames: PantographTelemetryFrame[] = [];
    for (let i = 0; i < 100; i++) {
      frames.push({
        timestampMs: 1000 + i * 10,
        trainSpeedKmh: 300,
        contactForceN: 120 + 8 * Math.sin(i * 0.5),
        contactLossDetected: false,
        arcOpticalIntensityLumens: 50,
        tractionCurrentA: 500
      });
    }

    const res = tracker.evaluateInteraction(frames);

    expect(res.interactionStatus).toBe("OPTIMAL");
    expect(res.meanContactForceN).toBeCloseTo(120, 0);
    expect(res.arcingPercentageNQ).toBe(0.0);
    expect(res.cumulativeArcEnergyJoules).toBe(0.0);
    expect(res.estimatedStripWearMm).toBe(0.0);
    expect(res.targetBellowsPressureBar).toBeCloseTo(3.5, 1);
    expect(res.activeAlerts.length).toBe(0);
  });

  it("detects severe contact separation, arcing, and triggers dewirement risk alert", () => {
    // 50 frames with intermittent contact loss and high optical arc intensity
    const frames: PantographTelemetryFrame[] = [];
    for (let i = 0; i < 50; i++) {
      const isLoss = i % 5 === 0;
      frames.push({
        timestampMs: 5000 + i * 20,
        trainSpeedKmh: 350,
        contactForceN: isLoss ? 5.0 : 130.0,
        contactLossDetected: isLoss,
        arcOpticalIntensityLumens: isLoss ? 3500 : 80,
        arcVoltageDropV: 28.0,
        tractionCurrentA: 600
      });
    }

    const res = tracker.evaluateInteraction(frames);

    expect(res.interactionStatus).toBe("DEWIRED_RISK");
    expect(res.arcingPercentageNQ).toBe(20.0); // 10 out of 50 = 20%
    expect(res.cumulativeArcEnergyJoules).toBeGreaterThan(0);
    expect(res.estimatedStripWearMm).toBeGreaterThan(0);
    expect(res.minStatisticalForceN).toBeLessThan(20.0);
    expect(res.activeAlerts.some(a => a.includes("Contact separation detected"))).toBe(true);
  });
});
