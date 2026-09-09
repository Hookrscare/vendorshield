/**
 * src/lib/snapinspect/concrete-microfracture-acoustic-emission-triangulator.test.ts
 * Unit tests for SNAP-38: Multi-Sensor Structural Vibration Concrete Micro-Fracture Acoustic Emission Triangulator.
 */

import { describe, it, expect } from 'vitest';
import {
  ConcreteMicroFractureAETriangulator,
  SensorCoordinate,
  MicroFractureEvent
} from './concrete-microfracture-acoustic-emission-triangulator';

describe('SNAP-38: ConcreteMicroFractureAETriangulator', () => {
  const sensorArray: SensorCoordinate[] = [
    { sensorId: 'AE_S1', xMeters: 0.0, yMeters: 0.0, zMeters: 0.0 },
    { sensorId: 'AE_S2', xMeters: 5.0, yMeters: 0.0, zMeters: 0.0 },
    { sensorId: 'AE_S3', xMeters: 5.0, yMeters: 5.0, zMeters: 0.0 },
    { sensorId: 'AE_S4', xMeters: 0.0, yMeters: 5.0, zMeters: 0.0 }
  ];

  const triangulator = new ConcreteMicroFractureAETriangulator(sensorArray);

  it('should calculate realistic Ib-value and identify benign elastic micro-cracking', () => {
    const benignEvent: MicroFractureEvent = {
      eventId: 'EV_MICRO_01',
      hits: [
        { hitId: 'H1', sensorId: 'AE_S1', arrivalTimestampMicroseconds: 100, peakAmplitudeDb: 42, durationMicroseconds: 50, energyCounts: 12 },
        { hitId: 'H2', sensorId: 'AE_S2', arrivalTimestampMicroseconds: 500, peakAmplitudeDb: 38, durationMicroseconds: 40, energyCounts: 8 },
        { hitId: 'H3', sensorId: 'AE_S4', arrivalTimestampMicroseconds: 520, peakAmplitudeDb: 35, durationMicroseconds: 35, energyCounts: 7 }
      ]
    };

    const res = triangulator.triangulateEvent(benignEvent);
    expect(res.eventId).toBe('EV_MICRO_01');
    expect(res.ibValue).toBeGreaterThan(1.0);
    expect(res.structuralDamageState).toBe('ELASTIC_MICRO_CRACKING');
    expect(res.remediationAction).toBe('PASSIVE_MONITORING');
    expect(res.auditHash).toMatch(/^ASTM-E1316-AE-[A-F0-9]{16}$/);
  });

  it('should localize fracture near the primary sensor and flag critical macro-fracture for high amplitude events', () => {
    // High energy acoustic emission event near sensor S2 (x=5.0, y=0.0)
    const severeEvent: MicroFractureEvent = {
      eventId: 'EV_MACRO_YIELD_09',
      hits: [
        { hitId: 'H10', sensorId: 'AE_S2', arrivalTimestampMicroseconds: 20, peakAmplitudeDb: 89, durationMicroseconds: 800, energyCounts: 350 },
        { hitId: 'H11', sensorId: 'AE_S3', arrivalTimestampMicroseconds: 1250, peakAmplitudeDb: 72, durationMicroseconds: 400, energyCounts: 120 },
        { hitId: 'H12', sensorId: 'AE_S1', arrivalTimestampMicroseconds: 1300, peakAmplitudeDb: 68, durationMicroseconds: 350, energyCounts: 95 },
        { hitId: 'H13', sensorId: 'AE_S4', arrivalTimestampMicroseconds: 2100, peakAmplitudeDb: 55, durationMicroseconds: 200, energyCounts: 40 }
      ]
    };

    const res = triangulator.triangulateEvent(severeEvent);
    expect(res.estimatedCoordinates.x).toBeGreaterThan(3.0); // Biased toward AE_S2
    expect(res.estimatedCoordinates.y).toBeLessThan(2.0);
    expect(res.structuralDamageState).toBe('CRITICAL_MACRO_FRACTURE');
    expect(res.remediationAction).toBe('POST_TENSION_CFRP_CONFINEMENT');
    expect(res.localizationConfidencePct).toBeGreaterThanOrEqual(95.0);
  });
});
