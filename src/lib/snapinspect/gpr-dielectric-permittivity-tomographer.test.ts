/**
 * SNAP-45: Dynamic GPR Dielectric Permittivity Concrete Moisture Tomographer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  GPRDielectricPermittivityTomographer,
  GPRAscanData
} from './gpr-dielectric-permittivity-tomographer';

describe('SNAP-45: GPRDielectricPermittivityTomographer', () => {
  const tomographer = new GPRDielectricPermittivityTomographer();

  it('computes expected permittivity and velocity for dry concrete (epsilon_r ~ 4.5)', () => {
    // For depth 0.15m and epsilon_r = 4.5 -> v = c / sqrt(4.5) = 0.2998 / 2.1213 = 0.1413 m/ns
    // TWT = 2 * d / v = 0.30 / 0.1413 = 2.1228 ns
    const perm = tomographer.calculatePermittivityFromTWT(2.123, 0.15);
    expect(perm).toBeGreaterThan(4.0);
    expect(perm).toBeLessThan(5.0);

    const moist = tomographer.estimateVolumetricMoisture(perm);
    expect(moist).toBeGreaterThan(0.0);
    expect(moist).toBeLessThan(5.0);
    expect(tomographer.classifySeverity(moist)).toBe('OPTIMAL_DRY');
  });

  it('detects saturated delamination alert for high TWT (water-saturated concrete)', () => {
    // High TWT indicating severe wave delay due to high water dielectric constant (epsilon_r > 15)
    // For depth 0.15m and TWT = 4.0 ns -> v = 0.30 / 4.0 = 0.075 m/ns -> eps = (0.2998 / 0.075)^2 ~ 16
    const perm = tomographer.calculatePermittivityFromTWT(4.0, 0.15);
    expect(perm).toBeGreaterThan(15.0);

    const moist = tomographer.estimateVolumetricMoisture(perm);
    expect(moist).toBeGreaterThan(12.0);
    expect(tomographer.classifySeverity(moist)).toBe('SATURATED_DELAMINATION_ALERT');
  });

  it('generates a complete tomography report with anomaly polygons and SVG CAD markup', () => {
    const mockScans: GPRAscanData[] = [
      { scanIndex: 0, xPositionMeters: 0.0, twoWayTravelTimeNs: 2.1, knownDepthMeters: 0.15, amplitudeRfl: 0.3 },
      { scanIndex: 1, xPositionMeters: 0.5, twoWayTravelTimeNs: 2.2, knownDepthMeters: 0.15, amplitudeRfl: 0.35 },
      { scanIndex: 2, xPositionMeters: 1.0, twoWayTravelTimeNs: 3.8, knownDepthMeters: 0.15, amplitudeRfl: 0.8 }, // Saturated zone
      { scanIndex: 3, xPositionMeters: 1.5, twoWayTravelTimeNs: 3.9, knownDepthMeters: 0.15, amplitudeRfl: 0.85 }, // Saturated zone
      { scanIndex: 4, xPositionMeters: 2.0, twoWayTravelTimeNs: 2.15, knownDepthMeters: 0.15, amplitudeRfl: 0.3 }
    ];

    const report = tomographer.generateTomography(mockScans);
    expect(report.totalScanPoints).toBe(5);
    expect(report.surveyLengthMeters).toBe(2.0);
    expect(report.maxSurveyDepthMeters).toBe(0.15);
    expect(report.cells.length).toBe(5);
    expect(report.anomalyPolygons.length).toBeGreaterThan(0);
    expect(report.anomalyPolygons[0].points.length).toBe(4);
    expect(report.svgCadOverlay).toContain('<svg');
    expect(report.svgCadOverlay).toContain('<polygon');
  });

  it('throws on empty scan dataset', () => {
    expect(() => tomographer.generateTomography([])).toThrow('GPR scan dataset cannot be empty');
  });
});
