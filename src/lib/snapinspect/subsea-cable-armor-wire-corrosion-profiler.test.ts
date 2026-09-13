import { describe, it, expect } from 'vitest';
import {
  SubseaCableArmorWireCorrosionProfiler,
  CableArmorReading,
  CableArmorDesignSpec
} from './subsea-cable-armor-wire-corrosion-profiler';

describe('SNAP-83: SubseaCableArmorWireCorrosionProfiler', () => {
  const profiler = new SubseaCableArmorWireCorrosionProfiler();

  const spec: CableArmorDesignSpec = {
    nominalWireDiameterMm: 5.0, // 5mm armor wire
    totalArmorWireCount: 50, // 50 wires in layer
    nominalTensileStrengthMpa: 1770, // 1770 MPa steel
    maxPermissibleDiameterLossPct: 15.0, // 15% max loss
    maxAllowedBrokenWires: 1 // max 1 broken wire allowed
  };

  it('evaluates pristine healthy cable section with full cathodic protection', () => {
    const readings: CableArmorReading[] = [
      {
        chainageMeters: 0,
        measuredOuterDiameterMm: 5.0,
        corrosionPitDepthMm: 0.0,
        cpPotentialMv: -950, // optimal Ag/AgCl
        brokenWireCount: 0
      },
      {
        chainageMeters: 100,
        measuredOuterDiameterMm: 4.95,
        corrosionPitDepthMm: 0.05,
        cpPotentialMv: -920,
        brokenWireCount: 0
      }
    ];

    const res = profiler.evaluateSurvey(readings, spec);
    expect(res.totalPointsEvaluated).toBe(2);
    expect(res.surveyLengthMeters).toBe(100);
    expect(res.overallIntegrity).toBe('PASS');
    expect(res.criticalPointsCount).toBe(0);
    expect(res.points[0].cpStatus).toBe('FULLY_PROTECTED');
    expect(res.points[0].integrityStatus).toBe('NORMAL');
    expect(res.points[0].assessmentDigest).toHaveLength(64);
    expect(res.surveyDigestSha256).toHaveLength(64);
  });

  it('flags critical defect when diameter loss exceeds threshold and wires are broken', () => {
    const readings: CableArmorReading[] = [
      {
        chainageMeters: 250,
        measuredOuterDiameterMm: 4.2,
        corrosionPitDepthMm: 0.5, // effective = 3.7mm -> loss = (5 - 3.7)/5 = 26% > 15%
        cpPotentialMv: -600, // depleted corrosive
        brokenWireCount: 3 // > 1 allowed
      }
    ];

    const res = profiler.evaluateSurvey(readings, spec);
    expect(res.overallIntegrity).toBe('CRITICAL_FAIL');
    expect(res.criticalPointsCount).toBe(1);
    expect(res.points[0].cpStatus).toBe('DEPLETED_CORROSIVE');
    expect(res.points[0].integrityStatus).toBe('CRITICAL_REPLACEMENT_URGENT');
    expect(res.points[0].diameterLossPct).toBeGreaterThan(20);
    expect(res.points[0].residualTensileCapacityKn).toBeLessThan(1000);
  });

  it('detects over-protection hydrogen embrittlement risk', () => {
    const readings: CableArmorReading[] = [
      {
        chainageMeters: 50,
        measuredOuterDiameterMm: 5.0,
        corrosionPitDepthMm: 0.0,
        cpPotentialMv: -1200, // excessive negative potential
        brokenWireCount: 0
      }
    ];

    const res = profiler.evaluateSurvey(readings, spec);
    expect(res.points[0].cpStatus).toBe('OVER_PROTECTED_HYDROGEN_RISK');
  });

  it('validates invalid inputs and empty readings', () => {
    expect(() => profiler.evaluateSurvey([], spec)).toThrow('Survey readings cannot be empty.');
    expect(() =>
      profiler.evaluateSurvey(
        [{ chainageMeters: 0, measuredOuterDiameterMm: 5, corrosionPitDepthMm: 0, cpPotentialMv: -900, brokenWireCount: 0 }],
        { ...spec, nominalWireDiameterMm: 0 }
      )
    ).toThrow('Invalid cable design spec');
  });
});
