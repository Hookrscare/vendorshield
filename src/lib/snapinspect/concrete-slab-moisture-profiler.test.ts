/**
 * Unit test suite for SNAP-31: High-Precision Multi-Sensor Concrete Slab Moisture Relative Humidity Profiler.
 */

import { describe, it, expect } from 'vitest';
import {
  ConcreteSlabMoistureProfiler,
  SlabSpecification,
  ConcreteProbeReading
} from './concrete-slab-moisture-profiler';

describe('SNAP-31: Concrete Slab Moisture Profiler', () => {
  it('validates ASTM F2170 probe depth compliance for single-side drying (40% depth)', () => {
    // 5-inch slab: target depth is 5 * 0.40 = 2.0 inches (tolerance ±0.25 in: 1.75 - 2.25)
    const compliant = ConcreteSlabMoistureProfiler.verifyProbeDepthCompliance(2.0, 5.0, 'SINGLE_SIDE_ON_GRADE');
    expect(compliant.isCompliant).toBe(true);
    expect(compliant.targetDepthInches).toBe(2.0);

    const shallow = ConcreteSlabMoistureProfiler.verifyProbeDepthCompliance(1.0, 5.0, 'SINGLE_SIDE_ON_GRADE');
    expect(shallow.isCompliant).toBe(false);

    const suspendedCompliant = ConcreteSlabMoistureProfiler.verifyProbeDepthCompliance(1.0, 5.0, 'SUSPENDED_DUAL_SIDE');
    expect(suspendedCompliant.isCompliant).toBe(true); // 5 * 0.20 = 1.0 in
  });

  it('calculates MVER vapor emission from RH accurately', () => {
    expect(ConcreteSlabMoistureProfiler.estimateMverFromRH(50)).toBe(1.0);
    // At 75% RH: 1.5 * exp(0.045 * 25) ≈ 1.5 * 3.0802 ≈ 4.6 lbs
    const mver75 = ConcreteSlabMoistureProfiler.estimateMverFromRH(75);
    expect(mver75).toBeGreaterThanOrEqual(4.4);
    expect(mver75).toBeLessThanOrEqual(4.8);
  });

  it('accurately projects days remaining to reach 75% RH', () => {
    const days = ConcreteSlabMoistureProfiler.estimateDaysRemainingToTargetRH(85, 75, 4.0, 0.50);
    // 4 inches * 30 days = 120 days total. (85 - 75) / 25 = 10/25 = 0.4 -> 48 days
    expect(days).toBe(48);

    // If current RH <= target, returns 0
    expect(ConcreteSlabMoistureProfiler.estimateDaysRemainingToTargetRH(72, 75, 4.0, 0.50)).toBe(0);
  });

  it('assesses flooring compatibility and flags high risk for moisture-sensitive coatings', () => {
    const epoxyCheck = ConcreteSlabMoistureProfiler.assessFlooringRisk('EPOXY_COATING', 88, 6.5);
    expect(epoxyCheck.isCompliant).toBe(false);
    expect(epoxyCheck.riskLevel).toBe('CRITICAL_FAIL');
    expect(epoxyCheck.warrantyRisk).toContain('debonding');

    const tileCheck = ConcreteSlabMoistureProfiler.assessFlooringRisk('CERAMIC_TILE', 88, 6.5);
    expect(tileCheck.isCompliant).toBe(true);
    expect(tileCheck.riskLevel).toBe('LOW_PASS');
  });

  it('generates a full multi-sensor concrete moisture report', () => {
    const slab: SlabSpecification = {
      totalThicknessInches: 4.0,
      dryingCondition: 'SINGLE_SIDE_ON_GRADE',
      waterCementRatio: 0.48,
      slabAgeDays: 60,
      ambientTempCelsius: 21.0,
      ambientRHPct: 50.0
    };

    const probes: ConcreteProbeReading[] = [
      {
        probeId: 'PROBE-01',
        depthInches: 1.6, // 4 * 0.4 = 1.6 in -> compliant
        relativeHumidityPct: 78.5,
        temperatureCelsius: 20.8
      },
      {
        probeId: 'PROBE-02',
        depthInches: 1.6,
        relativeHumidityPct: 82.0,
        temperatureCelsius: 21.1
      },
      {
        probeId: 'PROBE-03',
        depthInches: 0.8, // non-compliant depth
        relativeHumidityPct: 72.0,
        temperatureCelsius: 21.0
      }
    ];

    const report = ConcreteSlabMoistureProfiler.generateProfileReport(slab, probes);
    expect(report.totalProbes).toBe(3);
    expect(report.maxRHPct).toBe(82.0);
    expect(report.depthCompliancePct).toBe(67);
    expect(report.probesNonCompliantDepth).toEqual(['PROBE-03']);
    expect(report.flooringAssessments).toHaveLength(5);
    expect(report.overallRecommendation).toContain('CRITICAL');
  });
});
