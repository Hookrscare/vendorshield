/**
 * src/lib/snapinspect/subsea-flexible-riser-hydrodynamic-drag-profiler.test.ts
 * Unit tests for SNAP-83 Offshore Subsea Flexible Riser Hydrodynamic Drag Profiler.
 */

import { describe, it, expect } from 'vitest';
import {
  SubseaFlexibleRiserHydrodynamicDragProfiler,
  RiserHydrodynamicConfig,
  CurrentDepthProfileBin
} from './subsea-flexible-riser-hydrodynamic-drag-profiler';

describe('SubseaFlexibleRiserHydrodynamicDragProfiler (SNAP-83)', () => {
  const config: RiserHydrodynamicConfig = {
    riserId: 'FPSO-RISER-04-GAS-EXPORT',
    nominalOuterDiameterM: 0.35, // 350mm OD
    riserLengthM: 1800.0,
    waterDepthM: 1200.0,
    nominalSeawaterDensityKgM3: 1025.0,
    adjacentRiserSeparationM: 6.0
  };

  it('profiles clean riser under mild currents as normal hydrodynamic drag', () => {
    const bins: CurrentDepthProfileBin[] = [
      { depthM: 50, currentVelocityMS: 0.4, marineGrowthThicknessM: 0.005 },
      { depthM: 400, currentVelocityMS: 0.25, marineGrowthThicknessM: 0.002 },
      { depthM: 1000, currentVelocityMS: 0.1, marineGrowthThicknessM: 0.0 }
    ];

    const res = SubseaFlexibleRiserHydrodynamicDragProfiler.profileRiserDrag(config, bins);
    expect(res.integrityTier).toBe('NORMAL_HYDRODYNAMIC_DRAG');
    expect(res.clashingRisk).toBe(false);
    expect(res.residualSeparationM).toBeGreaterThan(4.5);
    expect(res.telemetryDigestSha256).toHaveLength(64);
  });

  it('detects elevated drag when marine biofouling thickens near surface', () => {
    const bins: CurrentDepthProfileBin[] = [
      { depthM: 50, currentVelocityMS: 0.9, marineGrowthThicknessM: 0.025 }, // 25mm barnacles
      { depthM: 400, currentVelocityMS: 0.4, marineGrowthThicknessM: 0.015 },
      { depthM: 1000, currentVelocityMS: 0.2, marineGrowthThicknessM: 0.005 }
    ];

    const res = SubseaFlexibleRiserHydrodynamicDragProfiler.profileRiserDrag(config, bins);
    expect(res.maxDragCoefficientCd).toBeGreaterThan(1.1);
    expect(res.integrityTier).toBe('ELEVATED_FOULING_DRAG');
    expect(res.recommendedAction).toBe('SCHEDULE_DEFOULING_WITHIN_30_DAYS');
  });

  it('triggers critical clashing alert under extreme storm currents with heavy growth', () => {
    const narrowSeparationConfig: RiserHydrodynamicConfig = {
      ...config,
      adjacentRiserSeparationM: 2.0
    };

    const stormBins: CurrentDepthProfileBin[] = [
      { depthM: 50, currentVelocityMS: 1.8, marineGrowthThicknessM: 0.08 },
      { depthM: 400, currentVelocityMS: 1.2, marineGrowthThicknessM: 0.05 },
      { depthM: 1000, currentVelocityMS: 0.6, marineGrowthThicknessM: 0.02 }
    ];

    const res = SubseaFlexibleRiserHydrodynamicDragProfiler.profileRiserDrag(
      narrowSeparationConfig,
      stormBins
    );
    expect(res.integrityTier).toBe('CRITICAL_CLASHING_RISK_CLEANING_REQUIRED');
    expect(res.clashingRisk).toBe(true);
    expect(res.recommendedAction).toBe('DEPLOY_ROV_WATERJET_DEFOULING_IMMEDIATELY');
  });

  it('rejects empty depth bins', () => {
    expect(() =>
      SubseaFlexibleRiserHydrodynamicDragProfiler.profileRiserDrag(config, [])
    ).toThrow('Depth profile bins cannot be empty');
  });
});
