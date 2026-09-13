import { describe, it, expect } from 'vitest';
import {
  StructuralBoltUltrasonicProfiler,
  BoltUltrasonicMeasurement
} from './structural-bolt-ultrasonic-profiler';

describe('SNAP-80: Structural Steel Bolt Tension Ultrasonic Profiler', () => {
  it('validates compliant 3/4 inch A325 structural bolt pretension', () => {
    const meas: BoltUltrasonicMeasurement = {
      boltId: 'node_b14_bolt_01',
      grade: 'A325',
      nominalDiameterInches: 0.75,
      gripLengthMm: 65.0,
      measuredPreloadTensionKn: 130.0,
      minSpecifiedPreloadKn: 125.0 // AISC Table J3.1 minimum
    };

    const res = StructuralBoltUltrasonicProfiler.evaluateBoltPreload(meas);

    expect(res.isCompliant).toBe(true);
    expect(res.status).toBe('BOLT_PRETENSION_COMPLIANT');
    expect(res.preloadRatio).toBe(1.04);
  });

  it('flags loose / under-torqued bolt prone to joint slip', () => {
    const meas: BoltUltrasonicMeasurement = {
      boltId: 'flange_c_bolt_05',
      grade: 'A490',
      nominalDiameterInches: 0.875,
      gripLengthMm: 80.0,
      measuredPreloadTensionKn: 150.0, // Insufficient for 7/8" A490 (requires 205 kN)
      minSpecifiedPreloadKn: 205.0
    };

    const res = StructuralBoltUltrasonicProfiler.evaluateBoltPreload(meas);

    expect(res.isCompliant).toBe(false);
    expect(res.status).toBe('BOLT_UNDER_TENSIONED_SLIP_RISK');
    expect(res.preloadRatio).toBe(0.73);
    expect(res.inspectionNotes).toContain('Retorque');
  });

  it('warns on over-torqued bolt approaching plastic yield', () => {
    const meas: BoltUltrasonicMeasurement = {
      boltId: 'girder_splice_bolt_09',
      grade: 'A325',
      nominalDiameterInches: 0.75,
      gripLengthMm: 60.0,
      measuredPreloadTensionKn: 175.0, // Exceeds 1.25x of 125 kN
      minSpecifiedPreloadKn: 125.0
    };

    const res = StructuralBoltUltrasonicProfiler.evaluateBoltPreload(meas);

    expect(res.isCompliant).toBe(false);
    expect(res.status).toBe('BOLT_OVER_TENSIONED_YIELD_RISK');
    expect(res.preloadRatio).toBe(1.4);
  });
});
