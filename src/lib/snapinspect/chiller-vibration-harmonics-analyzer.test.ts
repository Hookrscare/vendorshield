import { describe, it, expect } from 'vitest';
import {
  ChillerVibrationHarmonicsAnalyzer,
  ChillerVibrationInput
} from './chiller-vibration-harmonics-analyzer';

describe('SNAP-36: Automated HVAC Chiller Vibration Spectral Harmonics Analyzer', () => {
  it('should detect angular/parallel shaft misalignment with dominant 2x harmonic', () => {
    // 3600 RPM = 60 Hz running speed
    const input: ChillerVibrationInput = {
      equipmentId: 'chiller-york-yr-01',
      runningSpeedRpm: 3600,
      axis: 'RADIAL_HORIZONTAL',
      overallRmsVelocityMmPerSec: 5.2, // Zone C
      spectralPeaks: [
        { frequencyHz: 60.1, amplitudeMmPerSec: 2.8 },  // 1x
        { frequencyHz: 120.0, amplitudeMmPerSec: 3.4 }, // 2x dominant
        { frequencyHz: 179.8, amplitudeMmPerSec: 1.1 }, // 3x
      ]
    };

    const res = ChillerVibrationHarmonicsAnalyzer.analyze(input);
    expect(res.runningSpeedHz).toBe(60);
    expect(res.iso10816SeverityZone).toBe('ZONE_C_UNSATISFACTORY');
    expect(res.primaryAnomaly).toBe('ANGULAR_PARALLEL_MISALIGNMENT');
    expect(res.harmonics.fundamental1x?.amplitudeMmPerSec).toBe(2.8);
    expect(res.harmonics.secondHarmonic2x?.amplitudeMmPerSec).toBe(3.4);
    expect(res.recommendedAction).toContain('precision laser realignment');
    expect(res.requiresEmergencyShutdown).toBe(false);
  });

  it('should flag hydrodynamic oil whirl and trigger emergency shutdown', () => {
    // 1800 RPM = 30 Hz running speed. Sub-harmonic at ~13 Hz (0.43x)
    const input: ChillerVibrationInput = {
      equipmentId: 'chiller-trane-cvhe-02',
      runningSpeedRpm: 1800,
      axis: 'RADIAL_VERTICAL',
      overallRmsVelocityMmPerSec: 4.8,
      spectralPeaks: [
        { frequencyHz: 12.9, amplitudeMmPerSec: 2.1 }, // 0.43x Oil whirl
        { frequencyHz: 30.0, amplitudeMmPerSec: 1.4 }, // 1x
      ]
    };

    const res = ChillerVibrationHarmonicsAnalyzer.analyze(input);
    expect(res.runningSpeedHz).toBe(30);
    expect(res.primaryAnomaly).toBe('HYDRODYNAMIC_OIL_WHIRL');
    expect(res.harmonics.subHarmonicWhirl).not.toBeNull();
    expect(res.harmonics.subHarmonicWhirl?.order).toBe(0.43);
    expect(res.requiresEmergencyShutdown).toBe(true);
    expect(res.recommendedAction).toContain('URGENT: Hydrodynamic bearing instability');
  });

  it('should classify pristine equipment as Zone A with normal condition', () => {
    const input: ChillerVibrationInput = {
      equipmentId: 'chiller-carrier-19xr-03',
      runningSpeedRpm: 3000, // 50 Hz
      axis: 'AXIAL',
      overallRmsVelocityMmPerSec: 1.2, // Zone A
      spectralPeaks: [
        { frequencyHz: 50.0, amplitudeMmPerSec: 0.8 },
      ]
    };

    const res = ChillerVibrationHarmonicsAnalyzer.analyze(input);
    expect(res.iso10816SeverityZone).toBe('ZONE_A_GOOD');
    expect(res.primaryAnomaly).toBe('NORMAL_RUNNING_CONDITION');
    expect(res.requiresEmergencyShutdown).toBe(false);
  });
});
