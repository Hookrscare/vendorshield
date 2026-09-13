/**
 * src/lib/snapinspect/offshore-wind-turbine-monopile-monitor.test.ts
 * Vitest tests for SNAP-59.
 */

import { describe, it, expect } from 'vitest';
import {
  OffshoreWindTurbineMonopileMonitor,
  MonopileDimensions,
  MetoceanConditions,
  CyclicStressBlock
} from './offshore-wind-turbine-monopile-monitor';

describe('SNAP-59: OffshoreWindTurbineMonopileMonitor', () => {
  const monitor = new OffshoreWindTurbineMonopileMonitor();

  const standardDim: MonopileDimensions = {
    outerDiameterMeters: 8.0,
    wallThicknessMm: 80,
    waterDepthMeters: 30.0,
    embedmentDepthMeters: 35.0,
    steelYieldStrengthMpa: 355,
    topMassKg: 900000
  };

  const standardMetocean: MetoceanConditions = {
    currentVelocityMps: 1.2,
    waveSignificantHeightMeters: 4.5,
    wavePeakPeriodSeconds: 8.5,
    turbine1pFrequencyHz: 0.20,
    turbine3pFrequencyHz: 0.60
  };

  it('calculates equilibrium scour and shifts in natural frequency with seabed scour', () => {
    const eqScour = monitor.estimateEquilibriumScour(standardDim, standardMetocean);
    expect(eqScour).toBeGreaterThan(4.0); // Equilibrium scour for 8m pile typically 1.0 - 1.3 * D
    expect(eqScour).toBeLessThan(14.0);

    const f0_baseline = monitor.calculateNaturalFrequency(standardDim, 0.0);
    const f0_scoured = monitor.calculateNaturalFrequency(standardDim, 4.0);

    expect(f0_baseline).toBeGreaterThan(0.15);
    expect(f0_scoured).toBeLessThan(f0_baseline); // Longer free length lowers natural frequency
  });

  it('detects cumulative fatigue accumulation using DNV-RP-C203 Curve D', () => {
    const stressBlocks: CyclicStressBlock[] = [
      { stressRangeMpa: 50, cycleCount: 1000000 },
      { stressRangeMpa: 100, cycleCount: 100000 },
      { stressRangeMpa: 150, cycleCount: 20000 }
    ];

    const damage = monitor.calculateCumulativeFatigue(stressBlocks);
    expect(damage).toBeGreaterThan(0.01);
    expect(damage).toBeLessThan(2.0);
  });

  it('computes remedial riprap rock dump volume for conical scour hole', () => {
    const volumeZero = monitor.calculateRemedialRiprapVolume(8.0, 0.1);
    expect(volumeZero).toBe(0.0);

    const volumeScour = monitor.calculateRemedialRiprapVolume(8.0, 3.5);
    expect(volumeScour).toBeGreaterThan(100.0); // Substantial cubic meters for an 8m diameter pile
  });

  it('produces a comprehensive inspection report with SHA-256 attestation', () => {
    const assessment = monitor.assessMonopileHealth(
      standardDim,
      standardMetocean,
      4.5, // 4.5m measured scour (> 0.5 * D = 4.0m)
      [
        { stressRangeMpa: 40, cycleCount: 5000000 },
        { stressRangeMpa: 120, cycleCount: 50000 }
      ]
    );

    expect(assessment.scourSeverity).toBe('CRITICAL_UNDERMINING');
    expect(assessment.frequencyDropPercent).toBeGreaterThan(0.5);
    expect(assessment.remedialRiprapVolumeM3).toBeGreaterThan(150);
    expect(assessment.inspectionAttestationHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
