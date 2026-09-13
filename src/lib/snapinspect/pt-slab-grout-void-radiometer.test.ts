import { describe, it, expect } from 'vitest';
import {
  PtSlabGroutVoidRadiometer,
  PtDuctScanMeasurement
} from './pt-slab-grout-void-radiometer';

describe('SNAP-81: Post-Tensioned Concrete Slab Tendon Void Radiometer', () => {
  it('confirms fully consolidated grout pass in bonded PT duct', () => {
    const scan: PtDuctScanMeasurement = {
      ductId: 'slab_lvl_4_tendon_12b',
      slabElevation: 'Level 4 Parking Deck',
      tendonType: 'MULTI_STRAND_BONDED',
      averageDensityGcm3: 2.22,
      attenuationVariancePct: 3.2,
      voidLengthMm: 0
    };

    const res = PtSlabGroutVoidRadiometer.evaluateDuctIntegrity(scan);

    expect(res.isAcceptable).toBe(true);
    expect(res.status).toBe('DUCT_GROUT_SOLID_PASS');
    expect(res.corrosionRiskRating).toBe('NEGLIGIBLE');
  });

  it('detects minor bleed water void requiring monitoring', () => {
    const scan: PtDuctScanMeasurement = {
      ductId: 'cantilever_duct_07',
      slabElevation: 'Podium Level Slab',
      tendonType: 'MULTI_STRAND_BONDED',
      averageDensityGcm3: 2.05,
      attenuationVariancePct: 9.5,
      voidLengthMm: 45
    };

    const res = PtSlabGroutVoidRadiometer.evaluateDuctIntegrity(scan);

    expect(res.isAcceptable).toBe(true);
    expect(res.status).toBe('MINOR_BLEED_WATER_VOID_MONITOR');
    expect(res.corrosionRiskRating).toBe('MODERATE');
  });

  it('fails critical dry void with severe tendon corrosion risk', () => {
    const scan: PtDuctScanMeasurement = {
      ductId: 'transfer_girder_duct_02',
      slabElevation: 'Level 2 Transfer Plate',
      tendonType: 'MULTI_STRAND_BONDED',
      averageDensityGcm3: 1.45,
      attenuationVariancePct: 28.0,
      voidLengthMm: 320
    };

    const res = PtSlabGroutVoidRadiometer.evaluateDuctIntegrity(scan);

    expect(res.isAcceptable).toBe(false);
    expect(res.status).toBe('CRITICAL_TENDON_CORROSION_VOID_FAIL');
    expect(res.corrosionRiskRating).toBe('HIGH');
    expect(res.remediationAdvice).toContain('vacuum grout injection');
  });
});
