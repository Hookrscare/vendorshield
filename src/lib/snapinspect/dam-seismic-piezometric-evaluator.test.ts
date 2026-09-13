import { describe, it, expect } from 'vitest';
import {
  DamSeismicPiezometricEvaluator,
  PiezometerReading,
  DamCrestDisplacement,
} from './dam-seismic-piezometric-evaluator';

describe('SNAP-55: DamSeismicPiezometricEvaluator Unit Tests', () => {
  const evaluator = new DamSeismicPiezometricEvaluator();

  it('correctly calculates pore pressure ratio ru', () => {
    const reading: PiezometerReading = {
      sensorId: 'PZ-01',
      depthMeters: 25.0,
      porePressureKPa: 320.0,
      initialHydrostaticKPa: 245.0,
      overburdenEffectiveStressKPa: 150.0,
    };
    // Delta_u = 320 - 245 = 75 kPa; ru = 75 / 150 = 0.50
    const ru = evaluator.calculateRu(reading);
    expect(ru).toBeCloseTo(0.50, 2);
  });

  it('evaluates normal stable condition under nominal conditions', () => {
    const piezometers: PiezometerReading[] = [
      {
        sensorId: 'PZ-01',
        depthMeters: 20.0,
        porePressureKPa: 200.0,
        initialHydrostaticKPa: 195.0,
        overburdenEffectiveStressKPa: 120.0, // Delta_u = 5, ru ~ 0.04
      },
    ];
    const displacements: DamCrestDisplacement[] = [
      {
        prismId: 'PRISM-A',
        verticalSettlementMm: 8.5,
        lateralDeflectionMm: 3.2,
        currentFreeboardMeters: 4.5,
      },
    ];

    const result = evaluator.evaluateDamStability(piezometers, displacements);
    expect(result.safetyLevel).toBe('NORMAL_STABLE');
    expect(result.liquefactionTriggered).toBe(false);
    expect(result.maxVerticalSettlementMm).toBe(8.5);
  });

  it('triggers emergency evacuation when ru reaches liquefaction threshold', () => {
    const piezometers: PiezometerReading[] = [
      {
        sensorId: 'PZ-03-FOUNDATION',
        depthMeters: 35.0,
        porePressureKPa: 550.0,
        initialHydrostaticKPa: 350.0,
        overburdenEffectiveStressKPa: 220.0, // Delta_u = 200, ru = 200/220 ~ 0.909 >= 0.85
      },
    ];
    const displacements: DamCrestDisplacement[] = [
      {
        prismId: 'PRISM-CREST-CENTER',
        verticalSettlementMm: 185.0,
        lateralDeflectionMm: 95.0,
        currentFreeboardMeters: 0.35, // Below 0.5m critical threshold
      },
    ];

    const result = evaluator.evaluateDamStability(piezometers, displacements);
    expect(result.safetyLevel).toBe('CRITICAL_EMERGENCY');
    expect(result.liquefactionTriggered).toBe(true);
    expect(result.recommendedActions).toContain('TRIGGER_DOWNSTREAM_PUBLIC_EVACUATION_SIRENS');
    expect(result.recommendedActions).toContain('OPEN_ALL_BOTTOM_OUTLETS_EMERGENCY_DRAWDOWN');
  });
});
