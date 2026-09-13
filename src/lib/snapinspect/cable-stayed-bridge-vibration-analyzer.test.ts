import { describe, it, expect } from 'vitest';
import {
  CableStayedBridgeVibrationAnalyzer,
  StayCableGeometry,
  CableVibrationTelemetry,
} from './cable-stayed-bridge-vibration-analyzer';

describe('SNAP-58: CableStayedBridgeVibrationAnalyzer Tests', () => {
  const analyzer = new CableStayedBridgeVibrationAnalyzer();

  const standardCable: StayCableGeometry = {
    cableId: 'STAY-CABLE-S14',
    lengthMeters: 120.0,       // 120 meters
    massPerMeterKg: 45.0,      // 45 kg/m
    diameterMeters: 0.18,      // 180 mm HDPE pipe
  };

  it('accurately calculates cable tension from natural harmonic frequencies', () => {
    // For L=120, m=45, if T ~ 2,592 kN:
    // f1 = 1/(2*120) * sqrt(2,592,000 / 45) = 1/240 * sqrt(57600) = 240 / 240 = 1.00 Hz
    const frequencies = [1.0, 2.0, 3.0, 4.0];
    const tensionKN = analyzer.estimateCableTension(standardCable, frequencies);
    expect(tensionKN).toBeCloseTo(2592, 0);
  });

  it('detects critical VIO lock-in and flags damper intervention when Scruton number is low and wind excites resonance', () => {
    // Cable diameter D = 0.18m.
    // St = 0.20.
    // Let ambient wind U = 0.9 / 0.20 = 4.5 m/s -> shedding frequency fs = (0.20 * 4.5) / 0.18 = 5.0 Hz
    // With modal frequencies including 5.0 Hz:
    const telemetry: CableVibrationTelemetry = {
      modalFrequenciesHz: [1.0, 2.0, 3.0, 4.0, 5.0],
      dampingRatioZeta: 0.0005, // Very low damping -> low Scruton number
      ambientWindSpeedMps: 4.5, // 4.5 m/s wind generates 5.0 Hz vortex shedding
    };

    const result = analyzer.evaluateStayCable(standardCable, telemetry);
    expect(result.vortexLockinRisk).toBe('CRITICAL_VIO_LOCKIN');
    expect(result.damperInterventionRequired).toBe(true);
    expect(result.recommendedMaintenance).toContain('ACTIVATE_MR_MAGNETORHEOLOGICAL_EXTERNAL_DAMPERS');
  });

  it('reports negligible aerodynamic risk under well-damped, non-resonant flow', () => {
    const telemetry: CableVibrationTelemetry = {
      modalFrequenciesHz: [1.0, 2.0, 3.0, 4.0],
      dampingRatioZeta: 0.015,  // Good damping (1.5%)
      ambientWindSpeedMps: 22.0, // High wind, shedding fs = (0.2 * 22) / 0.18 = 24.4 Hz (far above harmonics)
    };

    const result = analyzer.evaluateStayCable(standardCable, telemetry);
    expect(result.vortexLockinRisk).toBe('NEGLIGIBLE');
    expect(result.damperInterventionRequired).toBe(false);
    expect(result.scrutonNumber).toBeGreaterThan(10);
  });
});
