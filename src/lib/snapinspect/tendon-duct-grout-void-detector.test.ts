import { describe, it, expect } from 'vitest';
import {
  TendonDuctGroutVoidDetector,
  ConcreteAcousticProperties,
  ImpactEchoSounding
} from './tendon-duct-grout-void-detector';

describe('SNAP-62: PCRPV Tendon Duct Grouting Void Detector', () => {
  const nuclearWall: ConcreteAcousticProperties = {
    pWaveVelocityMPerSec: 4000,     // 4000 m/s
    concreteThicknessMeters: 1.5,   // 1.5m solid wall -> solid freq = (0.96 * 4000) / (2 * 1.5) = 1.28 kHz
    ductNominalDepthMeters: 0.25,   // 0.25m duct depth -> void freq = (0.96 * 4000) / (2 * 0.25) = 7.68 kHz
    geometricFactorBeta: 0.96
  };

  it('classifies fully grouted tendon sections with transmission through wall thickness', () => {
    const soundings: ImpactEchoSounding[] = [
      {
        stationId: 'st_01',
        ductLinearPositionMeters: 2.0,
        dominantFrequencyKhz: 1.28,
        peakAmplitudeDb: 18.0
      },
      {
        stationId: 'st_02',
        ductLinearPositionMeters: 4.0,
        dominantFrequencyKhz: 1.30,
        peakAmplitudeDb: 17.5
      }
    ];

    const report = TendonDuctGroutVoidDetector.evaluateDuct('DUCT-H-04', nuclearWall, soundings);

    expect(report.containmentIntegrityStatus).toBe('COMPLIANT');
    expect(report.voidLocationsCount).toBe(0);
    expect(report.soundingsAssessment[0].condition).toBe('FULLY_GROUTED');
    expect(report.soundingsAssessment[0].repairRequired).toBe(false);
  });

  it('detects critical air voids and issues vacuum-assisted grout injection repair order', () => {
    const soundings: ImpactEchoSounding[] = [
      {
        stationId: 'st_05',
        ductLinearPositionMeters: 10.0,
        dominantFrequencyKhz: 7.65, // Strong early reflection off duct at 0.25m depth
        peakAmplitudeDb: 32.0       // High resonance amplitude due to air boundary
      }
    ];

    const report = TendonDuctGroutVoidDetector.evaluateDuct('DUCT-H-04', nuclearWall, soundings);

    expect(report.containmentIntegrityStatus).toBe('REPAIR_INTERVENTION_MANDATORY');
    expect(report.voidLocationsCount).toBe(1);
    expect(report.soundingsAssessment[0].condition).toBe('CRITICAL_AIR_VOID');
    expect(report.soundingsAssessment[0].groutVoidSeverityIndex).toBeGreaterThan(0.8);
    expect(report.recommendedRepairs[0]).toContain('VACUUM_GROUT_INJECTION');
  });
});
