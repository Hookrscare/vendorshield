import { describe, it, expect } from 'vitest';
import {
  SpacecraftTpsAblativeTileSpallationInspector,
  TpsTileScanData,
} from './spacecraft-tps-ablative-tile-spallation-inspector';

describe('SNAP-73: SpacecraftTpsAblativeTileSpallationInspector Tests', () => {
  const inspector = new SpacecraftTpsAblativeTileSpallationInspector();

  it('certifies airworthy tile with pristine surface and nominal thickness', () => {
    const pristineTile: TpsTileScanData = {
      tileId: 'tile-wing-leading-edge-012',
      nominalThicknessMm: 35.0,
      measuredThicknessMm: 34.8,
      maxSpallationVoidDepthMm: 0.1,
      spallationSurfaceAreaMm2: 2.0,
      subsurfaceThermalDiffusivityRatio: 0.98,
      reentryPeakHeatFluxWattsPerCm2: 120.0,
    };

    const res = inspector.inspectTile(pristineTile);
    expect(res.flightReadinessVerdict).toBe('AIRWORTHY_ORBITAL_REENTRY_CERTIFIED');
    expect(res.isCoatingBreached).toBe(false);
    expect(res.predictedBackfaceTempCelsius).toBeLessThan(150.0);
  });

  it('detects catastrophic burn-through risk when deep void breaches thermal barrier', () => {
    const compromisedTile: TpsTileScanData = {
      tileId: 'tile-nosecone-keel-004',
      nominalThicknessMm: 40.0,
      measuredThicknessMm: 22.0,
      maxSpallationVoidDepthMm: 6.5, // > 3.5mm critical threshold
      spallationSurfaceAreaMm2: 450.0,
      subsurfaceThermalDiffusivityRatio: 0.52, // heavy internal delamination
      reentryPeakHeatFluxWattsPerCm2: 350.0,
    };

    const res = inspector.inspectTile(compromisedTile);
    expect(res.flightReadinessVerdict).toBe('NO_GO_CATASTROPHIC_BURNTHROUGH_RISK');
    expect(res.isCoatingBreached).toBe(true);
    expect(res.predictedBackfaceTempCelsius).toBeGreaterThan(175.0);
    expect(res.recommendations).toContain('Tile replacement mandatory before atmospheric reentry.');
  });
});
