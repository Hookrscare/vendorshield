/**
 * wind-turbine-blade-phased-array-profiler.test.ts
 * Unit test suite for SNAP-63: Wind Turbine Blade Ultrasonic Phased Array Profiler.
 */

import { describe, it, expect } from 'vitest';
import { 
  WindTurbineBladePhasedArrayProfiler, 
  UltrasonicScanPoint 
} from './wind-turbine-blade-phased-array-profiler';

describe('SNAP-63: WindTurbineBladePhasedArrayProfiler', () => {
  const profiler = new WindTurbineBladePhasedArrayProfiler();

  it('correctly identifies nominal composite skin with normal backwall reflection', () => {
    // Nominal GFRP skin thickness = 20mm. Speed = 2850 m/s = 2.85 mm/us.
    // Full backwall travel time = (2 * 20) / 2.85 = 14.035 us.
    const nominalPoint: UltrasonicScanPoint = {
      pointId: 'SCAN-PT-001',
      spanwisePositionMeters: 15.0,
      chordwisePositionPercent: 30.0,
      material: 'GFRP_SKIN',
      nominalThicknessMm: 20.0,
      timeOfFlightMicroseconds: 14.0,
      echoAmplitudePercentFsh: 95.0,
      phaseInversionDetected: false,
    };

    const result = profiler.evaluateScanPoint(nominalPoint);
    expect(result.isDefect).toBe(false);
    expect(result.criticalityTier).toBe('NORMAL');
    expect(result.defectType).toBe('NONE');
    expect(result.estimatedDepthMm).toBeCloseTo(19.95, 1);
  });

  it('flags Category 3 Critical Shutdown for delamination inside main CFRP spar cap', () => {
    // CFRP spar cap nominal thickness = 35mm. Speed = 3050 m/s = 3.05 mm/us.
    // Early reflection at 8.0 us corresponds to depth = (3.05 * 8) / 2 = 12.2mm.
    const sparCapDefect: UltrasonicScanPoint = {
      pointId: 'SCAN-PT-002',
      spanwisePositionMeters: 22.5,
      chordwisePositionPercent: 40.0,
      material: 'CFRP_SPAR_CAP',
      nominalThicknessMm: 35.0,
      timeOfFlightMicroseconds: 8.0,
      echoAmplitudePercentFsh: 85.0,
      phaseInversionDetected: true,
    };

    const result = profiler.evaluateScanPoint(sparCapDefect);
    expect(result.isDefect).toBe(true);
    expect(result.defectType).toBe('SPAR_CAP_SPLITTING');
    expect(result.criticalityTier).toBe('CATEGORY_3_CRITICAL_SHUTDOWN');
    expect(result.estimatedDepthMm).toBe(12.2);
  });

  it('generates an end-to-end blade summary and recommends turbine shutdown on critical flaw', () => {
    const scans: UltrasonicScanPoint[] = [
      {
        pointId: 'P1',
        spanwisePositionMeters: 10.0,
        chordwisePositionPercent: 20.0,
        material: 'GFRP_SKIN',
        nominalThicknessMm: 15.0,
        timeOfFlightMicroseconds: 10.5,
        echoAmplitudePercentFsh: 90.0,
        phaseInversionDetected: false,
      },
      {
        pointId: 'P2',
        spanwisePositionMeters: 18.0,
        chordwisePositionPercent: 45.0,
        material: 'CFRP_SPAR_CAP',
        nominalThicknessMm: 40.0,
        timeOfFlightMicroseconds: 10.0, // Early reflection (depth ~15.25mm)
        echoAmplitudePercentFsh: 90.0,
        phaseInversionDetected: true,
      },
    ];

    const summary = profiler.generateBladeInspectionSummary('WTG-B07-BLD-3', scans, 25.0);
    expect(summary.totalPointsScanned).toBe(2);
    expect(summary.defectCount).toBe(1);
    expect(summary.immediateTurbineShutdownRecommended).toBe(true);
    expect(summary.iec61400ComplianceStatus).toBe('NON_CONFORMANT_SHUTDOWN');
    expect(summary.inspectionTokenSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
