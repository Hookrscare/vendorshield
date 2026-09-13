import { describe, it, expect } from 'vitest';
import {
  BridgeStayAerodynamicDampingAnalyzer,
  StayCableAerodynamicSpec,
  AeroVibrationTelemetry
} from './bridge-stay-aerodynamic-damping-analyzer';

describe('BridgeStayAerodynamicDampingAnalyzer (SNAP-66)', () => {
  const analyzer = new BridgeStayAerodynamicDampingAnalyzer();

  const mockCable: StayCableAerodynamicSpec = {
    cableId: 'CABLE-SOUTH-MAIN-14',
    spanLengthM: 180.0,
    linearMassKgPerM: 52.0,
    outerDiameterM: 0.16,
    fundamentalFreqHz: 0.85,
    damperDistanceM: 5.4 // 3% of span
  };

  it('calculates logarithmic decrement and Scruton number accurately for damped cable', () => {
    // Envelope decaying from 100mm down to 20mm over 10 cycles
    const telemetry: AeroVibrationTelemetry = {
      amplitudeDecaySeriesMm: [100.0, 85.0, 72.0, 61.0, 52.0, 44.0, 37.0, 31.0, 26.0, 22.0, 18.5],
      windSpeedMPerS: 8.0,
      windYawAngleDeg: 15.0,
      rainfallMmPerHour: 0.0
    };

    const res = analyzer.analyze(mockCable, telemetry);

    expect(res.cableId).toBe('CABLE-SOUTH-MAIN-14');
    expect(res.measuredLogDecrement).toBeGreaterThan(0.05);
    expect(res.measuredDampingRatioZeta).toBeGreaterThan(0.01);
    expect(res.scrutonNumber).toBeGreaterThan(10.0);
    expect(res.ptiComplianceSatisfied).toBe(true);
    expect(res.regime).toBe('STABLE_SUFFICIENT_DAMPING');
    expect(res.auditHashToken).toHaveLength(64);
  });

  it('detects rain-wind induced vibration (RWIV) threat when conditions align with low damping', () => {
    const lowDampingTelemetry: AeroVibrationTelemetry = {
      // Very slow decay: 100mm down to 92mm over 10 cycles (delta ~ 0.008)
      amplitudeDecaySeriesMm: [100.0, 99.0, 98.0, 97.0, 96.0, 95.0, 94.0, 93.5, 93.0, 92.5, 92.0],
      windSpeedMPerS: 12.0, // In 6-18 m/s range
      windYawAngleDeg: 45.0, // In 20-60 deg range
      rainfallMmPerHour: 8.5 // Active rain
    };

    const res = analyzer.analyze(mockCable, lowDampingTelemetry);

    expect(res.ptiComplianceSatisfied).toBe(false);
    expect(res.regime).toBe('RWIV_UNSTABLE_RISK');
    expect(res.recommendedActions).toEqual(
      expect.arrayContaining([expect.stringContaining('Rain-Wind Induced Vibration')])
    );
  });

  it('throws descriptive error on invalid inputs', () => {
    const invalidSpec: StayCableAerodynamicSpec = {
      ...mockCable,
      spanLengthM: -10
    };
    const validTelemetry: AeroVibrationTelemetry = {
      amplitudeDecaySeriesMm: [50, 40],
      windSpeedMPerS: 5.0,
      windYawAngleDeg: 0.0,
      rainfallMmPerHour: 0.0
    };

    expect(() => analyzer.analyze(invalidSpec, validTelemetry)).toThrow(
      'Cable geometry parameters (L, m, D) must be strictly positive.'
    );
  });
});
