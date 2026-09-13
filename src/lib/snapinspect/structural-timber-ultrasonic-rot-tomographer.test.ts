import { describe, it, expect } from 'vitest';
import {
  StructuralTimberUltrasonicRotTomographer,
  UltrasonicChordReading,
} from './structural-timber-ultrasonic-rot-tomographer';

describe('StructuralTimberUltrasonicRotTomographer (SNAP-59)', () => {
  it('correctly classifies sound timber with pristine stress-wave velocities', () => {
    // 300mm diameter Douglas Fir, sound transit time ~ 194 us (v = 1546 m/s)
    const chords: UltrasonicChordReading[] = [
      { chordId: 'CH-0', angleDeg: 0, pathLengthMm: 300, transitTimeUs: 195 },
      { chordId: 'CH-45', angleDeg: 45, pathLengthMm: 300, transitTimeUs: 197 },
      { chordId: 'CH-90', angleDeg: 90, pathLengthMm: 300, transitTimeUs: 194 },
      { chordId: 'CH-135', angleDeg: 135, pathLengthMm: 300, transitTimeUs: 196 },
    ];

    const result = StructuralTimberUltrasonicRotTomographer.analyzeCrossSection(
      'douglas_fir',
      300,
      chords
    );

    expect(result.overallCondition).toBe('sound');
    expect(result.recommendedAction).toBe('no_action_required');
    expect(result.soundWoodFraction).toBeGreaterThan(0.95);
    expect(result.estimatedBendingCapacityLossPercent).toBeLessThan(5);
  });

  it('detects moderate fungal rot and recommends structural sistering', () => {
    // Transit time slowed significantly to ~300 us (v = 1000 m/s vs 1550 m/s baseline)
    const chords: UltrasonicChordReading[] = [
      { chordId: 'CH-0', angleDeg: 0, pathLengthMm: 300, transitTimeUs: 300 },
      { chordId: 'CH-45', angleDeg: 45, pathLengthMm: 300, transitTimeUs: 220 },
      { chordId: 'CH-90', angleDeg: 90, pathLengthMm: 300, transitTimeUs: 310 },
      { chordId: 'CH-135', angleDeg: 135, pathLengthMm: 300, transitTimeUs: 215 },
    ];

    const result = StructuralTimberUltrasonicRotTomographer.analyzeCrossSection(
      'douglas_fir',
      300,
      chords
    );

    expect(result.overallCondition).toBe('moderate');
    expect(result.recommendedAction).toBe('structural_sistering');
    expect(result.chordResults[0].severity).toBe('moderate');
  });

  it('detects severe hollow cavity and orders immediate load restriction/replacement', () => {
    // Transit time delayed past 500 us (v = 600 m/s, over 60% velocity loss across core)
    const chords: UltrasonicChordReading[] = [
      { chordId: 'CH-0', angleDeg: 0, pathLengthMm: 300, transitTimeUs: 550 },
      { chordId: 'CH-45', angleDeg: 45, pathLengthMm: 300, transitTimeUs: 520 },
      { chordId: 'CH-90', angleDeg: 90, pathLengthMm: 300, transitTimeUs: 580 },
      { chordId: 'CH-135', angleDeg: 135, pathLengthMm: 300, transitTimeUs: 540 },
    ];

    const result = StructuralTimberUltrasonicRotTomographer.analyzeCrossSection(
      'douglas_fir',
      300,
      chords
    );

    expect(result.overallCondition).toBe('severe_cavity');
    expect(result.recommendedAction).toBe('immediate_load_restriction_replacement');
    expect(result.estimatedBendingCapacityLossPercent).toBeGreaterThan(30);
  });

  it('throws error when no chord readings are supplied', () => {
    expect(() => {
      StructuralTimberUltrasonicRotTomographer.analyzeCrossSection('southern_pine', 250, []);
    }).toThrow(/At least one ultrasonic chord reading is required/);
  });
});
