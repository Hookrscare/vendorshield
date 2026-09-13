import { describe, it, expect } from 'vitest';
import {
  SubsurfaceCavityTomographyExporter,
  SubsurfaceTomographySurvey,
  VoxelSample,
} from './subsurface-cavity-tomography-exporter';

describe('Subsurface Cavity Tomography Exporter (SNAP-43)', () => {
  it('detects imminent structural collapse void beneath foundation footing and generates 3D OBJ & GeoJSON', () => {
    // Voxels with a cluster of air voids at depth z=1.2m directly below foundationDepth=1.0m
    const voxels: VoxelSample[] = [];

    // Background soil: permittivity ~12.0
    for (let x = 0; x <= 4; x += 1) {
      for (let y = 0; y <= 4; y += 1) {
        for (let z = 0.5; z <= 3.0; z += 0.5) {
          voxels.push({
            x,
            y,
            z,
            relativePermittivity: 12.0,
            signalAmplitude: 2.0,
          });
        }
      }
    }

    // Add 25 void voxels (air ~1.0, high reflection) at x=2, y=2, z=1.2 to 1.5
    for (let i = 0; i < 25; i++) {
      voxels.push({
        x: 2.0 + (i % 5) * 0.1,
        y: 2.0 + Math.floor(i / 5) * 0.1,
        z: 1.3,
        relativePermittivity: 1.05,
        signalAmplitude: 28.5,
      });
    }

    const survey: SubsurfaceTomographySurvey = {
      surveyId: 'GPR-SURVEY-2026-X4',
      locationName: 'Structural Pier 12 Footing',
      gridDimensions: {
        lengthMeters: 5,
        widthMeters: 5,
        maxDepthMeters: 4,
      },
      foundationDepthMeters: 1.0,
      voxels,
    };

    const report = SubsurfaceCavityTomographyExporter.analyzeAndExport(survey);

    expect(report.surveyId).toBe('GPR-SURVEY-2026-X4');
    expect(report.totalVolumeScannedM3).toBe(100);
    expect(report.detectedCavities.length).toBeGreaterThanOrEqual(1);
    expect(report.overallRiskTier).toBe('CRITICAL_COLLAPSE_IMMINENT');
    expect(report.structuralUnderpinningRequired).toBe(true);

    // Verify 3D OBJ output
    expect(report.exportedObjMesh).toContain('o Subsurface_Cavities');
    expect(report.exportedObjMesh).toContain('v ');
    expect(report.exportedObjMesh).toContain('f ');

    // Verify GeoJSON output
    expect(report.exportedGeoJson.type).toBe('FeatureCollection');
    expect(report.exportedGeoJson.features.length).toBeGreaterThanOrEqual(1);

    // Verify ASCII XYZ output
    expect(report.exportedAsciiXyz).toContain('2.000 2.000 -1.300 1.05');
  });

  it('reports STABLE_ACCEPTABLE when no anomalous air voids are discovered', () => {
    const voxels: VoxelSample[] = [
      { x: 1, y: 1, z: 1, relativePermittivity: 8.5, signalAmplitude: 3.1 },
      { x: 2, y: 2, z: 2, relativePermittivity: 14.2, signalAmplitude: 1.8 },
    ];

    const survey: SubsurfaceTomographySurvey = {
      surveyId: 'GPR-SURVEY-STABLE',
      locationName: 'Pavement Sub-Base Section B',
      gridDimensions: { lengthMeters: 10, widthMeters: 10, maxDepthMeters: 3 },
      foundationDepthMeters: 0.5,
      voxels,
    };

    const report = SubsurfaceCavityTomographyExporter.analyzeAndExport(survey);

    expect(report.detectedCavities.length).toBe(0);
    expect(report.overallRiskTier).toBe('STABLE_ACCEPTABLE');
    expect(report.structuralUnderpinningRequired).toBe(false);
    expect(report.exportedGeoJson.features.length).toBe(0);
  });
});
