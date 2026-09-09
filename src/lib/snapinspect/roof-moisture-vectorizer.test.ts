/**
 * SNAP-34: Unit tests for Multi-Spectral UAV Roof Moisture Vectorizer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 */

import { describe, it, expect } from "vitest";
import { RoofMoistureVectorizer, DroneSpectralPixel } from "./roof-moisture-vectorizer";

describe("RoofMoistureVectorizer (SNAP-34)", () => {
  it("detects healthy roof membrane with no moisture infiltration", () => {
    const dryPixels: DroneSpectralPixel[] = [
      { x: 0, y: 0, thermalDeltaTCelsius: 0.5, nirReflectance: 0.8, moistureIndex: 0.1 },
      { x: 1, y: 0, thermalDeltaTCelsius: 0.6, nirReflectance: 0.82, moistureIndex: 0.12 },
      { x: 0, y: 1, thermalDeltaTCelsius: 0.4, nirReflectance: 0.79, moistureIndex: 0.08 }
    ];

    const result = RoofMoistureVectorizer.vectorizeBoundaries(dryPixels, 0.2, 500);
    expect(result.polygons).toHaveLength(0);
    expect(result.totalCompromisedAreaSqMeters).toBe(0);
    expect(result.compromisedPercentage).toBe(0);
    expect(result.criticalDamageFlag).toBe(false);
  });

  it("identifies compromised wet insulation cluster and vectorizes boundary", () => {
    const pixels: DroneSpectralPixel[] = [
      // Healthy area
      { x: 0, y: 0, thermalDeltaTCelsius: 0.5, nirReflectance: 0.8, moistureIndex: 0.1 },
      // Compromised wet zone (cluster 1)
      { x: 10, y: 10, thermalDeltaTCelsius: 2.5, nirReflectance: 0.3, moistureIndex: 0.65 },
      { x: 11, y: 10, thermalDeltaTCelsius: 2.8, nirReflectance: 0.28, moistureIndex: 0.70 },
      { x: 10, y: 11, thermalDeltaTCelsius: 2.2, nirReflectance: 0.32, moistureIndex: 0.60 },
      { x: 11, y: 11, thermalDeltaTCelsius: 2.6, nirReflectance: 0.29, moistureIndex: 0.68 }
    ];

    const result = RoofMoistureVectorizer.vectorizeBoundaries(pixels, 0.5, 200);
    expect(result.polygons).toHaveLength(1);
    const poly = result.polygons[0];
    expect(poly.id).toBe("ROOF-INFIL-1");
    expect(poly.severity).toBe("TRAPPED_INSULATION_MOISTURE");
    expect(poly.boundaryPoints).toHaveLength(4);
    expect(poly.areaSqMeters).toBeGreaterThan(0);
    expect(poly.estimatedRemediationCostUsd).toBeGreaterThan(0);
    expect(result.svgPathData).toContain("M 100 100");
  });

  it("flags critical damage when structural saturation threshold is exceeded", () => {
    const saturatedPixels: DroneSpectralPixel[] = [
      { x: 5, y: 5, thermalDeltaTCelsius: 4.2, nirReflectance: 0.15, moistureIndex: 0.88 },
      { x: 6, y: 5, thermalDeltaTCelsius: 3.9, nirReflectance: 0.18, moistureIndex: 0.85 }
    ];

    const result = RoofMoistureVectorizer.vectorizeBoundaries(saturatedPixels, 1.0, 100);
    expect(result.criticalDamageFlag).toBe(true);
    expect(result.polygons[0].severity).toBe("STRUCTURAL_SATURATION");
  });
});
