/**
 * SNAP-05: Client-Side Audio Level Meter HUD for Hands-Free Voice Defect Logging.
 * Analyzes microphone PCM time-domain samples to compute RMS, peak dBFS,
 * signal-to-noise ratio, and voice activity state for field inspection environments.
 */

export type AudioSignalStatus = "SILENCE" | "LOW_SIGNAL" | "OPTIMAL" | "CLIPPING";

export interface AudioMeterState {
  rms: number; // 0.0 to 1.0
  peak: number; // 0.0 to 1.0
  peakDb: number; // -Infinity to 0.0 dBFS
  status: AudioSignalStatus;
  vadDetected: boolean;
  zeroCrossingRate: number;
}

export interface AudioBarDisplay {
  totalBars: number;
  activeBars: number;
  colorClass: string; // Tailwind color token
  label: string;
}

/**
 * Pure calculation function for time-domain PCM samples.
 * Can be run in main thread, AudioWorklet, or unit tests.
 */
export function computeAudioLevel(samples: Float32Array | number[]): AudioMeterState {
  const n = samples.length;
  if (n === 0) {
    return {
      rms: 0.0,
      peak: 0.0,
      peakDb: -Infinity,
      status: "SILENCE",
      vadDetected: false,
      zeroCrossingRate: 0.0,
    };
  }

  let sumSquares = 0.0;
  let peak = 0.0;
  let zeroCrossings = 0;
  let prevSample = Number(samples[0]);

  for (let i = 0; i < n; i++) {
    const val = Number(samples[i]);
    const absVal = Math.abs(val);
    if (absVal > peak) {
      peak = absVal;
    }
    sumSquares += val * val;

    // Zero-crossing check
    if ((val >= 0 && prevSample < 0) || (val < 0 && prevSample >= 0)) {
      zeroCrossings++;
    }
    prevSample = val;
  }

  const rms = Math.sqrt(sumSquares / n);
  const peakDb = peak > 1e-5 ? 20 * Math.log10(peak) : -100.0;
  const zeroCrossingRate = zeroCrossings / n;

  // Signal status classification
  let status: AudioSignalStatus = "OPTIMAL";
  if (peakDb >= -1.0) {
    status = "CLIPPING";
  } else if (peakDb < -42.0) {
    status = "SILENCE";
  } else if (peakDb < -22.0) {
    status = "LOW_SIGNAL";
  }

  // Voice activity detection heuristic:
  // Human speech typically requires sufficient energy (peakDb >= -38)
  // and moderate zero-crossing rate (0.02 to 0.40) to distinguish from wind or DC hum.
  const vadDetected = peakDb >= -38.0 && zeroCrossingRate >= 0.015 && zeroCrossingRate <= 0.45;

  return {
    rms: Math.min(1.0, rms),
    peak: Math.min(1.0, peak),
    peakDb: Math.round(peakDb * 10) / 10,
    status,
    vadDetected,
    zeroCrossingRate: Math.round(zeroCrossingRate * 1000) / 1000,
  };
}

/**
 * Formats visual audio HUD bars for inspector UI.
 */
export function formatAudioMeterBars(state: AudioMeterState, totalBars: number = 8): AudioBarDisplay {
  let activeBars = 0;
  if (state.peak > 0) {
    activeBars = Math.min(totalBars, Math.max(1, Math.round(state.peak * totalBars)));
  }

  let colorClass = "bg-emerald-500";
  let label = "Voice Ready";

  if (state.status === "CLIPPING") {
    colorClass = "bg-rose-500 animate-pulse";
    label = "Audio Clipping (Back Away)";
  } else if (state.status === "SILENCE") {
    activeBars = 0;
    colorClass = "bg-slate-700";
    label = "Silence / Mic Standby";
  } else if (state.status === "LOW_SIGNAL") {
    colorClass = "bg-amber-400";
    label = "Speak Louder / Closer";
  }

  return {
    totalBars,
    activeBars,
    colorClass,
    label,
  };
}
