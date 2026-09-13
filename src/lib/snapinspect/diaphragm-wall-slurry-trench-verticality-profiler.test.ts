import { describe, it, expect } from 'vitest';
import {
  DiaphragmWallSlurryTrenchVerticalityProfiler,
  SlurryProperties,
  UltrasonicProbeReading
} from './diaphragm-wall-slurry-trench-verticality-profiler';

describe('SNAP-60: Diaphragm Wall Slurry Trench Ultrasonic Hydrophone Verticality Profiler', () => {
  const bentoniteSlurry: SlurryProperties = {
    slurryType: 'BENTONITE',
    densityGPerCm3: 1.15, // 1.15 g/cm3
    sandContentPercent: 1.5 // 1.5%
  };

  it('corrects ultrasonic sonic velocity for bentonite slurry density and suspended sand', () => {
    const sonicSpeed = DiaphragmWallSlurryTrenchVerticalityProfiler.calculateSlurryAcousticVelocity(bentoniteSlurry);
    // Base 1482 + 0.15 * 350 (52.5) + 1.5 * 12 (18) = ~ 1552.5 m/s
    expect(sonicSpeed).toBeGreaterThan(1500);
    expect(sonicSpeed).toBeLessThan(1600);
  });

  it('validates compliant diaphragm wall trench adhering to EN 1538 verticality (<= 0.5%)', () => {
    // Trench nominal 0.8m thickness, drilled to 30m depth
    const readings: UltrasonicProbeReading[] = [
      {
        depthMeters: 5.0,
        travelTimeMicrosecondsNorth: 515, // ~ 0.40m
        travelTimeMicrosecondsSouth: 515, // ~ 0.40m
        travelTimeMicrosecondsEast: 1800,
        travelTimeMicrosecondsWest: 1800
      },
      {
        depthMeters: 15.0,
        travelTimeMicrosecondsNorth: 520,
        travelTimeMicrosecondsSouth: 512,
        travelTimeMicrosecondsEast: 1805,
        travelTimeMicrosecondsWest: 1795
      },
      {
        depthMeters: 30.0,
        travelTimeMicrosecondsNorth: 530,
        travelTimeMicrosecondsSouth: 505,
        travelTimeMicrosecondsEast: 1810,
        travelTimeMicrosecondsWest: 1790
      }
    ];

    const assessment = DiaphragmWallSlurryTrenchVerticalityProfiler.profileTrench(
      0.8,
      2.8,
      bentoniteSlurry,
      readings,
      0.5
    );

    expect(assessment.en1538Compliant).toBe(true);
    expect(assessment.maxDepthMeters).toBe(30.0);
    expect(assessment.maxVerticalityPercent).toBeLessThanOrEqual(0.5);
    expect(assessment.recommendations[0]).toContain('TRENCH_GEOMETRY_OPTIMAL');
  });

  it('detects severe verticality deviation and necking constriction', () => {
    const readings: UltrasonicProbeReading[] = [
      {
        depthMeters: 20.0,
        travelTimeMicrosecondsNorth: 850, // Severe drift to North
        travelTimeMicrosecondsSouth: 200,
        travelTimeMicrosecondsEast: 1800,
        travelTimeMicrosecondsWest: 1800
      },
      {
        depthMeters: 25.0,
        travelTimeMicrosecondsNorth: 300, // Severe necking constriction (total width < 0.5m)
        travelTimeMicrosecondsSouth: 300,
        travelTimeMicrosecondsEast: 1800,
        travelTimeMicrosecondsWest: 1800
      }
    ];

    const assessment = DiaphragmWallSlurryTrenchVerticalityProfiler.profileTrench(
      0.8,
      2.8,
      bentoniteSlurry,
      readings,
      0.5
    );

    expect(assessment.en1538Compliant).toBe(false);
    expect(assessment.recommendations.some(r => r.includes('CORRECTIVE_CHISELING_REQUIRED'))).toBe(true);
    expect(assessment.recommendations.some(r => r.includes('DESAND_AND_REAM'))).toBe(true);
  });
});
