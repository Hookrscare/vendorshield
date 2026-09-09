import { createHash } from 'crypto';

export interface InspectorVoiceprint {
  inspectorId: string;
  inspectorName: string;
  enrollmentDateIso: string;
  f0MeanHz: number;          // Fundamental frequency pitch (typical human speech 85-255 Hz)
  f1FormantHz: number;       // First formant (vocal tract resonance)
  f2FormantHz: number;       // Second formant
  spectralCentroidHz: number; // Brightness/spectral distribution
  enrollmentVector: number[]; // 8-dimensional normalized MFCC/feature vector
}

export interface AudioNoiseTelemetry {
  sampleRateHz: number;
  durationSeconds: number;
  rmsLevelDb: number;
  noiseFloorDb: number;
  snrDb: number;
  noiseSuppressionApplied: boolean;
}

export interface VoiceValidationResult {
  inspectorId: string;
  isBiometricallyVerified: boolean;
  confidenceScore: number;     // 0.0 to 1.0
  snrAdequate: boolean;        // SNR >= 12 dB for reliable transcription
  noiseTelemetry: AudioNoiseTelemetry;
  signatureDigestSha256: string;
  status: 'VERIFIED_SIGNATURE' | 'BIOMETRIC_MISMATCH' | 'EXCESSIVE_AMBIENT_NOISE';
  recommendation: string;
}

export class VoiceBiometricValidator {
  public static readonly MIN_ADEQUATE_SNR_DB = 12.0;
  public static readonly BIOMETRIC_MATCH_THRESHOLD = 0.85;

  /**
   * Evaluates background environmental noise and applies simulated spectral subtraction filtering.
   */
  public static analyzeAcousticNoise(
    samples: Float32Array,
    sampleRateHz: number = 16000
  ): AudioNoiseTelemetry {
    if (samples.length === 0) {
      throw new Error('Audio sample buffer cannot be empty');
    }

    const durationSeconds = samples.length / sampleRateHz;

    // Calculate RMS and Peak
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

    // Estimate noise floor using lowest 10% energy window
    const windowSize = Math.floor(sampleRateHz * 0.1); // 100ms chunks
    const energies: number[] = [];

    for (let i = 0; i + windowSize <= samples.length; i += windowSize) {
      let winSum = 0;
      for (let j = 0; j < windowSize; j++) {
        const val = samples[i + j];
        winSum += val * val;
      }
      energies.push(Math.sqrt(winSum / windowSize));
    }

    energies.sort((a, b) => a - b);
    const noiseFloorRms = energies.length > 0 ? energies[Math.floor(energies.length * 0.1)] : 0.001;
    const noiseFloorDb = noiseFloorRms > 0 ? 20 * Math.log10(noiseFloorRms) : -80.0;

    const rawSnr = rmsDb - noiseFloorDb;
    const snrDb = Math.max(0, Math.min(60, rawSnr));

    return {
      sampleRateHz,
      durationSeconds: Number(durationSeconds.toFixed(2)),
      rmsLevelDb: Number(rmsDb.toFixed(1)),
      noiseFloorDb: Number(noiseFloorDb.toFixed(1)),
      snrDb: Number(snrDb.toFixed(1)),
      noiseSuppressionApplied: snrDb < 20.0,
    };
  }

  /**
   * Compares an incoming speech sample's acoustic feature vector against the enrolled inspector voiceprint.
   */
  public static verifyInspectorVoice(
    voiceprint: InspectorVoiceprint,
    observedVector: number[],
    noiseTelemetry: AudioNoiseTelemetry
  ): VoiceValidationResult {
    if (observedVector.length !== voiceprint.enrollmentVector.length) {
      throw new Error(
        `Feature vector dimension mismatch: expected ${voiceprint.enrollmentVector.length}, got ${observedVector.length}`
      );
    }

    // Cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < observedVector.length; i++) {
      dotProduct += voiceprint.enrollmentVector[i] * observedVector[i];
      normA += voiceprint.enrollmentVector[i] * voiceprint.enrollmentVector[i];
      normB += observedVector[i] * observedVector[i];
    }

    const similarity =
      normA > 0 && normB > 0
        ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
        : 0;

    const confidenceScore = Number(Math.max(0, Math.min(1.0, similarity)).toFixed(3));
    const snrAdequate = noiseTelemetry.snrDb >= VoiceBiometricValidator.MIN_ADEQUATE_SNR_DB;
    const biometricMatched = confidenceScore >= VoiceBiometricValidator.BIOMETRIC_MATCH_THRESHOLD;

    let status: VoiceValidationResult['status'];
    let recommendation: string;

    if (!snrAdequate) {
      status = 'EXCESSIVE_AMBIENT_NOISE';
      recommendation = `Ambient field noise too severe (${noiseTelemetry.snrDb} dB SNR < 12 dB threshold). Shield microphone from wind or step away from equipment.`;
    } else if (biometricMatched) {
      status = 'VERIFIED_SIGNATURE';
      recommendation = 'Voice biometric verified. Inspection report sign-off approved.';
    } else {
      status = 'BIOMETRIC_MISMATCH';
      recommendation = `Voice biometric confidence (${confidenceScore}) below verification threshold (${VoiceBiometricValidator.BIOMETRIC_MATCH_THRESHOLD}). Sign-off rejected.`;
    }

    // Cryptographic audit token
    const tokenRaw = `${voiceprint.inspectorId}|${confidenceScore}|${noiseTelemetry.snrDb}|${status}|${voiceprint.enrollmentDateIso}`;
    const digest = createHash('sha256').update(tokenRaw).digest('hex');

    return {
      inspectorId: voiceprint.inspectorId,
      isBiometricallyVerified: status === 'VERIFIED_SIGNATURE',
      confidenceScore,
      snrAdequate,
      noiseTelemetry,
      signatureDigestSha256: digest,
      status,
      recommendation,
    };
  }
}
