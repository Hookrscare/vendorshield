/**
 * src/lib/snapinspect/subsea-xmas-tree-valve-leak-acoustic-detector.ts
 * Part of SnapInspect AI Subsea Infrastructure & Deepwater Wellhead NDT.
 *
 * SNAP-84: Deepwater Subsea Christmas Tree Valve Actuator Hydraulic Leak Acoustic Detector.
 * Ingests high-frequency ultrasonic passive acoustic emissions (20 kHz - 120 kHz)
 * from subsea Christmas tree master valves, wing valves, and choke actuators.
 * Detects turbulent micro-orifice fluid jetting, valve seat cavitation,
 * and internal hydraulic fluid leak rates per API 17D / ISO 13628-4.
 */

import { createHash } from 'crypto';

export interface AcousticFrequencyBin {
  frequencyKhz: number;
  soundPressureLevelDb: number;
}

export interface XmasTreeAcousticTelemetry {
  treeId: string;
  valveTag: string; // e.g., 'PMV' (Primary Master Valve), 'PWV' (Production Wing Valve)
  waterDepthMeters: number;
  differentialPressurePsi: number; // Delta-P across valve gate/seat
  ambientNoiseFloorDb: number;
  ultrasonicSpectrum: AcousticFrequencyBin[];
}

export interface ValveLeakAnalysisResult {
  treeId: string;
  valveTag: string;
  peakUltrasonicFrequencyKhz: number;
  peakSoundPressureDb: number;
  snrDb: number;
  isLeakDetected: boolean;
  estimatedLeakRateMlPerMin: number;
  leakSeverityTier: 'INTEGRITY_VERIFIED' | 'MINOR_SEAT_WEEPING' | 'MODERATE_HYDRAULIC_BYPASS' | 'CRITICAL_BLOW_BY';
  telemetryDigestSha256: string;
}

export class SubseaXmasTreeValveLeakAcousticDetector {
  /**
   * Evaluates ultrasonic spectrum against high-pressure fluid jetting signature.
   * Turbulent orifice noise typically manifests between 30 kHz and 80 kHz with
   * sound pressure scaling logarithmically with differential pressure and leak volume.
   */
  public evaluateValveAcoustics(input: XmasTreeAcousticTelemetry): ValveLeakAnalysisResult {
    if (input.differentialPressurePsi < 0) {
      throw new Error('Differential pressure cannot be negative.');
    }

    let peakKhz = 0;
    let peakDb = -Infinity;

    for (const bin of input.ultrasonicSpectrum) {
      if (bin.soundPressureLevelDb > peakDb) {
        peakDb = bin.soundPressureLevelDb;
        peakKhz = bin.frequencyKhz;
      }
    }

    const snrDb = Math.max(0, peakDb - input.ambientNoiseFloorDb);

    // Orifice jet acoustic criteria:
    // Leak is detected if peak is in ultrasonic range (25 kHz - 90 kHz) and SNR >= 12 dB
    const isUltrasonicLeakBand = peakKhz >= 25 && peakKhz <= 90;
    const isLeakDetected = isUltrasonicLeakBand && snrDb >= 12.0;

    let leakRateMlMin = 0.0;
    let tier: ValveLeakAnalysisResult['leakSeverityTier'] = 'INTEGRITY_VERIFIED';

    if (isLeakDetected) {
      // Hydrodynamic empirical scaling: Q = C * (DeltaP)^0.5 * 10^(SNR/20)
      const deltaPFactor = Math.sqrt(Math.max(1.0, input.differentialPressurePsi));
      leakRateMlMin = 0.15 * deltaPFactor * Math.pow(10, snrDb / 25.0);

      if (leakRateMlMin > 500.0 || snrDb > 35.0) {
        tier = 'CRITICAL_BLOW_BY';
      } else if (leakRateMlMin > 50.0 || snrDb > 22.0) {
        tier = 'MODERATE_HYDRAULIC_BYPASS';
      } else {
        tier = 'MINOR_SEAT_WEEPING';
      }
    }

    const raw = `${input.treeId}:${input.valveTag}:${peakKhz}:${peakDb}:${snrDb.toFixed(2)}:${leakRateMlMin.toFixed(2)}:${tier}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      treeId: input.treeId,
      valveTag: input.valveTag,
      peakUltrasonicFrequencyKhz: peakKhz,
      peakSoundPressureDb: Math.round(peakDb * 10) / 10,
      snrDb: Math.round(snrDb * 10) / 10,
      isLeakDetected,
      estimatedLeakRateMlPerMin: Math.round(leakRateMlMin * 10) / 10,
      leakSeverityTier: tier,
      telemetryDigestSha256: digest
    };
  }
}
