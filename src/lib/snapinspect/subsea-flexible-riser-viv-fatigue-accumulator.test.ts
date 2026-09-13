import { describe, it, expect } from 'vitest';
import {
  SubseaFlexibleRiserVivFatigueAccumulator,
  RiserHydrodynamicProfile,
  StressCycleBlock
} from './subsea-flexible-riser-viv-fatigue-accumulator';

describe('SNAP-78: SubseaFlexibleRiserVivFatigueAccumulator', () => {
  const baseRiser: RiserHydrodynamicProfile = {
    riserOuterDiameterMeters: 0.40, // 400mm OD
    currentVelocityMs: 1.0,         // 1.0 m/s ocean current
    naturalFrequencyHz: 0.50,       // 0.50 Hz modal natural frequency
    waterDepthMeters: 1200          // Deepwater Santos Basin
  };

  it('calculates Strouhal vortex shedding frequency accurately', () => {
    // f_s = 0.20 * 1.0 / 0.40 = 0.50 Hz
    const assessment = SubseaFlexibleRiserVivFatigueAccumulator.evaluateVivAndFatigue(
      baseRiser,
      [],
      24.0,
      10.0
    );

    expect(assessment.sheddingFrequencyHz).toBe(0.50);
    expect(assessment.isLockInCondition).toBe(true);
    expect(assessment.tacticalInspectionDirective).toContain('Hydrodynamic lock-in detected');
  });

  it('detects non-lock-in condition when frequencies diverge', () => {
    const divergentRiser: RiserHydrodynamicProfile = {
      ...baseRiser,
      currentVelocityMs: 0.20 // f_s = 0.2 * 0.2 / 0.4 = 0.10 Hz (far from 0.50 Hz)
    };

    const assessment = SubseaFlexibleRiserVivFatigueAccumulator.evaluateVivAndFatigue(
      divergentRiser,
      [],
      24.0,
      10.0
    );

    expect(assessment.sheddingFrequencyHz).toBe(0.10);
    expect(assessment.isLockInCondition).toBe(false);
    expect(assessment.tacticalInspectionDirective).toContain('NOMINAL');
  });

  it('accumulates Palmgren-Miner cyclic fatigue damage and flags critical threshold', () => {
    // Heavy cyclic stress block that exhausts DFF limit
    const highStressBlocks: StressCycleBlock[] = [
      { stressRangeMpa: 120.0, observedCycles: 1_000_000 }
    ];

    const assessment = SubseaFlexibleRiserVivFatigueAccumulator.evaluateVivAndFatigue(
      baseRiser,
      highStressBlocks,
      24.0,
      10.0 // Allowable damage = 0.10
    );

    expect(assessment.cumulativeMinerDamageIndex).toBeGreaterThan(0.10);
    expect(assessment.isCriticalFatigueExceeded).toBe(true);
    expect(assessment.tacticalInspectionDirective).toContain('CRITICAL');
  });

  it('handles low-stress regime with two-slope S-N curve transition', () => {
    const lowStressBlocks: StressCycleBlock[] = [
      { stressRangeMpa: 30.0, observedCycles: 50_000 } // Below 52.63 MPa transition
    ];

    const assessment = SubseaFlexibleRiserVivFatigueAccumulator.evaluateVivAndFatigue(
      baseRiser,
      lowStressBlocks,
      720.0, // 30 days
      10.0
    );

    expect(assessment.cumulativeMinerDamageIndex).toBeGreaterThan(0);
    expect(assessment.isCriticalFatigueExceeded).toBe(false);
    expect(assessment.projectedFatigueLifeYears).toBeGreaterThan(10);
  });

  it('validates invalid physical dimensions', () => {
    expect(() => {
      SubseaFlexibleRiserVivFatigueAccumulator.evaluateVivAndFatigue(
        { ...baseRiser, riserOuterDiameterMeters: 0 },
        []
      );
    }).toThrow(/Invalid riser hydrodynamic parameters/);
  });
});
