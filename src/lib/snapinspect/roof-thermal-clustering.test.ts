/**
 * SNAP-24: Unit tests for Drone Orthophoto Building Envelope Roof Thermal Anomaly Clustering Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  RoofThermalClusteringEngine,
  ThermalSurveyInput,
  ThermalPoint,
} from './roof-thermal-clustering';

describe('RoofThermalClusteringEngine (SNAP-24)', () => {
  it('throws error when roof total area is non-positive', () => {
    expect(() =>
      RoofThermalClusteringEngine.analyzeSurvey({
        surveyId: 'invalid-survey',
        roofTotalAreaSqMeters: 0,
        ambientTemperatureCelsius: 18.0,
        dryRoofBaselineCelsius: 20.0,
        points: [],
      })
    ).toThrow('Roof total area must be greater than zero.');
  });

  it('handles empty points survey returning zero clusters', () => {
    const report = RoofThermalClusteringEngine.analyzeSurvey({
      surveyId: 'survey-empty',
      roofTotalAreaSqMeters: 1000,
      ambientTemperatureCelsius: 15.0,
      dryRoofBaselineCelsius: 18.0,
      points: [],
    });

    expect(report.totalPointsAudited).toBe(0);
    expect(report.clusters).toHaveLength(0);
    expect(report.totalCompromisedAreaSqMeters).toBe(0);
    expect(report.percentRoofCompromised).toBe(0);
    expect(report.astmC1153ReplacementRecommended).toBe(false);
    expect(report.immutableManifestHash).toHaveLength(64);
  });

  it('detects and clusters moisture entrapment thermal anomalies', () => {
    const baseline = 20.0;
    const points: ThermalPoint[] = [
      // Cluster 1: Warm moisture patch around (5, 5) -> Delta-T ~ 3.5C
      { id: 'p1', xMeters: 5.0, yMeters: 5.0, temperatureCelsius: 23.5 },
      { id: 'p2', xMeters: 5.4, yMeters: 5.2, temperatureCelsius: 23.8 },
      { id: 'p3', xMeters: 5.2, yMeters: 5.6, temperatureCelsius: 23.4 },
      { id: 'p4', xMeters: 5.5, yMeters: 5.5, temperatureCelsius: 23.6 },

      // Normal cold roof points (20.0 C)
      { id: 'p5', xMeters: 1.0, yMeters: 1.0, temperatureCelsius: 20.1 },
      { id: 'p6', xMeters: 2.0, yMeters: 2.0, temperatureCelsius: 20.0 },
      { id: 'p7', xMeters: 8.0, yMeters: 8.0, temperatureCelsius: 20.2 },
    ];

    const input: ThermalSurveyInput = {
      surveyId: 'survey-warehouse-roof',
      roofTotalAreaSqMeters: 200,
      ambientTemperatureCelsius: 16.0,
      dryRoofBaselineCelsius: baseline,
      points,
      spatialResolutionMeters: 0.5,
      clusterDistanceEpsilonMeters: 1.0,
      minPointsPerCluster: 3,
    };

    const report = RoofThermalClusteringEngine.analyzeSurvey(input);

    expect(report.clusters).toHaveLength(1);
    const cluster = report.clusters[0];
    expect(cluster.classification).toBe('MOISTURE_ENTRAPMENT');
    expect(cluster.pointCount).toBe(4);
    expect(cluster.centroid.xMeters).toBeCloseTo(5.28, 1);
    expect(cluster.centroid.yMeters).toBeCloseTo(5.32, 1);
    expect(cluster.peakDeltaTCelsius).toBe(3.8);
    expect(cluster.estimatedAreaSqMeters).toBeGreaterThan(0);
    expect(report.astmC1153ReplacementRecommended).toBe(false);
    expect(report.recommendedAction).toContain('Localized thermal anomalies detected');
  });

  it('triggers ASTM C1153 replacement recommendation when compromised area >= 25%', () => {
    // Generate large compromised zone covering > 25% of small roof
    const points: ThermalPoint[] = [];
    let id = 1;
    for (let x = 0; x < 6; x += 0.5) {
      for (let y = 0; y < 6; y += 0.5) {
        points.push({
          id: `pt-${id++}`,
          xMeters: x,
          yMeters: y,
          temperatureCelsius: 24.5, // Delta-T = 4.5 C
        });
      }
    }

    const input: ThermalSurveyInput = {
      surveyId: 'survey-severe-damage',
      roofTotalAreaSqMeters: 100, // 36 m^2 affected on 100 m^2 roof -> 36% >= 25%
      ambientTemperatureCelsius: 15.0,
      dryRoofBaselineCelsius: 20.0,
      points,
      spatialResolutionMeters: 0.5,
      clusterDistanceEpsilonMeters: 1.0,
      minPointsPerCluster: 3,
    };

    const report = RoofThermalClusteringEngine.analyzeSurvey(input);
    expect(report.percentRoofCompromised).toBeGreaterThanOrEqual(25.0);
    expect(report.astmC1153ReplacementRecommended).toBe(true);
    expect(report.recommendedAction).toContain('ASTM C1153 wet insulation threshold');
    expect(report.recommendedAction).toContain('Complete roof tear-off and re-cover recommended');
  });
});
