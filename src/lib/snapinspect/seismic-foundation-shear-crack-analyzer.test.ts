/**
 * src/lib/snapinspect/seismic-foundation-shear-crack-analyzer.test.ts
 * Unit tests for SNAP-36: Seismic Foundation Shear Crack Structural Degradation Rate Estimator.
 */

import { describe, it, expect } from 'vitest';
import {
  SeismicFoundationShearCrackAnalyzer,
  FoundationCrackInput
} from './seismic-foundation-shear-crack-analyzer';

describe('SNAP-36: SeismicFoundationShearCrackAnalyzer', () => {
  const analyzer = new SeismicFoundationShearCrackAnalyzer();

  it('should identify stable hairline cosmetic cracks with low remediation takeoff', () => {
    const hairlineInput: FoundationCrackInput = {
      crackId: 'CRACK_STEM_001',
      elementLocation: 'STEM_WALL',
      crackType: 'VERTICAL_SHRINKAGE',
      crackLengthMeters: 1.2,
      wallSpanLengthMeters: 8.0,
      maxDifferentialSettlementMm: 2.0,
      rebarCorrosionObserved: false,
      epochs: [
        { timestampIso: '2025-01-01T00:00:00Z', crackWidthMm: 0.15 },
        { timestampIso: '2026-01-01T00:00:00Z', crackWidthMm: 0.16 }
      ]
    };

    const res = analyzer.analyzeCrack(hairlineInput);
    expect(res.hazardClassification).toBe('NEGLIGIBLE_HAIRLINE');
    expect(res.actionRequired).toBe('MONITOR_PERIODICALLY');
    expect(res.takeoff.cfrpStitchingStrapCount).toBe(0);
    expect(res.takeoff.helicalUnderpinningPilesCount).toBe(0);
    expect(res.auditHash).toMatch(/^FEMA-P154-CRACK-[A-F0-9]{16}$/);
  });

  it('should classify active expanding shear crack as severe requiring CFRP stitches', () => {
    const severeInput: FoundationCrackInput = {
      crackId: 'CRACK_DIAG_SHEAR_04',
      elementLocation: 'GRADE_BEAM',
      crackType: 'DIAGONAL_SHEAR',
      crackLengthMeters: 2.8,
      wallSpanLengthMeters: 6.0,
      maxDifferentialSettlementMm: 12.0,
      rebarCorrosionObserved: true,
      epochs: [
        { timestampIso: '2025-01-01T00:00:00Z', crackWidthMm: 1.1 },
        { timestampIso: '2025-07-01T00:00:00Z', crackWidthMm: 1.6 },
        { timestampIso: '2026-01-01T00:00:00Z', crackWidthMm: 2.2 }
      ]
    };

    const res = analyzer.analyzeCrack(severeInput);
    expect(res.currentCrackWidthMm).toBe(2.2);
    expect(res.crackGrowthRateMmPerYear).toBeGreaterThan(1.0);
    expect(res.hazardClassification).toBe('SEVERE_STRUCTURAL_SHEAR');
    expect(res.actionRequired).toBe('STRUCTURAL_CFRP_STITCHING');
    expect(res.takeoff.cfrpStitchingStrapCount).toBeGreaterThanOrEqual(9);
    expect(res.takeoff.estimatedMaterialCostUsd).toBeGreaterThan(1000);
  });

  it('should trigger emergency shoring and underpinning for massive structural settlement failure', () => {
    const failureInput: FoundationCrackInput = {
      crackId: 'CRACK_FAILURE_99',
      elementLocation: 'STEM_WALL',
      crackType: 'DIAGONAL_SHEAR',
      crackLengthMeters: 4.5,
      wallSpanLengthMeters: 10.0,
      maxDifferentialSettlementMm: 75.0, // High angular distortion > 1/150
      rebarCorrosionObserved: true,
      epochs: [
        { timestampIso: '2026-01-01T00:00:00Z', crackWidthMm: 6.5 }
      ]
    };

    const res = analyzer.analyzeCrack(failureInput);
    expect(res.hazardClassification).toBe('CRITICAL_COLLAPSE_HAZARD');
    expect(res.actionRequired).toBe('EMERGENCY_SHORING_AND_UNDERPINNING');
    expect(res.takeoff.helicalUnderpinningPilesCount).toBeGreaterThanOrEqual(4);
    expect(res.takeoff.estimatedMaterialCostUsd).toBeGreaterThan(8000);
  });
});
