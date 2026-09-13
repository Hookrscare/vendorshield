/**
 * wind-pitch-bearing-flaw-detector.ts
 * SNAP-72: Wind Turbine Pitch Bearing Race Sub-Surface Fatigue Spalling Ultrasonic Flaw Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & NDT Diagnostics.
 *
 * Wind turbine pitch bearing ultrasonic non-destructive testing (NDT) analyzer:
 * 1. Ingests high-frequency shear-wave ultrasonic A-scan signals (5 MHz).
 * 2. Inverts echo time-of-flight to true sub-surface flaw depth (mm).
 * 3. Evaluates acoustic echo amplitude dB relative to 2mm Flat Bottom Hole (FBH) standard.
 * 4. Correlates flaw location with peak Hertzian shear stress zone (1.5mm - 4.5mm depth).
 * 5. Classifies bearing raceway spalling and issues blade lock feathering commands.
 */

export interface PitchBearingSpec {
  turbineId: string;
  bladeNumber: number;               // 1, 2, or 3
  bearingOuterDiameterMm: number;    // e.g. 2800 mm
  caseHardenedDepthMm: number;       // e.g. 4.5 mm
  peakHertzianShearDepthMm: number;  // e.g. 2.2 mm (depth of maximum tau_max)
}

export interface UltrasonicEchoScan {
  probeAngleDegrees: number;         // e.g. 45 degrees
  shearWaveVelocityMPerSec: number;  // ~3240 m/s in steel
  echoTimeOfFlightMicroseconds: number;
  echoAmplitudePercentFsh: number;   // Full Screen Height %
  referenceFbhAmplitudePercentFsh: number;
}

export interface BearingFlawReport {
  turbineId: string;
  bladeNumber: number;
  flawDepthMm: number;
  decibelsRelativeToFbh: number;
  isInPeakShearZone: boolean;
  racewayDefectSeverity: 'ACCEPTABLE_BASELINE' | 'MONITOR_SUB_SURFACE_INCLUSION' | 'CRITICAL_SPALLING_STRUCTURAL_RISK';
  operationalAction: string;
}

export class WindPitchBearingFlawDetector {
  public static evaluateFlaw(
    spec: PitchBearingSpec,
    scan: UltrasonicEchoScan
  ): BearingFlawReport {
    // True vertical depth d = (v_s * t_f * cos(theta)) / 2
    // t_f is round-trip time in microseconds -> convert to seconds (1e-6)
    const tSec = scan.echoTimeOfFlightMicroseconds * 1e-6;
    const thetaRad = (scan.probeAngleDegrees * Math.PI) / 180.0;
    const soundPathM = (scan.shearWaveVelocityMPerSec * tSec) / 2.0;
    const depthMm = Math.round(soundPathM * Math.cos(thetaRad) * 1000.0 * 10) / 10;

    // Amplitude comparison in dB
    const aFlaw = Math.max(1.0, scan.echoAmplitudePercentFsh);
    const aRef = Math.max(1.0, scan.referenceFbhAmplitudePercentFsh);
    const deltaDb = Math.round((20.0 * Math.log10(aFlaw / aRef)) * 10) / 10;

    // Hertzian shear stress zone: +/- 1.0mm around peak tau_max
    const inShearZone = Math.abs(depthMm - spec.peakHertzianShearDepthMm) <= 1.2;

    let severity: BearingFlawReport['racewayDefectSeverity'] = 'ACCEPTABLE_BASELINE';
    let action = 'Pitch bearing raceway acoustic response within normal metallurgical baseline.';

    if (deltaDb >= -3.0 && inShearZone) {
      severity = 'CRITICAL_SPALLING_STRUCTURAL_RISK';
      action = 'EMERGENCY: Major sub-surface fatigue spalling crack detected in maximum shear raceway zone. Lock blade in 90-degree feathered position.';
    } else if (deltaDb >= -12.0) {
      severity = 'MONITOR_SUB_SURFACE_INCLUSION';
      action = 'Sub-surface micro-inclusion detected; increase automated grease lubrication cycle and rescan in 90 days.';
    }

    return {
      turbineId: spec.turbineId,
      bladeNumber: spec.bladeNumber,
      flawDepthMm: depthMm,
      decibelsRelativeToFbh: deltaDb,
      isInPeakShearZone: inShearZone,
      racewayDefectSeverity: severity,
      operationalAction: action
    };
  }
}
