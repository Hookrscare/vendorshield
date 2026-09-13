/**
 * src/lib/snapinspect/fpso-turret-bearing-acoustic-monitor.ts
 * Part of SnapInspect AI Subsea & Offshore Floating Production NDT.
 *
 * SNAP-85: Offshore FPSO Turret Mooring Bearing Hydrodynamic Acoustic Emission Monitor.
 * Ingests high-frequency acoustic emission (AE, 100 kHz - 500 kHz) waveforms from large-diameter
 * FPSO internal/external turret swivel roller bearings.
 * Detects subsurface fatigue micro-cracking, raceway spalling, and hydrodynamic lubrication breakdown
 * under high-sea-state cyclic wave yawing moments per DNV-RU-OU-0101 and API RP 2SK.
 */

import { createHash } from 'crypto';

export interface BearingAcousticWaveformMetrics {
  bearingId: string;
  sensorLocation: 'INNER_RACE' | 'OUTER_RACE' | 'ROLLER_CAGE' | 'THRUST_COLLAR';
  significantWaveHeightMeters: number; // Hs
  turretYawRateDegPerSec: number;
  peakAmplitudeDbae: number; // dB_AE ref 1 uV
  rootMeanSquareVoltageMv: number; // RMS
  ringdownCounts: number; // Ring-down counts exceeding threshold
  energyCountsEua: number; // Energy units (EUA)
  peakFrequencyKhz: number;
}

export interface BearingHealthEvaluation {
  bearingId: string;
  sensorLocation: string;
  crestFactor: number; // Peak / RMS ratio
  damageIndex: number; // 0.0 - 1.0 composite degradation scale
  healthTier: 'NORMAL_LUBRICATION' | 'INCIPIENT_MICROPITTING' | 'RACEWAY_SPALLING_WARNING' | 'CRITICAL_ROLLER_FAILURE_RISK';
  isSafeForContinuedOperations: boolean;
  diagnosticDigestSha256: string;
}

export class FpsoTurretBearingAcousticMonitor {
  public evaluateBearing(metrics: BearingAcousticWaveformMetrics): BearingHealthEvaluation {
    if (metrics.significantWaveHeightMeters < 0 || metrics.turretYawRateDegPerSec < 0) {
      throw new Error('Environmental metrics cannot be negative.');
    }
    if (metrics.rootMeanSquareVoltageMv <= 0) {
      throw new Error('RMS voltage must be strictly positive.');
    }

    // Crest factor: Peak linear voltage / RMS linear voltage
    // Peak voltage in mV: V_peak = 10^((dBae - 60) / 20)
    const vPeakMv = Math.pow(10, (metrics.peakAmplitudeDbae - 60.0) / 20.0);
    const crestFactor = vPeakMv / metrics.rootMeanSquareVoltageMv;

    // Damage index calculation combining energy counts, ringdowns, and amplitude
    const ampNorm = Math.max(0.0, (metrics.peakAmplitudeDbae - 40.0) / 60.0); // 40-100 dBae
    const energyNorm = Math.min(1.0, metrics.energyCountsEua / 50000.0);
    const ringdownNorm = Math.min(1.0, metrics.ringdownCounts / 2000.0);

    const damageIndex = Math.min(1.0, Math.max(0.0, 0.4 * ampNorm + 0.35 * energyNorm + 0.25 * ringdownNorm));

    let tier: BearingHealthEvaluation['healthTier'] = 'NORMAL_LUBRICATION';
    let isSafe = true;

    if (damageIndex >= 0.80 || metrics.peakAmplitudeDbae >= 90.0) {
      tier = 'CRITICAL_ROLLER_FAILURE_RISK';
      isSafe = false;
    } else if (damageIndex >= 0.50 || metrics.peakAmplitudeDbae >= 72.0) {
      tier = 'RACEWAY_SPALLING_WARNING';
      isSafe = true;
    } else if (damageIndex >= 0.25 || metrics.peakAmplitudeDbae >= 55.0) {
      tier = 'INCIPIENT_MICROPITTING';
      isSafe = true;
    }

    const raw = `${metrics.bearingId}:${metrics.sensorLocation}:${damageIndex.toFixed(3)}:${tier}:${metrics.peakAmplitudeDbae}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      bearingId: metrics.bearingId,
      sensorLocation: metrics.sensorLocation,
      crestFactor: Math.round(crestFactor * 100) / 100,
      damageIndex: Math.round(damageIndex * 1000) / 1000,
      healthTier: tier,
      isSafeForContinuedOperations: isSafe,
      diagnosticDigestSha256: digest
    };
  }
}
