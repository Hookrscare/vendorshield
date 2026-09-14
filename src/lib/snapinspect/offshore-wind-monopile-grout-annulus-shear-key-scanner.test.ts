/**
 * SNAP-91: Offshore Wind Monopile Grout Annulus Shear Key Scanner Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  OffshoreWindMonopileGroutAnnulusShearKeyScanner,
  MonopileShearKeyConfig,
  ShearKeyScanPoint,
} from './offshore-wind-monopile-grout-annulus-shear-key-scanner';

describe('OffshoreWindMonopileGroutAnnulusShearKeyScanner (SNAP-91)', () => {
  const baseConfig: MonopileShearKeyConfig = {
    monopileDiameterM: 8.5,
    annulusThicknessMm: 120,
    nominalShearKeyCount: 12,
    designShearCapacityKn: 45000,
    maxAllowableDebondedArcDeg: 35.0,
  };

  it('validates intact shear keys and full DNV compliance under healthy bond conditions', () => {
    const intactScans: ShearKeyScanPoint[] = [
      {
        keyId: 'K-01',
        elevationM: -12.0,
        circumferentialAngleDeg: 0,
        measuredKeyHeightMm: 10.0,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.25, // Strong acoustic transmission into grout
        reverberationEchoCount: 1,
        shearStressMpa: 15.0,
        compressiveStrengthMpa: 110.0,
      },
      {
        keyId: 'K-02',
        elevationM: -12.0,
        circumferentialAngleDeg: 90,
        measuredKeyHeightMm: 9.8,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.30,
        reverberationEchoCount: 1,
        shearStressMpa: 16.0,
        compressiveStrengthMpa: 110.0,
      },
      {
        keyId: 'K-03',
        elevationM: -12.0,
        circumferentialAngleDeg: 180,
        measuredKeyHeightMm: 10.1,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.28,
        reverberationEchoCount: 1,
        shearStressMpa: 14.5,
        compressiveStrengthMpa: 110.0,
      },
      {
        keyId: 'K-04',
        elevationM: -12.0,
        circumferentialAngleDeg: 270,
        measuredKeyHeightMm: 9.9,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.32,
        reverberationEchoCount: 2,
        shearStressMpa: 17.0,
        compressiveStrengthMpa: 110.0,
      },
    ];

    const report = OffshoreWindMonopileGroutAnnulusShearKeyScanner.evaluateShearKeys(
      baseConfig,
      intactScans
    );

    expect(report.totalPointsScanned).toBe(4);
    expect(report.debondedPointsCount).toBe(0);
    expect(report.debondedRatioPct).toBe(0);
    expect(report.dnvComplianceStatus).toBe('COMPLIANT');
    expect(report.recommendedRemediation).toBe('CONTINUE_NORMAL_OPERATION');
    expect(report.capacityRetentionPct).toBeGreaterThan(30); // fraction of total structure design capacity
  });

  it('triggers emergency shutdown and regrout when continuous debonded arc exceeds DNV limit', () => {
    // 4 contiguous shear key scan points spanning 45 degrees debonded with seawater ingress
    const criticalScans: ShearKeyScanPoint[] = [
      {
        keyId: 'K-01',
        elevationM: -14.0,
        circumferentialAngleDeg: 0,
        measuredKeyHeightMm: 6.0, // Significant mechanical wear / crushing
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.88, // Severe debonding
        reverberationEchoCount: 6, // Seawater ingress
        shearStressMpa: 85.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-02',
        elevationM: -14.0,
        circumferentialAngleDeg: 15,
        measuredKeyHeightMm: 5.8,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.91,
        reverberationEchoCount: 7,
        shearStressMpa: 90.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-03',
        elevationM: -14.0,
        circumferentialAngleDeg: 30,
        measuredKeyHeightMm: 5.5,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.89,
        reverberationEchoCount: 6,
        shearStressMpa: 88.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-04',
        elevationM: -14.0,
        circumferentialAngleDeg: 45,
        measuredKeyHeightMm: 6.2,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.86,
        reverberationEchoCount: 5,
        shearStressMpa: 82.0,
        compressiveStrengthMpa: 100.0,
      },
    ];

    const report = OffshoreWindMonopileGroutAnnulusShearKeyScanner.evaluateShearKeys(
      baseConfig,
      criticalScans
    );

    expect(report.debondedPointsCount).toBe(4);
    expect(report.debondedRatioPct).toBe(100.0);
    expect(report.maxContinuousDebondedArcDeg).toBeGreaterThanOrEqual(35.0);
    expect(report.dnvComplianceStatus).toBe('CRITICAL_FAILURE_NON_COMPLIANT');
    expect(report.recommendedRemediation).toBe('EMERGENCY_SHUTDOWN_AND_REGROUT');
    expect(report.evaluatedPoints[0].seawaterIngressDetected).toBe(true);
    expect(report.evaluatedPoints[0].crushingRisk).toBe('HIGH');
  });

  it('triggers warning and operational derating when moderate isolated debonding occurs', () => {
    // 1 debonded point out of 4 (25% debonded, arc < max allowable)
    const moderateScans: ShearKeyScanPoint[] = [
      {
        keyId: 'K-01',
        elevationM: -10.0,
        circumferentialAngleDeg: 0,
        measuredKeyHeightMm: 9.5,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.80, // Debonded
        reverberationEchoCount: 2,
        shearStressMpa: 30.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-02',
        elevationM: -10.0,
        circumferentialAngleDeg: 90,
        measuredKeyHeightMm: 9.8,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.25,
        reverberationEchoCount: 1,
        shearStressMpa: 20.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-03',
        elevationM: -10.0,
        circumferentialAngleDeg: 180,
        measuredKeyHeightMm: 9.9,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.22,
        reverberationEchoCount: 1,
        shearStressMpa: 20.0,
        compressiveStrengthMpa: 100.0,
      },
      {
        keyId: 'K-04',
        elevationM: -10.0,
        circumferentialAngleDeg: 270,
        measuredKeyHeightMm: 9.7,
        nominalKeyHeightMm: 10.0,
        acousticReflectionCoefficient: 0.28,
        reverberationEchoCount: 1,
        shearStressMpa: 20.0,
        compressiveStrengthMpa: 100.0,
      },
    ];

    const report = OffshoreWindMonopileGroutAnnulusShearKeyScanner.evaluateShearKeys(
      baseConfig,
      moderateScans
    );

    expect(report.debondedPointsCount).toBe(1);
    expect(report.debondedRatioPct).toBe(25.0);
    expect(report.dnvComplianceStatus).toBe('WARNING_MONITORING_REQUIRED');
    expect(report.recommendedRemediation).toBe('DERATE_TURBINE_AND_MONITOR');
  });
});
