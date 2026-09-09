/**
 * SNAP-26: Field Speech Noise Canceling Voice Biometric Signature Validator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Processes high-noise jobsite speech dictations (generators, wind, machinery):
 * - Evaluates audio Signal-to-Noise Ratio (SNR dB) and ambient noise floor.
 * - Extracts acoustic spectral features (spectral centroid, zero-crossing rate, energy distribution).
 * - Computes biometric voiceprint embedding vector and cosine similarity against enrolled inspector profile.
 * - Enforces anti-spoofing / non-authorized speaker rejection thresholds.
 * - Generates tamper-evident SHA-256 voice biometric verification audit stamp.
 */

import { createHash } from "crypto";

export interface AudioSampleFrame {
  timestampMs: number;
  rmsEnergy: number;
  zeroCrossingRate: number;
  spectralCentroidHz: number;
  dominantFrequencyHz: number;
}

export interface InspectorVoiceProfile {
  inspectorId: string;
  inspectorName: string;
  enrolledAtIso: string;
  baselinePitchHz: number;
  pitchToleranceHz: number;
  voiceprintVector: number[]; // Normalized spectral embedding vector
  minimumMatchConfidence: number; // e.g. 0.80
}

export interface NoiseAnalysisResult {
  estimatedSnrDb: number;
  ambientNoiseFloorDb: number;
  speechActivityDetected: boolean;
  noiseSuppressionGainFactor: number;
}

export interface VoiceBiometricValidationResult {
  validationId: string;
  inspectorId: string;
  isMatch: boolean;
  confidenceScore: number;
  voiceprintSimilarity: number;
  pitchDeviationHz: number;
  noiseAnalysis: NoiseAnalysisResult;
  rejectionReason?: string;
  verifiedAtIso: string;
  auditSignatureSha256: string;
}

export class VoiceBiometricValidator {
  public static computeSha256(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  public static analyzeAcousticNoise(
    frames: AudioSampleFrame[],
    ambientThresholdRms: number = 0.05
  ): NoiseAnalysisResult {
    if (!frames || frames.length === 0) {
      return {
        estimatedSnrDb: 0,
        ambientNoiseFloorDb: -60,
        speechActivityDetected: false,
        noiseSuppressionGainFactor: 1.0,
      };
    }

    const energies = frames.map((f) => f.rmsEnergy);
    const sortedEnergies = [...energies].sort((a, b) => a - b);
    // Lower 20th percentile estimated as noise floor
    const noiseFloorIdx = Math.max(0, Math.floor(sortedEnergies.length * 0.2));
    const noiseFloorRms = Math.max(0.0001, sortedEnergies[noiseFloorIdx]);

    const maxEnergy = Math.max(...energies);
    const snrLinear = maxEnergy / noiseFloorRms;
    const estimatedSnrDb = Math.round(20 * Math.log10(Math.max(1, snrLinear)) * 10) / 10;
    const ambientNoiseFloorDb = Math.round(20 * Math.log10(noiseFloorRms) * 10) / 10;

    const speechFrames = frames.filter((f) => f.rmsEnergy > ambientThresholdRms && f.dominantFrequencyHz >= 80 && f.dominantFrequencyHz <= 400);
    const speechDetected = speechFrames.length >= Math.max(1, Math.floor(frames.length * 0.25));

    // Dynamic noise suppression gain: if SNR is low, apply more aggressive attenuation
    let gainFactor = 1.0;
    if (estimatedSnrDb < 10) {
      gainFactor = 0.5;
    } else if (estimatedSnrDb < 20) {
      gainFactor = 0.75;
    }

    return {
      estimatedSnrDb,
      ambientNoiseFloorDb,
      speechActivityDetected: speechDetected,
      noiseSuppressionGainFactor: gainFactor,
    };
  }

  public static extractVoiceprint(frames: AudioSampleFrame[]): number[] {
    if (!frames || frames.length === 0) return [0, 0, 0, 0];

    const meanEnergy = frames.reduce((acc, f) => acc + f.rmsEnergy, 0) / frames.length;
    const meanZcr = frames.reduce((acc, f) => acc + f.zeroCrossingRate, 0) / frames.length;
    const meanCentroid = frames.reduce((acc, f) => acc + f.spectralCentroidHz, 0) / frames.length;
    const meanPitch = frames.reduce((acc, f) => acc + f.dominantFrequencyHz, 0) / frames.length;

    // Return normalized 4-D feature vector
    const vector = [meanEnergy * 10, meanZcr * 100, meanCentroid / 1000, meanPitch / 100];
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => Math.round((v / norm) * 10000) / 10000);
  }

  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    return Math.max(0, Math.min(1, Math.round((dot / denom) * 10000) / 10000));
  }

  public static validateDictation(
    profile: InspectorVoiceProfile,
    audioFrames: AudioSampleFrame[],
    verifiedAtIso?: string
  ): VoiceBiometricValidationResult {
    const verifiedAt = verifiedAtIso || new Date().toISOString();
    const noise = this.analyzeAcousticNoise(audioFrames);

    if (!noise.speechActivityDetected) {
      const validationId = `VAL-${this.computeSha256(`${profile.inspectorId}:${verifiedAt}`).substring(0, 10).toUpperCase()}`;
      return {
        validationId,
        inspectorId: profile.inspectorId,
        isMatch: false,
        confidenceScore: 0,
        voiceprintSimilarity: 0,
        pitchDeviationHz: 999,
        noiseAnalysis: noise,
        rejectionReason: "No voice activity detected above noise floor",
        verifiedAtIso: verifiedAt,
        auditSignatureSha256: this.computeSha256(`${validationId}:REJECTED:NO_VAD`),
      };
    }

    const sampleVector = this.extractVoiceprint(audioFrames);
    const similarity = this.cosineSimilarity(profile.voiceprintVector, sampleVector);

    const avgPitch = audioFrames.reduce((acc, f) => acc + f.dominantFrequencyHz, 0) / audioFrames.length;
    const pitchDeviation = Math.abs(avgPitch - profile.baselinePitchHz);

    const pitchScore = Math.max(0, 1 - pitchDeviation / (profile.pitchToleranceHz * 2));
    const confidenceScore = Math.round((similarity * 0.7 + pitchScore * 0.3) * 1000) / 1000;

    let isMatch = true;
    let rejectionReason: string | undefined;

    if (confidenceScore < profile.minimumMatchConfidence) {
      isMatch = false;
      rejectionReason = `Voice biometric confidence score ${confidenceScore} below threshold ${profile.minimumMatchConfidence}`;
    } else if (pitchDeviation > profile.pitchToleranceHz) {
      isMatch = false;
      rejectionReason = `Pitch deviation ${pitchDeviation.toFixed(1)}Hz exceeded tolerance ${profile.pitchToleranceHz}Hz`;
    }

    const validationId = `VAL-${this.computeSha256(`${profile.inspectorId}:${verifiedAt}`).substring(0, 10).toUpperCase()}`;
    const auditSignature = this.computeSha256(
      `${validationId}:${profile.inspectorId}:${isMatch}:${confidenceScore}:${noise.estimatedSnrDb}:${verifiedAt}`
    );

    return {
      validationId,
      inspectorId: profile.inspectorId,
      isMatch,
      confidenceScore,
      voiceprintSimilarity: similarity,
      pitchDeviationHz: Math.round(pitchDeviation * 10) / 10,
      noiseAnalysis: noise,
      rejectionReason,
      verifiedAtIso: verifiedAt,
      auditSignatureSha256: auditSignature,
    };
  }
}
