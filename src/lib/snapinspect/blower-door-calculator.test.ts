import { describe, it, expect } from 'vitest';
import {
  BlowerDoorCalculator,
  BlowerDoorPressurePoint,
  BuildingEnvelopeGeometry
} from './blower-door-calculator';

describe('SNAP-30: Automated Building Envelope Air Barrier Depressurization Blower Door Test Calculator', () => {
  const standardHomeGeometry: BuildingEnvelopeGeometry = {
    buildingVolumeCuFt: 18000,
    aboveGradeWallAreaSqFt: 2200,
    ceilingRoofAreaSqFt: 1500,
    foundationFloorAreaSqFt: 1500,
    conditionedFloorAreaSqFt: 2000
  };

  it('evaluates multi-point depressurization test for tight modern home (IECC 2021 compliant)', () => {
    // Multi-point depressurization curve
    const points: BlowerDoorPressurePoint[] = [
      { differentialPressurePa: 50, measuredFlowCfm: 650 },
      { differentialPressurePa: 40, measuredFlowCfm: 560 },
      { differentialPressurePa: 30, measuredFlowCfm: 460 },
      { differentialPressurePa: 20, measuredFlowCfm: 350 },
      { differentialPressurePa: 10, measuredFlowCfm: 220 }
    ];

    const result = BlowerDoorCalculator.calculateAirtightness(points, standardHomeGeometry, 4);

    expect(result.cfm50).toBeCloseTo(650, -1);
    // ACH50 = (650 * 60) / 18000 = 2.17
    expect(result.ach50).toBeLessThan(3.0);
    expect(result.iecc2021Compliant).toBe(true);
    expect(result.passivhausCompliant).toBe(false);
    expect(result.complianceRating).toBe('IECC_2021_CZ_3_8');
    expect(result.flowExponentN).toBeGreaterThanOrEqual(0.5);
    expect(result.flowExponentN).toBeLessThanOrEqual(0.8);
    expect(result.rSquaredGoodnessOfFit).toBeGreaterThan(0.98);
    expect(result.effectiveLeakageAreaSqIn).toBeGreaterThan(0);
    expect(result.sha256AuditSeal).toHaveLength(8);
  });

  it('identifies ultra-airtight Passivhaus structure (ACH50 <= 0.6)', () => {
    // Ultra-tight envelope
    const points: BlowerDoorPressurePoint[] = [
      { differentialPressurePa: 50, measuredFlowCfm: 150 },
      { differentialPressurePa: 30, measuredFlowCfm: 105 },
      { differentialPressurePa: 15, measuredFlowCfm: 65 }
    ];

    const result = BlowerDoorCalculator.calculateAirtightness(points, standardHomeGeometry, 5);

    // ACH50 = (150 * 60) / 18000 = 0.50
    expect(result.ach50).toBeLessThanOrEqual(0.60);
    expect(result.passivhausCompliant).toBe(true);
    expect(result.iecc2021Compliant).toBe(true);
    expect(result.complianceRating).toBe('PASSIVHAUS');
  });

  it('flags leaky existing construction requiring air-sealing retrofit', () => {
    // Leaky home: 2500 CFM50 on 18000 cu ft -> ACH50 = 8.33
    const points: BlowerDoorPressurePoint[] = [
      { differentialPressurePa: 50, measuredFlowCfm: 2500 }
    ];

    const result = BlowerDoorCalculator.calculateAirtightness(points, standardHomeGeometry, 4);

    expect(result.ach50).toBeGreaterThan(7.0);
    expect(result.iecc2021Compliant).toBe(false);
    expect(result.passivhausCompliant).toBe(false);
    expect(result.complianceRating).toBe('EXISTING_RETROFIT');
    expect(result.effectiveLeakageAreaSqIn).toBeGreaterThan(80);
  });

  it('rejects invalid empty readings or non-positive building volumes', () => {
    expect(() => {
      BlowerDoorCalculator.calculateAirtightness([], standardHomeGeometry);
    }).toThrow('At least one pressure-flow test point is required.');

    expect(() => {
      BlowerDoorCalculator.calculateAirtightness(
        [{ differentialPressurePa: 50, measuredFlowCfm: 500 }],
        { ...standardHomeGeometry, buildingVolumeCuFt: 0 }
      );
    }).toThrow('Conditioned building volume must be greater than 0.');
  });
});
