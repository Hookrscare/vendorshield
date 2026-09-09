import { describe, it, expect } from 'vitest';
import {
  analyzeTemperatureProfile,
  estimateEnvelopeRValue,
  exportTemperatureCurveSVG
} from './thermal-resistance-curve';

describe('SNAP-17: Thermal Infrared Point-to-Point Resistance Temperature Curve Exporter', () => {
  it('analyzes temperature profile and flags steep gradient thermal bridging', () => {
    // 5 meters wall profile with a sharp cold bridge at 2.5m (metal stud or uninsulated void)
    const points = [
      { distanceMeters: 0.0, tempCelsius: 21.0 },
      { distanceMeters: 1.0, tempCelsius: 20.8 },
      { distanceMeters: 2.0, tempCelsius: 20.5 },
      { distanceMeters: 2.5, tempCelsius: 13.0 }, // Drop of 7.5°C over 0.5m = 15°C/m (> 8°C/m)
      { distanceMeters: 3.0, tempCelsius: 20.4 },
      { distanceMeters: 5.0, tempCelsius: 20.9 }
    ];

    const res = analyzeTemperatureProfile(points, 8.0);
    expect(res.minTempCelsius).toBe(13.0);
    expect(res.maxTempCelsius).toBe(21.0);
    expect(res.deltaTCelsius).toBe(8.0);
    expect(res.maxGradientCelsiusPerMeter).toBeGreaterThanOrEqual(14.0);
    expect(res.thermalBridgingDetected).toBe(true);
    expect(res.anomalyCount).toBeGreaterThanOrEqual(1);
    expect(res.profilePoints.length).toBe(6);
  });

  it('calculates measured R-value and classifies degradation severity', () => {
    // Indoor 22°C, outdoor 0°C -> deltaT = 22°C
    // Good wall: nominal R=3.5, heat flux = 6.5 W/m² -> measured R = 22 / 6.5 = 3.38 (degradation ~ 3.4%)
    const goodReport = estimateEnvelopeRValue(22.0, 0.0, 6.5, 3.5);
    expect(goodReport.measuredRValue).toBe(3.38);
    expect(goodReport.degradationPercentage).toBeLessThan(10.0);
    expect(goodReport.assessment).toBe('EXCELLENT');

    // Severely leaking wall: heat flux = 25 W/m² -> measured R = 22 / 25 = 0.88 (degradation ~ 74.9%)
    const leakReport = estimateEnvelopeRValue(22.0, 0.0, 25.0, 3.5);
    expect(leakReport.measuredRValue).toBe(0.88);
    expect(leakReport.degradationPercentage).toBeGreaterThan(50.0);
    expect(leakReport.assessment).toBe('CRITICAL_THERMAL_BRIDGE');
  });

  it('generates compliant SVG temperature curve with polyline and annotations', () => {
    const points = [
      { distanceMeters: 0.0, tempCelsius: 19.5 },
      { distanceMeters: 2.0, tempCelsius: 19.8 },
      { distanceMeters: 4.0, tempCelsius: 19.2 }
    ];
    const res = analyzeTemperatureProfile(points);
    const svg = exportTemperatureCurveSVG(res, 500, 180);

    expect(svg).toContain('<svg width="500" height="180"');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('stroke="#f43f5e"');
    expect(svg).toContain('NOMINAL');
  });
});
