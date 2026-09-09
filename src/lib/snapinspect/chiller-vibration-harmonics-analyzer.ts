/**
 * SNAP-36: Automated HVAC Chiller Vibration Spectral Harmonics Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements ISO 10816-3 & ISO 20816-1 mechanical vibration spectral analysis
 * for industrial centrifugal/screw HVAC chillers and compressor bearings.
 */

export type VibrationSeverityZone = 'ZONE_A_GOOD' | 'ZONE_B_ACCEPTABLE' | 'ZONE_C_UNSATISFACTORY' | 'ZONE_D_UNACCEPTABLE';

export type MechanicalAnomalyType =
  | 'DYNAMIC_MASS_UNBALANCE'
  | 'ANGULAR_PARALLEL_MISALIGNMENT'
  | 'HYDRODYNAMIC_OIL_WHIRL'
  | 'ROLLER_BEARING_RACE_DEFECT'
  | 'NORMAL_RUNNING_CONDITION';

export interface SpectralPeak {
  frequencyHz: number;
  order: number; // Multiple of 1x running speed
  amplitudeMmPerSec: number;
}

export interface ChillerVibrationInput {
  equipmentId: string;
  runningSpeedRpm: number; // e.g. 3600 RPM or 1800 RPM
  axis: 'RADIAL_HORIZONTAL' | 'RADIAL_VERTICAL' | 'AXIAL';
  overallRmsVelocityMmPerSec: number;
  spectralPeaks: Array<{ frequencyHz: number; amplitudeMmPerSec: number }>;
}

export interface ChillerHarmonicsAnalysisResult {
  equipmentId: string;
  runningSpeedHz: number;
  overallRmsVelocityMmPerSec: number;
  iso10816SeverityZone: VibrationSeverityZone;
  primaryAnomaly: MechanicalAnomalyType;
  harmonics: {
    fundamental1x: SpectralPeak | null;
    secondHarmonic2x: SpectralPeak | null;
    thirdHarmonic3x: SpectralPeak | null;
    subHarmonicWhirl: SpectralPeak | null;
  };
  recommendedAction: string;
  requiresEmergencyShutdown: boolean;
}

export class ChillerVibrationHarmonicsAnalyzer {
  /**
   * Analyzes vibration spectra and maps to ISO 10816-3 machine vibration standards.
   */
  public static analyze(input: ChillerVibrationInput): ChillerHarmonicsAnalysisResult {
    const runningSpeedHz = input.runningSpeedRpm / 60.0;
    const toleranceHz = runningSpeedHz * 0.05; // +/- 5% order tolerance

    // Map peaks to orders
    let fundamental1x: SpectralPeak | null = null;
    let secondHarmonic2x: SpectralPeak | null = null;
    let thirdHarmonic3x: SpectralPeak | null = null;
    let subHarmonicWhirl: SpectralPeak | null = null;

    for (const p of input.spectralPeaks) {
      const order = p.frequencyHz / runningSpeedHz;

      // 1x Running speed
      if (Math.abs(p.frequencyHz - runningSpeedHz) <= toleranceHz) {
        if (!fundamental1x || p.amplitudeMmPerSec > fundamental1x.amplitudeMmPerSec) {
          fundamental1x = { frequencyHz: p.frequencyHz, order: 1.0, amplitudeMmPerSec: p.amplitudeMmPerSec };
        }
      }
      // 2x Harmonic
      else if (Math.abs(p.frequencyHz - (2 * runningSpeedHz)) <= toleranceHz) {
        if (!secondHarmonic2x || p.amplitudeMmPerSec > secondHarmonic2x.amplitudeMmPerSec) {
          secondHarmonic2x = { frequencyHz: p.frequencyHz, order: 2.0, amplitudeMmPerSec: p.amplitudeMmPerSec };
        }
      }
      // 3x Harmonic
      else if (Math.abs(p.frequencyHz - (3 * runningSpeedHz)) <= toleranceHz) {
        if (!thirdHarmonic3x || p.amplitudeMmPerSec > thirdHarmonic3x.amplitudeMmPerSec) {
          thirdHarmonic3x = { frequencyHz: p.frequencyHz, order: 3.0, amplitudeMmPerSec: p.amplitudeMmPerSec };
        }
      }
      // 0.38x - 0.48x Sub-harmonic (Oil whirl / bearing cage slip)
      else if (order >= 0.38 && order <= 0.48) {
        if (!subHarmonicWhirl || p.amplitudeMmPerSec > subHarmonicWhirl.amplitudeMmPerSec) {
          subHarmonicWhirl = { frequencyHz: p.frequencyHz, order: Math.round(order * 100) / 100, amplitudeMmPerSec: p.amplitudeMmPerSec };
        }
      }
    }

    // Determine ISO 10816-3 Class III/IV Rigid Support Severity Zone
    // A: <= 2.3 mm/s, B: 2.3 - 4.5 mm/s, C: 4.5 - 7.1 mm/s, D: > 7.1 mm/s
    let zone: VibrationSeverityZone;
    if (input.overallRmsVelocityMmPerSec <= 2.3) {
      zone = 'ZONE_A_GOOD';
    } else if (input.overallRmsVelocityMmPerSec <= 4.5) {
      zone = 'ZONE_B_ACCEPTABLE';
    } else if (input.overallRmsVelocityMmPerSec <= 7.1) {
      zone = 'ZONE_C_UNSATISFACTORY';
    } else {
      zone = 'ZONE_D_UNACCEPTABLE';
    }

    // Determine Anomaly
    let anomaly: MechanicalAnomalyType = 'NORMAL_RUNNING_CONDITION';
    let action = 'Equipment operating within baseline vibration limits. Routine quarterly monitoring.';

    if (subHarmonicWhirl && subHarmonicWhirl.amplitudeMmPerSec >= 1.5) {
      anomaly = 'HYDRODYNAMIC_OIL_WHIRL';
      action = 'URGENT: Hydrodynamic bearing instability detected. Verify lubricant viscosity, journal clearance, and oil supply pressure.';
    } else if (secondHarmonic2x && fundamental1x && secondHarmonic2x.amplitudeMmPerSec >= (0.75 * fundamental1x.amplitudeMmPerSec)) {
      anomaly = 'ANGULAR_PARALLEL_MISALIGNMENT';
      action = 'Shaft coupling misalignment indicated by dominant 2x harmonic. Perform precision laser realignment of motor-chiller coupling.';
    } else if (fundamental1x && fundamental1x.amplitudeMmPerSec >= 3.5) {
      anomaly = 'DYNAMIC_MASS_UNBALANCE';
      action = 'High 1x running speed vibration indicates impeller/rotor unbalance. Conduct dynamic multi-plane field balancing.';
    } else if (zone === 'ZONE_D_UNACCEPTABLE') {
      anomaly = 'ROLLER_BEARING_RACE_DEFECT';
      action = 'Critical broadband vibration excursion. Disassemble and inspect drive-end bearings and gear sets immediately.';
    }

    return {
      equipmentId: input.equipmentId,
      runningSpeedHz: Math.round(runningSpeedHz * 100) / 100,
      overallRmsVelocityMmPerSec: input.overallRmsVelocityMmPerSec,
      iso10816SeverityZone: zone,
      primaryAnomaly: anomaly,
      harmonics: {
        fundamental1x,
        secondHarmonic2x,
        thirdHarmonic3x,
        subHarmonicWhirl,
      },
      recommendedAction: action,
      requiresEmergencyShutdown: zone === 'ZONE_D_UNACCEPTABLE' || anomaly === 'HYDRODYNAMIC_OIL_WHIRL',
    };
  }
}
