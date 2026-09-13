import { describe, it, expect } from 'vitest';
import {
  SrfAcceleratorCavityDefectProfiler,
  SrfSurfaceDefect,
} from './srf-accelerator-cavity-defect-profiler';

describe('SNAP-71: SrfAcceleratorCavityDefectProfiler Tests', () => {
  const profiler = new SrfAcceleratorCavityDefectProfiler();

  it('verifies shallow defect has negligible enhancement and no quench risk', () => {
    const shallowDefect: SrfSurfaceDefect = {
      defectId: 'DEF-IRIS-001',
      locationCellIndex: 3,
      isEquatorialWeldRegion: false,
      defectDiameterMicrons: 50.0,
      defectDepthMicrons: 2.0, // shallow 2 um
      edgeRadiusMicrons: 20.0, // smooth gentle edge
    };

    const res = profiler.profileDefect(shallowDefect, { targetOperatingGradientMvPerM: 30.0 });
    expect(res.isQuenchRiskAtTargetGradient).toBe(false);
    expect(res.magneticEnhancementFactorBetaM).toBeLessThan(1.5);
    expect(res.quenchGradientLimitMvPerM).toBeGreaterThan(30.0);
    expect(res.recommendedRemediation).toBe('NONE_ACCEPTABLE');
  });

  it('detects sharp weld pit causing premature thermal quench and requires electropolishing', () => {
    const sharpWeldPit: SrfSurfaceDefect = {
      defectId: 'DEF-EQUATOR-991',
      locationCellIndex: 5, // Center cell
      isEquatorialWeldRegion: true,
      defectDiameterMicrons: 120.0,
      defectDepthMicrons: 45.0, // Deep 45 um
      edgeRadiusMicrons: 2.0, // Very sharp cusp
    };

    const res = profiler.profileDefect(sharpWeldPit, { targetOperatingGradientMvPerM: 31.5 });
    expect(res.isQuenchRiskAtTargetGradient).toBe(true);
    expect(res.magneticEnhancementFactorBetaM).toBeGreaterThan(5.0);
    expect(res.quenchGradientLimitMvPerM).toBeLessThan(15.0);
    expect(res.recommendedRemediation).toBe('CENTRIFUGAL_BARREL_POLISHING_EP');
  });
});
