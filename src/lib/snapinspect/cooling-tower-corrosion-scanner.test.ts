import { describe, it, expect } from 'vitest';
import {
  CoolingTowerCorrosionScanner,
  CoolingTowerInspectionInput,
} from './cooling-tower-corrosion-scanner';

describe('SNAP-59: CoolingTowerCorrosionScanner Tests', () => {
  const scanner = new CoolingTowerCorrosionScanner();

  it('evaluates sound early-life cooling tower with low degradation', () => {
    const input: CoolingTowerInspectionInput = {
      exposureYears: 3,
      nominalConcreteCoverMm: 50.0,
      ambientCo2Ppm: 420.0,
      sulfuricAcidDepositionRateGPerM2Yr: 2.0,
      observedMicrocrackDensityPerM2: 1.0,
      meanCrackWidthMm: 0.05,
    };

    const assessment = scanner.evaluateShellDegradation(input);
    expect(assessment.structuralSeverityLevel).toBe('LOW');
    expect(assessment.effectiveResidualCoverMm).toBeGreaterThan(40.0);
    expect(assessment.rebarDepassivationOccurred).toBe(false);
    expect(assessment.permeabilityMultiplier).toBeCloseTo(1.0, 1);
  });

  it('flags CRITICAL_SPALLING_RISK when severe acid leaching and crack density depassivate rebar', () => {
    const input: CoolingTowerInspectionInput = {
      exposureYears: 35,
      nominalConcreteCoverMm: 40.0,
      ambientCo2Ppm: 650.0,
      sulfuricAcidDepositionRateGPerM2Yr: 45.0,
      observedMicrocrackDensityPerM2: 25.0,
      meanCrackWidthMm: 0.35,
    };

    const assessment = scanner.evaluateShellDegradation(input);
    expect(assessment.structuralSeverityLevel).toBe('CRITICAL_SPALLING_RISK');
    expect(assessment.rebarDepassivationOccurred).toBe(true);
    expect(assessment.effectiveResidualCoverMm).toBeLessThanOrEqual(0.0);
    expect(assessment.remediationRecommendation).toContain('cathodic protection');
  });

  it('detects moderate degradation and crack-induced accelerated permeability', () => {
    const input: CoolingTowerInspectionInput = {
      exposureYears: 15,
      nominalConcreteCoverMm: 45.0,
      ambientCo2Ppm: 500.0,
      sulfuricAcidDepositionRateGPerM2Yr: 8.0,
      observedMicrocrackDensityPerM2: 8.0,
      meanCrackWidthMm: 0.20,
    };

    const assessment = scanner.evaluateShellDegradation(input);
    expect(assessment.structuralSeverityLevel).toBe('MODERATE');
    expect(assessment.permeabilityMultiplier).toBeGreaterThan(1.2);
    expect(assessment.remediationRecommendation).toContain('elastomeric polyurethane resin');
  });
});
