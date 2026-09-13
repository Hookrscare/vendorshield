/**
 * nuclear-cask-helium-resonator.ts
 * SNAP-64: Nuclear Spent Fuel Dry Cask Storage Canister Helium Leak Acoustic Resonator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & NDT Diagnostics.
 *
 * Non-destructive confinement boundary evaluation for 10 CFR Part 72 spent fuel dry casks:
 * 1. Models acoustic resonance frequencies inside helium-backfilled multi-purpose canisters (MPC).
 * 2. Compares speed of sound in pure helium (~1007 m/s) with air ingress / helium loss mixtures (~343 - 700 m/s).
 * 3. Identifies fundamental cavity standing wave shifts: f_n = (n * c_mix) / (2 * L).
 * 4. Generates regulatory compliance verdicts (COMPLIANT, MINOR_LOSS, BREACH_DETECTED).
 */

export interface CaskGeometry {
  caskId: string;
  cavityLengthMeters: number;     // Typical dry cask inner cavity height ~ 4.5m
  nominalHeliumPressureBar: number; // e.g. 5.0 bar
  internalTempKelvin: number;      // e.g. 350 K (~77 C) from decay heat
}

export interface AcousticCavitySounding {
  fundamentalFrequencyHz: number;
  measuredQFactor: number;
  shellAcousticEmissionDb: number;
}

export interface CaskConfinementAssessment {
  caskId: string;
  expectedPureHeliumFreqHz: number;
  measuredFrequencyHz: number;
  estimatedHeliumPurityPercent: number;
  confinementIntegrityStatus: 'COMPLIANT' | 'DEGRADED_PRESSURE' | 'CRITICAL_LEAK_AIR_INGRESS';
  nrcPart72Violation: boolean;
  recommendedAction: string;
}

export class NuclearCaskHeliumResonator {
  // Gas constant R = 8.314 J/(mol*K)
  // Helium: M = 0.004 kg/mol, gamma = 1.667
  // Air / Nitrogen: M = 0.029 kg/mol, gamma = 1.400

  public static calculateSpeedOfSound(
    heliumFraction: number, // 0.0 (pure air) to 1.0 (pure helium)
    tempKelvin: number
  ): number {
    const fraction = Math.max(0.0, Math.min(1.0, heliumFraction));
    const m_mix = fraction * 0.004 + (1.0 - fraction) * 0.02897;
    const gamma_mix = fraction * 1.667 + (1.0 - fraction) * 1.400;
    const r_universal = 8.31446;

    const speed = Math.sqrt((gamma_mix * r_universal * tempKelvin) / m_mix);
    return Math.round(speed * 10) / 10;
  }

  public static calculateStandingWaveFrequency(speedOfSoundMPerSec: number, lengthMeters: number): number {
    // Fundamental half-wave longitudinal acoustic resonance: f = c / (2 * L)
    return Math.round((speedOfSoundMPerSec / (2.0 * lengthMeters)) * 100) / 100;
  }

  public static evaluateCask(
    geom: CaskGeometry,
    sounding: AcousticCavitySounding
  ): CaskConfinementAssessment {
    const c_pure_he = this.calculateSpeedOfSound(1.0, geom.internalTempKelvin);
    const expected_freq = this.calculateStandingWaveFrequency(c_pure_he, geom.cavityLengthMeters);

    // From sounding frequency, invert for effective speed of sound:
    const measured_speed = sounding.fundamentalFrequencyHz * 2.0 * geom.cavityLengthMeters;
    const c_pure_air = this.calculateSpeedOfSound(0.0, geom.internalTempKelvin);

    // Approximate helium purity linear interpolation between air and pure He speed
    const purity = Math.max(
      0.0,
      Math.min(1.0, (measured_speed - c_pure_air) / Math.max(10.0, c_pure_he - c_pure_air))
    );
    const purityPercent = Math.round(purity * 1000) / 10;

    let status: CaskConfinementAssessment['confinementIntegrityStatus'] = 'COMPLIANT';
    let violation = false;
    let action = 'Routine annual monitoring scheduled. Confinement boundary intact.';

    if (purityPercent < 80.0) {
      status = 'CRITICAL_LEAK_AIR_INGRESS';
      violation = true;
      action = 'MANDATORY ISFSI ALERT: Helium confinement breach detected. Initiate dry transfer pit recovery and repackaging.';
    } else if (purityPercent < 95.0) {
      status = 'DEGRADED_PRESSURE';
      action = 'Increased acoustic surveillance. Perform supplemental mass spectrometer helium sniffing at lid closure welds.';
    }

    return {
      caskId: geom.caskId,
      expectedPureHeliumFreqHz: expected_freq,
      measuredFrequencyHz: sounding.fundamentalFrequencyHz,
      estimatedHeliumPurityPercent: purityPercent,
      confinementIntegrityStatus: status,
      nrcPart72Violation: violation,
      recommendedAction: action
    };
  }
}
