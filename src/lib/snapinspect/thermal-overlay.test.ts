// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  celsiusToFahrenheit,
  calculateThermalDelta,
  generateThermalHudBadges,
  ThermalMeasurement,
} from "./thermal-overlay";

describe("snapinspect thermal-overlay (SNAP-06 Infrared Thermal FLIR Overlay Exporter)", () => {
  it("converts Celsius to Fahrenheit accurately", () => {
    expect(celsiusToFahrenheit(0)).toBe(32.0);
    expect(celsiusToFahrenheit(100)).toBe(212.0);
    expect(celsiusToFahrenheit(25.0)).toBe(77.0);
  });

  it("classifies normal, elevated, and critical thermal gradients", () => {
    // 1. Normal (Delta 2.5°C)
    const normalMeasurement: ThermalMeasurement = {
      spotTempC: 22.5,
      ambientReflectedC: 20.0,
      emissivity: 0.95,
      hotSpotCoords: { x: 0.5, y: 0.5 },
    };
    const resNormal = calculateThermalDelta(normalMeasurement);
    expect(resNormal.severity).toBe("NORMAL");
    expect(resNormal.deltaC).toBe(2.5);

    // 2. Elevated (Delta 6.0°C)
    const elevatedMeasurement: ThermalMeasurement = {
      spotTempC: 26.0,
      ambientReflectedC: 20.0,
      emissivity: 0.92,
      hotSpotCoords: { x: 0.35, y: 0.4 },
    };
    const resElevated = calculateThermalDelta(elevatedMeasurement);
    expect(resElevated.severity).toBe("ELEVATED");
    expect(resElevated.deltaC).toBe(6.0);

    // 3. Critical (Delta 14.5°C)
    const criticalMeasurement: ThermalMeasurement = {
      spotTempC: 34.5,
      ambientReflectedC: 20.0,
      emissivity: 0.95,
      hotSpotCoords: { x: 0.7, y: 0.2 },
    };
    const resCritical = calculateThermalDelta(criticalMeasurement);
    expect(resCritical.severity).toBe("CRITICAL");
    expect(resCritical.deltaC).toBe(14.5);
    expect(resCritical.diagnosticInterpretation).toContain("Severe thermal anomaly");
  });

  it("generates HUD overlay badges with appropriate styling", () => {
    const measurement: ThermalMeasurement = {
      spotTempC: 45.0,
      ambientReflectedC: 25.0, // Delta 20.0°C -> Critical
      emissivity: 0.94,
      hotSpotCoords: { x: 0.65, y: 0.42 },
    };

    const badges = generateThermalHudBadges(measurement, "F");

    expect(badges.length).toBe(2);
    // Primary hotspot pin badge
    expect(badges[0].text).toContain("HOT: 113°F");
    expect(badges[0].text).toContain("+36°F Δ");
    expect(badges[0].bgColor).toBe("#ef4444"); // red for critical
    expect(badges[0].xPercent).toBe(0.65);
    expect(badges[0].yPercent).toBe(0.42);

    // Reference footer badge
    expect(badges[1].text).toContain("REF: 77°F");
    expect(badges[1].text).toContain("ε=0.94");
  });
});
