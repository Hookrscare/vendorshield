import { describe, it, expect } from 'vitest';
import {
  RoofMembraneWaterIngressRadiometer,
  RoofMoistureProbe
} from './roof-membrane-water-ingress-radiometer';

describe('SNAP-79: Roof Ponding & Membrane Water Ingress Radiometer', () => {
  it('confirms dry compliant EPDM roofing assembly', () => {
    const probe: RoofMoistureProbe = {
      roofSectionId: 'zone_a_drain_vicinity',
      membraneType: 'EPDM',
      moistureIndex: 12.5,
      pondingDepthMm: 2.0,
      pondingDurationHours: 12.0
    };

    const verdict = RoofMembraneWaterIngressRadiometer.evaluateRoofMoisture(probe);

    expect(verdict.isAcceptable).toBe(true);
    expect(verdict.status).toBe('ROOF_MEMBRANE_DRY_COMPLIANT');
    expect(verdict.ingressSeverity).toBe('NOMINAL');
  });

  it('detects chronic ponding water exceeding 48h threshold', () => {
    const probe: RoofMoistureProbe = {
      roofSectionId: 'zone_c_midspan_deflection',
      membraneType: 'TPO',
      moistureIndex: 25.0,
      pondingDepthMm: 18.0,
      pondingDurationHours: 64.0 // > 48h
    };

    const verdict = RoofMembraneWaterIngressRadiometer.evaluateRoofMoisture(probe);

    expect(verdict.isAcceptable).toBe(false);
    expect(verdict.status).toBe('CHRONIC_PONDING_WATER_DEFECT');
    expect(verdict.ingressSeverity).toBe('MODERATE');
    expect(verdict.remedialAction).toContain('tapered insulation');
  });

  it('flags critical delamination and saturated substrate core', () => {
    const probe: RoofMoistureProbe = {
      roofSectionId: 'zone_d_scupper_blockage',
      membraneType: 'MOD_BIT',
      moistureIndex: 82.0, // Saturated core
      pondingDepthMm: 35.0,
      pondingDurationHours: 72.0
    };

    const verdict = RoofMembraneWaterIngressRadiometer.evaluateRoofMoisture(probe);

    expect(verdict.isAcceptable).toBe(false);
    expect(verdict.status).toBe('CRITICAL_DELAMINATION_STRUCTURAL_RISK');
    expect(verdict.ingressSeverity).toBe('CRITICAL');
    expect(verdict.remedialAction).toContain('CRITICAL');
  });
});
