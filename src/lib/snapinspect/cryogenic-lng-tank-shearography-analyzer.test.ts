import { describe, it, expect } from 'vitest';
import {
  CryogenicLngTankShearographyAnalyzer,
  LngTankMembraneSpec,
  ShearographyPhaseMap,
} from './cryogenic-lng-tank-shearography-analyzer';

describe('SNAP-68: CryogenicLngTankShearographyAnalyzer Tests', () => {
  const analyzer = new CryogenicLngTankShearographyAnalyzer();

  const mockSpec: LngTankMembraneSpec = {
    tankId: 'LNG-SPHERE-04',
    membraneAlloy: 'INVAR_36',
    membraneThicknessMm: 0.7,
    operatingTemperatureKelvin: 111.0,
    maxAllowableVoidDiameterMm: 18.0,
  };

  it('certifies pristine membrane with zero fringe anomalies', () => {
    // Uniform baseline phase noise < 0.2 rad
    const grid: number[][] = Array(10)
      .fill(0)
      .map(() => Array(10).fill(0.05));

    const phaseMap: ShearographyPhaseMap = {
      laserWavelengthNm: 532.0,
      shearDistanceMm: 8.0,
      measuredPhaseDifferenceRad: grid,
      thermalExcitationDeltaKelvin: 3.0,
    };

    const res = analyzer.analyzePhaseMap(mockSpec, phaseMap);
    expect(res.totalDefectsFound).toBe(0);
    expect(res.isMembraneIntegrityCertified).toBe(true);
    expect(res.recommendations[0]).toContain('NOMINAL');
  });

  it('detects critical subsurface insulation delamination exceeding tolerance', () => {
    const grid: number[][] = Array(8)
      .fill(0)
      .map(() => Array(8).fill(0.1));

    // Inject massive butterfly fringe anomaly (3.2 rad) at (4, 4)
    grid[4][4] = 3.2; // diameter = 3.2 * 7.5 = 24.0 mm > 18.0 mm

    const phaseMap: ShearographyPhaseMap = {
      laserWavelengthNm: 532.0,
      shearDistanceMm: 8.0,
      measuredPhaseDifferenceRad: grid,
      thermalExcitationDeltaKelvin: 4.0,
    };

    const res = analyzer.analyzePhaseMap(mockSpec, phaseMap);
    expect(res.totalDefectsFound).toBe(1);
    expect(res.isMembraneIntegrityCertified).toBe(false);
    expect(res.maxDefectDiameterMm).toBe(24.0);
    expect(res.defects[0].severity).toBe('CRITICAL_DELAMINATION');
    expect(res.recommendations[0]).toContain('CRITICAL');
  });
});
