import { describe, it, expect } from 'vitest';
import {
  SubseaFlexibleRiserAnnulusHicUltrasonicProfiler,
  ArmorWireUltrasonicScan,
} from './subsea-flexible-riser-annulus-hic-ultrasonic-profiler';

describe('SNAP-75: SubseaFlexibleRiserAnnulusHicUltrasonicProfiler Tests', () => {
  const profiler = new SubseaFlexibleRiserAnnulusHicUltrasonicProfiler();

  it('validates sound armor wire without HIC defects as compliant PASS', () => {
    const soundScan: ArmorWireUltrasonicScan = {
      riserSectionId: 'riser_section_top_tension_01',
      waterDepthMeters: 1450,
      nominalWireThicknessMm: 6.0,
      wireWidthMm: 12.0,
      h2sPartialPressureKpa: 0.5,
      ultrasonicEchoesMm: [],
      flawLengthsMm: [],
    };

    const res = profiler.evaluateArmorWireHic(soundScan);

    expect(res.crackLengthRatioPct).toBe(0.0);
    expect(res.crackThicknessRatioPct).toBe(0.0);
    expect(res.naceTm0284Compliance).toBe('PASS');
    expect(res.tensileIntegrityStatus).toBe('INTACT');
  });

  it('flags severe HIC cracking as NON_COMPLIANT_FAILURE with critical rupture risk', () => {
    const crackedScan: ArmorWireUltrasonicScan = {
      riserSectionId: 'riser_section_sag_bend_04',
      waterDepthMeters: 1450,
      nominalWireThicknessMm: 6.0,
      wireWidthMm: 12.0,
      h2sPartialPressureKpa: 22.0, // High sour gas
      ultrasonicEchoesMm: [2.1, 2.8, 3.5], // Delamination depth span 1.4 mm
      flawLengthsMm: [2.5, 2.2], // Total length 4.7 mm > 30% of 12mm
    };

    const res = profiler.evaluateArmorWireHic(crackedScan);

    expect(res.crackLengthRatioPct).toBeGreaterThan(30.0);
    expect(res.maxSingleCrackLengthMm).toBe(2.5);
    expect(res.naceTm0284Compliance).toBe('NON_COMPLIANT_FAILURE');
    expect(res.tensileIntegrityStatus).toBe('CRITICAL_RUPTURE_RISK');
    expect(res.recommendedAction).toContain('Immediate riser depressurization');
  });
});
