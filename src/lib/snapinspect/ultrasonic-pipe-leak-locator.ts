/**
 * SNAP-29: Multi-Point Acoustic Ultrasonic Pipe Leak Location Estimator
 * Tactical Field Inspection CAD & Mobile Voice AI (SnapInspect AI).
 * Computes acoustic Time Difference of Arrival (TDOA) cross-correlation along pressurized
 * pipelines, maps speed of sound through varied structural pipe materials, calculates
 * leak location offsets, and estimates leak flow rates from ultrasonic acoustic emission.
 */

export enum PipeMaterial {
  PVC = 'PVC',
  STEEL = 'STEEL',
  COPPER = 'COPPER',
  CAST_IRON = 'CAST_IRON',
  DUCTILE_IRON = 'DUCTILE_IRON',
  PEX = 'PEX'
}

export const SPEED_OF_SOUND_MPS: Record<PipeMaterial, number> = {
  [PipeMaterial.PVC]: 2300,
  [PipeMaterial.STEEL]: 5000,
  [PipeMaterial.COPPER]: 3700,
  [PipeMaterial.CAST_IRON]: 4000,
  [PipeMaterial.DUCTILE_IRON]: 4300,
  [PipeMaterial.PEX]: 1800
};

export type LeakSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';

export interface PipeLeakEstimate {
  distanceBetweenSensorsMeters: number;
  pipeMaterial: PipeMaterial;
  speedOfSoundMps: number;
  timeDelaySeconds: number;
  leakDistanceFromSensor1Meters: number;
  leakDistanceFromSensor2Meters: number;
  isWithinSpan: boolean;
  crossCorrelationScore: number;
  signalToNoiseRatioDb: number;
  confidenceScore: number;
  severity: LeakSeverity;
  estimatedFlowRateLpm: number;
  auditHash: string;
}

export interface UltrasonicAcousticTelemetry {
  sensor1Id: string;
  sensor2Id: string;
  sensorDistanceMeters: number;
  material: PipeMaterial;
  crossCorrelationDelaySeconds: number;
  correlationPeakCoeff: number;
  snrDb: number;
  sensor1AmplitudeDb: number;
  sensor2AmplitudeDb: number;
  pipePressurePsi: number;
  ultrasonicCenterFreqKhz: number;
}

export class UltrasonicPipeLeakLocator {
  /**
   * Simple deterministic SHA-like hash generator for telemetry verification
   */
  private static computeHash(payload: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Calculates pipe leak position between two acoustic sensors using TDOA.
   * Formula: x1 = (D - c * dt) / 2
   */
  public static locateLeak(telemetry: UltrasonicAcousticTelemetry): PipeLeakEstimate {
    const c = SPEED_OF_SOUND_MPS[telemetry.material] || 3500;
    const D = telemetry.sensorDistanceMeters;
    const dt = telemetry.crossCorrelationDelaySeconds;

    // Distance from sensor 1: x1 = (D + c * dt) / 2 where dt = t1 - t2
    const x1 = (D + c * dt) / 2;
    const x2 = D - x1;

    const isWithinSpan = x1 >= 0 && x1 <= D;

    // Confidence model: combines cross correlation peak (0..1) with SNR normalized up to 40dB
    const snrNormalized = Math.min(Math.max(telemetry.snrDb / 40.0, 0), 1.0);
    const correlationClamped = Math.min(Math.max(telemetry.correlationPeakCoeff, 0), 1.0);
    const confidenceScore = Number((0.6 * correlationClamped + 0.4 * snrNormalized).toFixed(4));

    // Flow rate & severity
    const maxAmplitude = Math.max(telemetry.sensor1AmplitudeDb, telemetry.sensor2AmplitudeDb);
    const { estimatedLpm, severity } = this.estimateSeverityAndFlow(
      maxAmplitude,
      telemetry.pipePressurePsi,
      telemetry.ultrasonicCenterFreqKhz
    );

    const rawPayload = `${telemetry.sensor1Id}:${telemetry.sensor2Id}:${x1.toFixed(3)}:${dt}:${confidenceScore}:${severity}`;
    const auditHash = this.computeHash(rawPayload);

    return {
      distanceBetweenSensorsMeters: Number(D.toFixed(3)),
      pipeMaterial: telemetry.material,
      speedOfSoundMps: c,
      timeDelaySeconds: Number(dt.toFixed(6)),
      leakDistanceFromSensor1Meters: Number(x1.toFixed(3)),
      leakDistanceFromSensor2Meters: Number(x2.toFixed(3)),
      isWithinSpan,
      crossCorrelationScore: Number(correlationClamped.toFixed(4)),
      signalToNoiseRatioDb: Number(telemetry.snrDb.toFixed(2)),
      confidenceScore,
      severity,
      estimatedFlowRateLpm: Number(estimatedLpm.toFixed(2)),
      auditHash
    };
  }

  /**
   * Estimates leak discharge flow rate based on high-frequency turbulent emission.
   */
  public static estimateSeverityAndFlow(
    amplitudeDb: number,
    pipePressurePsi: number,
    centerFreqKhz: number = 40
  ): { estimatedLpm: number; severity: LeakSeverity } {
    // Empirical orifice acoustic emission scaling
    const normalizedPressure = Math.max(pipePressurePsi, 10) / 50.0;
    const freqFactor = centerFreqKhz >= 35 && centerFreqKhz <= 45 ? 1.15 : 1.0;

    let baseLpm = 0;
    if (amplitudeDb > 65) {
      baseLpm = 25.0 + (amplitudeDb - 65) * 1.8;
    } else if (amplitudeDb > 45) {
      baseLpm = 6.0 + (amplitudeDb - 45) * 0.95;
    } else if (amplitudeDb > 25) {
      baseLpm = 1.0 + (amplitudeDb - 25) * 0.25;
    } else {
      baseLpm = Math.max(0.1, amplitudeDb * 0.04);
    }

    const estimatedLpm = baseLpm * normalizedPressure * freqFactor;

    let severity: LeakSeverity = 'MINOR';
    if (estimatedLpm >= 30 || amplitudeDb >= 70) {
      severity = 'CATASTROPHIC';
    } else if (estimatedLpm >= 10 || amplitudeDb >= 55) {
      severity = 'SEVERE';
    } else if (estimatedLpm >= 3 || amplitudeDb >= 35) {
      severity = 'MODERATE';
    } else {
      severity = 'MINOR';
    }

    return { estimatedLpm, severity };
  }
}
