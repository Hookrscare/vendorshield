/**
 * SNAP-23 Unit Tests: LiDAR Structural Load & Beam Deflection Scanner.
 */

import { describe, it, expect } from 'vitest';
import { BeamDeflectionScanner, BeamDeflectionScanInput } from './beam-deflection-scanner';

describe('SNAP-23: BeamDeflectionScanner', () => {
  it('correctly calculates deflection and verifies compliance for rigid steel beam', () => {
    // 6000mm span with 10mm mid-span sag
    const input: BeamDeflectionScanInput = {
      beamId: 'BEAM-STEEL-01',
      material: 'STRUCTURAL_STEEL_W_BEAM',
      spanLengthMm: 6000,
      standard: 'TOTAL_LOAD_L_240',
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 3000 },
        { positionMm: 1500, elevationMm: 2993 },
        { positionMm: 3000, elevationMm: 2990 }, // 10mm sag
        { positionMm: 4500, elevationMm: 2993 },
        { positionMm: 6000, elevationMm: 3000 },
      ],
    };

    const result = BeamDeflectionScanner.analyzeBeamScan(input);

    expect(result.spanLengthMm).toBe(6000);
    expect(result.maxDeflectionMm).toBe(10.0);
    expect(result.allowableDeflectionMm).toBe(25.0); // 6000 / 240 = 25mm
    expect(result.severity).toBe('PASS_WITHIN_CODE');
    expect(result.utilizationRatio).toBe(0.4);
  });

  it('flags CRITICAL_OVERLOAD_FAILURE_RISK when deflection severely exceeds code limit', () => {
    // 6000mm span with 45mm mid-span sag (allowable 25mm, 45/25 = 1.8 > 1.5)
    const input: BeamDeflectionScanInput = {
      beamId: 'BEAM-STEEL-FAIL',
      material: 'STRUCTURAL_STEEL_W_BEAM',
      spanLengthMm: 6000,
      standard: 'TOTAL_LOAD_L_240',
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 3000 },
        { positionMm: 3000, elevationMm: 2955 }, // 45mm sag
        { positionMm: 6000, elevationMm: 3000 },
      ],
    };

    const result = BeamDeflectionScanner.analyzeBeamScan(input);

    expect(result.maxDeflectionMm).toBe(45.0);
    expect(result.severity).toBe('CRITICAL_OVERLOAD_FAILURE_RISK');
    expect(result.recommendedAction).toContain('Immediate emergency shoring');
  });

  it('supports engineered glulam timber material and L_360 limit', () => {
    const input: BeamDeflectionScanInput = {
      beamId: 'BEAM-GLULAM-01',
      material: 'GLULAM_TIMBER',
      spanLengthMm: 3600,
      standard: 'FLOOR_LIVE_LOAD_L_360',
      measuredElevationProfileMm: [
        { positionMm: 0, elevationMm: 2500 },
        { positionMm: 1800, elevationMm: 2488 }, // 12mm sag (allowable 3600/360 = 10mm)
        { positionMm: 3600, elevationMm: 2500 },
      ],
    };

    const result = BeamDeflectionScanner.analyzeBeamScan(input);

    expect(result.spanLengthMm).toBe(3600);
    expect(result.allowableDeflectionMm).toBe(10.0);
    expect(result.maxDeflectionMm).toBe(12.0);
    expect(result.severity).toBe('CODE_VIOLATION_EXCESSIVE_SAG');
  });
});
