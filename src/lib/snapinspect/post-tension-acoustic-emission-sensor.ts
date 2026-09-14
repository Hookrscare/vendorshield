/**
 * post-tension-acoustic-emission-sensor.ts
 * SNAP-84: Post-Tensioned Anchorage Head Micro-Crack Acoustic Emission Resonant Sensor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Structural Sensor Suite.
 *
 * Real-time Acoustic Emission (AE) resonant waveform analyzer for post-tensioned tendons:
 * 1. Measures ultrasonic transient stress waves (100 kHz - 1 MHz) during hydraulic jacking.
 * 2. Computes RA-value (Rise Time / Peak Voltage) and Average Frequency (AF).
 * 3. Classifies fracture mechanics: tensile micro-cracking vs shear failure / wedge slippage.
 * 4. Prevents catastrophic tendon burst and anchor head pull-out failures.
 */

export interface AeWaveformHit {
  tendonId: string;
  peakAmplitudeDb: number;        // e.g. 40 - 100 dB AE
  riseTimeMicroseconds: number;   // e.g. 10 - 500 µs
  durationMicroseconds: number;   // e.g. 50 - 5000 µs
  ringdownCounts: number;         // e.g. 5 - 1000
}

export interface AeDiagnosticVerdict {
  tendonId: string;
  status: 'ANCHORAGE_ELASTIC_TENSION_NOMINAL' | 'TENSILE_MICROCRACKING_MONITORED' | 'CRITICAL_ANCHOR_WEDGE_SLIP_FAILURE';
  isSafeToContinueJacking: boolean;
  raValueMicrosecPerVolt: number;
  averageFrequencyKhz: number;
  structuralNotes: string;
}

export class PostTensionAcousticEmissionSensor {
  public static analyzeHit(hit: AeWaveformHit): AeDiagnosticVerdict {
    // 1. Convert Peak dB to Peak Volts (reference: 100 dB AE = 1.0 V at pre-amp output)
    const peakVolts = Math.pow(10, (hit.peakAmplitudeDb - 100) / 20);

    // 2. Compute RA value = Rise Time (µs) / Peak Voltage (V)
    const raValue = Math.round(hit.riseTimeMicroseconds / Math.max(0.0001, peakVolts));

    // 3. Compute Average Frequency = (Counts / Duration (µs)) * 1000 kHz
    const avgFreqKhz = Math.round((hit.ringdownCounts / Math.max(1, hit.durationMicroseconds)) * 1000);

    // 4. Classify AE hit according to JCMS-IIIB570 / RILEM TC-212
    // High RA value (> 500 µs/V) and Low AF (< 60 kHz) with High Amplitude (> 80 dB) = Shear / Wedge Slip
    if (hit.peakAmplitudeDb >= 85 && raValue > 500 && avgFreqKhz < 60) {
      return {
        tendonId: hit.tendonId,
        status: 'CRITICAL_ANCHOR_WEDGE_SLIP_FAILURE',
        isSafeToContinueJacking: false,
        raValueMicrosecPerVolt: raValue,
        averageFrequencyKhz: avgFreqKhz,
        structuralNotes: `CRITICAL ALERT: Low-frequency high-energy shear burst detected (RA=${raValue} µs/V, AF=${avgFreqKhz} kHz, Amp=${hit.peakAmplitudeDb} dB). Immediate wedge slippage or strand rupture indicated. HALT JACKING.`
      };
    }

    // Low RA value (<= 300 µs/V) and High AF (>= 80 kHz) with moderate amplitude = Tensile Microcracking
    if (hit.peakAmplitudeDb >= 60 && raValue <= 300 && avgFreqKhz >= 80) {
      return {
        tendonId: hit.tendonId,
        status: 'TENSILE_MICROCRACKING_MONITORED',
        isSafeToContinueJacking: true,
        raValueMicrosecPerVolt: raValue,
        averageFrequencyKhz: avgFreqKhz,
        structuralNotes: `Tensile microcracking in bearing zone: High-frequency transient (RA=${raValue} µs/V, AF=${avgFreqKhz} kHz). Elastic load transfer active within design tolerances.`
      };
    }

    return {
      tendonId: hit.tendonId,
      status: 'ANCHORAGE_ELASTIC_TENSION_NOMINAL',
      isSafeToContinueJacking: true,
      raValueMicrosecPerVolt: raValue,
      averageFrequencyKhz: avgFreqKhz,
      structuralNotes: `Nominal elastic strain response. Low acoustic energy observed.`
    };
  }
}
