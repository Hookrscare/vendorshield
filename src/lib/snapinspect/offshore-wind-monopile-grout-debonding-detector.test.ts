import { describe, it, expect } from 'vitest';
import {
  OffshoreWindMonopileGroutDebondingDetector,
  UltrasonicAcousticScanPoint
} from './offshore-wind-monopile-grout-debonding-detector';

describe('SNAP-78: OffshoreWindMonopileGroutDebondingDetector', () => {
  const detector = new OffshoreWindMonopileGroutDebondingDetector();

  it('verifies healthy bonded monopile grout annulus', () => {
    // Healthy bond: incident 10.0V, backwall 6.0V -> reflection ~ 0.60, low reverberation
    const healthyScans: UltrasonicAcousticScanPoint[] = [
      { pointId: 'P01', circumferentialAngleDeg: 0, elevationM: -15, steelThicknessMm: 70, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 6.0, reverberationEchoCount: 1, timeOfFlightMicroSec: 23.7 },
      { pointId: 'P02', circumferentialAngleDeg: 90, elevationM: -15, steelThicknessMm: 70, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 5.9, reverberationEchoCount: 2, timeOfFlightMicroSec: 23.7 },
      { pointId: 'P03', circumferentialAngleDeg: 180, elevationM: -15, steelThicknessMm: 70, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 6.1, reverberationEchoCount: 1, timeOfFlightMicroSec: 23.7 },
      { pointId: 'P04', circumferentialAngleDeg: 270, elevationM: -15, steelThicknessMm: 70, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 5.8, reverberationEchoCount: 1, timeOfFlightMicroSec: 23.7 }
    ];

    const res = detector.evaluateGroutAnnulus(healthyScans);
    expect(res.debondedPointsCount).toBe(0);
    expect(res.debondedAreaPercentage).toBe(0);
    expect(res.structuralIntegrityRating).toBe('INTACT_ACCEPTABLE');
    expect(res.dnvComplianceStatus).toBe('COMPLIANT');
  });

  it('detects critical continuous debonding with water ingress exceeding DNV limits', () => {
    // 5 consecutive debonded points spanning 60 degrees (0 to 60 deg)
    const debondedScans: UltrasonicAcousticScanPoint[] = [
      { pointId: 'P01', circumferentialAngleDeg: 0, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 9.3, reverberationEchoCount: 5, timeOfFlightMicroSec: 22.0 },
      { pointId: 'P02', circumferentialAngleDeg: 15, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 9.2, reverberationEchoCount: 6, timeOfFlightMicroSec: 22.0 },
      { pointId: 'P03', circumferentialAngleDeg: 30, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 9.4, reverberationEchoCount: 5, timeOfFlightMicroSec: 22.0 },
      { pointId: 'P04', circumferentialAngleDeg: 45, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 9.1, reverberationEchoCount: 5, timeOfFlightMicroSec: 22.0 },
      { pointId: 'P05', circumferentialAngleDeg: 60, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 9.2, reverberationEchoCount: 6, timeOfFlightMicroSec: 22.0 },
      { pointId: 'P06', circumferentialAngleDeg: 180, elevationM: -10, steelThicknessMm: 65, incidentAmplitudeV: 10.0, measuredBackwallAmplitudeV: 5.9, reverberationEchoCount: 1, timeOfFlightMicroSec: 22.0 }
    ];

    const res = detector.evaluateGroutAnnulus(debondedScans);
    expect(res.debondedPointsCount).toBe(5);
    expect(res.debondedAreaPercentage).toBeGreaterThan(15.0);
    expect(res.maxContinuousDebondedArcDeg).toBeGreaterThanOrEqual(45.0);
    expect(res.structuralIntegrityRating).toBe('CRITICAL_REPAIR_MANDATORY');
    expect(res.dnvComplianceStatus).toBe('NON_COMPLIANT_STRUCTURAL_RISK');
    expect(res.evaluatedPoints[0].fluidIngressDetected).toBe(true);
  });
});
