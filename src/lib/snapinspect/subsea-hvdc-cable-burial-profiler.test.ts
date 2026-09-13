import { describe, it, expect } from 'vitest';
import {
  SubseaHvdcCableBurialProfiler,
  MagnetometerReading,
  CableBurialSpec,
} from './subsea-hvdc-cable-burial-profiler';

describe('SNAP-63: SubseaHvdcCableBurialProfiler Tests', () => {
  const profiler = new SubseaHvdcCableBurialProfiler();

  const spec: CableBurialSpec = {
    cableCurrentAmps: 1000.0, // 1kA HVDC transmission
    nominalBurialDepthMeters: 1.5,
    minPermittedBurialDepthMeters: 1.0,
  };

  it('correctly calculates compliant depth of burial across nominal trench', () => {
    // For 1000A at distance r = 2.5m (ROV alt 1.0m + DoB 1.5m):
    // B = (4pi*1e-7 * 1000) / (2pi * 2.5) = 2e-7 / 2.5 * 1000 = 8e-5 T = 80,000 nT
    const readings: MagnetometerReading[] = [
      {
        chainageKilometers: 10.0,
        rovAltitudeMeters: 1.0,
        magneticFieldCenterNt: 80000,
        magneticFieldLeftNt: 80000,
        magneticFieldRightNt: 80000,
      },
      {
        chainageKilometers: 10.05,
        rovAltitudeMeters: 1.0,
        magneticFieldCenterNt: 80000,
        magneticFieldLeftNt: 80000,
        magneticFieldRightNt: 80000,
      },
    ];

    const report = profiler.evaluateBurialSurvey(readings, spec);
    expect(report.overallCompliancePass).toBe(true);
    expect(report.averageBurialDepthMeters).toBeCloseTo(1.5, 1);
    expect(report.exposedSectionCount).toBe(0);
    expect(report.profilePoints[0].burialStatus).toBe('COMPLIANT');
  });

  it('detects cable seabed exposure free span hazard', () => {
    // If cable is on seabed (DoB = 0m) and ROV alt is 1.0m:
    // r = 1.0m -> B = (2e-7 * 1000) / 1.0 = 2e-4 T = 200,000 nT
    const exposedReadings: MagnetometerReading[] = [
      {
        chainageKilometers: 12.4,
        rovAltitudeMeters: 1.0,
        magneticFieldCenterNt: 200000,
        magneticFieldLeftNt: 200000,
        magneticFieldRightNt: 200000,
      },
    ];

    const report = profiler.evaluateBurialSurvey(exposedReadings, spec);
    expect(report.overallCompliancePass).toBe(false);
    expect(report.exposedSectionCount).toBe(1);
    expect(report.profilePoints[0].burialStatus).toBe('EXPOSED_FREE_SPAN');
    expect(report.profilePoints[0].isExposedOnSeabed).toBe(true);
  });

  it('flags shallow burial risk under threshold', () => {
    // If cable has shallow burial DoB = 0.5m (< 1.0m min):
    // r = 1.0 + 0.5 = 1.5m -> B = 2e-4 / 1.5 = 133,333 nT
    const shallowReadings: MagnetometerReading[] = [
      {
        chainageKilometers: 14.2,
        rovAltitudeMeters: 1.0,
        magneticFieldCenterNt: 133333,
        magneticFieldLeftNt: 133333,
        magneticFieldRightNt: 133333,
      },
    ];

    const report = profiler.evaluateBurialSurvey(shallowReadings, spec);
    expect(report.shallowRiskSectionCount).toBe(1);
    expect(report.profilePoints[0].burialStatus).toBe('SHALLOW_BURIAL_RISK');
  });
});
