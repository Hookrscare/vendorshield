import { describe, it, expect } from 'vitest';
import {
  DroneThermalLeakageHeatmapEstimator,
  MultiSpectralSample,
} from './drone-thermal-leakage-heatmap';

describe('SNAP-45: DroneThermalLeakageHeatmapEstimator (Aerial Building Envelope Thermography)', () => {
  const estimator = new DroneThermalLeakageHeatmapEstimator({
    ambientTempC: 0.0, // 0°C outdoor
    indoorSetTempC: 20.0, // 20°C indoor (Delta-T = 20K)
    windSpeedMPerS: 2.0,
    heatingDegreeDays: 3000,
    energyCostPerKwhUsd: 0.15,
  });

  it('throws error when samples array is empty', () => {
    expect(() => estimator.analyzeHeatmap('FLIGHT-00', [])).toThrow('No multispectral imagery samples');
  });

  it('correctly assesses an optimally insulated airtight building envelope', () => {
    // Normal envelope: surface temp barely above ambient (e.g. 1.0°C to 1.5°C)
    const samples: MultiSpectralSample[] = [
      { cellId: 'c1', xMeters: 0, yMeters: 0, surfaceTempC: 1.2 },
      { cellId: 'c2', xMeters: 1, yMeters: 0, surfaceTempC: 1.0 },
      { cellId: 'c3', xMeters: 0, yMeters: 1, surfaceTempC: 1.4 },
      { cellId: 'c4', xMeters: 1, yMeters: 1, surfaceTempC: 1.1 },
    ];

    const report = estimator.analyzeHeatmap('FLIGHT-AIRTIGHT-01', samples, 1.0);
    expect(report.overallHealthStatus).toBe('OPTIMAL_ENVELOPE');
    expect(report.criticalLeakageAreaM2).toBe(0);
    expect(report.maxSurfaceTempC).toBe(1.4);
    expect(report.recommendedPunchlist[0]).toContain('complies with ASHRAE 90.1');
  });

  it('identifies severe envelope puncture and estimates annual monetary loss', () => {
    // Envelope with a major thermal bypass / puncture at cell c2 (surface temp 14.0°C when ambient is 0°C)
    const samples: MultiSpectralSample[] = [
      { cellId: 'c1', xMeters: 0, yMeters: 0, surfaceTempC: 1.5 },
      { cellId: 'c2', xMeters: 1, yMeters: 0, surfaceTempC: 14.0 }, // Severe puncture
      { cellId: 'c3', xMeters: 0, yMeters: 1, surfaceTempC: 8.5 },  // Moderate thermal bridge
      { cellId: 'c4', xMeters: 1, yMeters: 1, surfaceTempC: 1.8 },
    ];

    const report = estimator.analyzeHeatmap('FLIGHT-DEFECT-02', samples, 1.0);
    expect(report.overallHealthStatus).toBe('CRITICAL_ENERGY_LOSS');
    expect(report.criticalLeakageAreaM2).toBeGreaterThan(0);
    expect(report.totalAnnualCostLossUsd).toBeGreaterThan(50);
    expect(report.cellGrid.find((c) => c.cellId === 'c2')?.classification).toBe('CRITICAL_ENVELOPE_PUNCTURE');
    expect(report.svgHeatmapMarkup).toContain('<svg');
    expect(report.svgHeatmapMarkup).toContain('fill="#d7191c"'); // Red alert rect for puncture
  });
});
