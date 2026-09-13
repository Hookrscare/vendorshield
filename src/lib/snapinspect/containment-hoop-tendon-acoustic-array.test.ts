/**
 * src/lib/snapinspect/containment-hoop-tendon-acoustic-array.test.ts
 * Unit tests for SNAP-73 Pre-Stressed Containment Vessel Hoop Tendon Acoustic Emission Array.
 */

import { describe, it, expect } from 'vitest';
import {
  ContainmentHoopTendonAcousticArray,
  type TendonArrayAnalysisInput,
  type AcousticEmissionEvent
} from './containment-hoop-tendon-acoustic-array';

describe('ContainmentHoopTendonAcousticArray (SNAP-73)', () => {
  it('should classify baseline quiet vessel as INTACT_TENDON_GRID', () => {
    const input: TendonArrayAnalysisInput = {
      vesselId: 'CV-REACTOR-UNIT-2',
      hoopElevationMeters: 42.5,
      designPrestressMpa: 1200,
      currentAppliedLoadRatio: 0.8,
      previousMaxLoadRatio: 1.0,
      events: []
    };

    const result = ContainmentHoopTendonAcousticArray.analyzeAcousticEmissions(input);
    expect(result.damageState).toBe('INTACT_TENDON_GRID');
    expect(result.structuralIntegrityScore).toBe(1.0);
    expect(result.wireBreakEventsCount).toBe(0);
    expect(result.kaiserEffectViolated).toBe(false);
  });

  it('should detect critical wire rupture event with high energy and fast rise time', () => {
    const ruptureEvent: AcousticEmissionEvent = {
      channelId: 'CH-NORTH-RING-04',
      timestampUs: 1726245000000,
      peakAmplitudeDb: 92,
      riseTimeUs: 12,
      durationUs: 450,
      energyEu: 18500,
      frequencyCentroidKhz: 180
    };

    const input: TendonArrayAnalysisInput = {
      vesselId: 'CV-REACTOR-UNIT-2',
      hoopElevationMeters: 42.5,
      designPrestressMpa: 1200,
      currentAppliedLoadRatio: 1.05,
      previousMaxLoadRatio: 1.0,
      events: [ruptureEvent]
    };

    const result = ContainmentHoopTendonAcousticArray.analyzeAcousticEmissions(input);
    expect(result.damageState).toBe('CRITICAL_HOOP_TENDON_WIRE_RUPTURE');
    expect(result.wireBreakEventsCount).toBe(1);
    expect(result.structuralIntegrityScore).toBeLessThan(0.6);
    expect(result.recommendedAction).toContain('EMERGENCY');
  });

  it('should detect fretting when low-energy friction pulses exceed threshold', () => {
    const frettingEvents: AcousticEmissionEvent[] = Array.from({ length: 15 }, (_, i) => ({
      channelId: `CH-WEST-${i}`,
      timestampUs: 1726245000000 + i * 1000,
      peakAmplitudeDb: 52,
      riseTimeUs: 85,
      durationUs: 800,
      energyEu: 600,
      frequencyCentroidKhz: 95
    }));

    const input: TendonArrayAnalysisInput = {
      vesselId: 'LNG-TANK-A3',
      hoopElevationMeters: 18.0,
      designPrestressMpa: 950,
      currentAppliedLoadRatio: 0.95,
      previousMaxLoadRatio: 0.95,
      events: frettingEvents
    };

    const result = ContainmentHoopTendonAcousticArray.analyzeAcousticEmissions(input);
    expect(result.damageState).toBe('SUSPECT_FRICTION_FRETTING');
    expect(result.structuralIntegrityScore).toBe(0.88);
  });
});
