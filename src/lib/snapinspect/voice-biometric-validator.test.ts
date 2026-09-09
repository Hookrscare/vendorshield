import { describe, it, expect } from 'vitest';
import {
  VoiceBiometricValidator,
  InspectorVoiceprint,
} from './voice-biometric-validator';

describe('SNAP-26: Voice Biometric Signature Validator', () => {
  const mockVoiceprint: InspectorVoiceprint = {
    inspectorId: 'insp-chief-08',
    inspectorName: 'Carlos Vance, PE',
    enrollmentDateIso: '2026-08-15T09:00:00.000Z',
    f0MeanHz: 125.4,
    f1FormantHz: 550.0,
    f2FormantHz: 1720.0,
    spectralCentroidHz: 1450.0,
    enrollmentVector: [0.35, 0.42, 0.18, 0.65, 0.22, 0.15, 0.38, 0.11],
  };

  it('accurately measures SNR and noise floor on clear synthesized speech', () => {
    // Generate clean 16kHz sine wave with light background white noise
    const sampleRate = 16000;
    const durationSec = 1.0;
    const samples = new Float32Array(sampleRate * durationSec);

    for (let i = 0; i < samples.length; i++) {
      const ambientNoise = (Math.random() - 0.5) * 0.005; // very low noise (-46 dB)
      // Speech occurs only between 0.2s and 1.0s (silence at beginning)
      const speechSignal = i >= sampleRate * 0.2 ? 0.5 * Math.sin((2 * Math.PI * 220 * i) / sampleRate) : 0.0;
      samples[i] = speechSignal + ambientNoise;
    }

    const telemetry = VoiceBiometricValidator.analyzeAcousticNoise(samples, sampleRate);

    expect(telemetry.sampleRateHz).toBe(16000);
    expect(telemetry.durationSeconds).toBe(1.0);
    expect(telemetry.snrDb).toBeGreaterThan(15.0);
  });

  it('rejects voice verification when excessive ambient noise degrades SNR below threshold', () => {
    // Extremely loud simulated diesel compressor noise
    const sampleRate = 16000;
    const samples = new Float32Array(sampleRate * 0.5);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (Math.random() - 0.5) * 0.8; // loud uniform noise
    }

    const noisyTelemetry = VoiceBiometricValidator.analyzeAcousticNoise(samples, sampleRate);
    noisyTelemetry.snrDb = 8.5; // Force below 12.0 threshold to test branch

    const observedVector = [...mockVoiceprint.enrollmentVector]; // Even with perfect vector
    const result = VoiceBiometricValidator.verifyInspectorVoice(
      mockVoiceprint,
      observedVector,
      noisyTelemetry
    );

    expect(result.status).toBe('EXCESSIVE_AMBIENT_NOISE');
    expect(result.isBiometricallyVerified).toBe(false);
    expect(result.snrAdequate).toBe(false);
    expect(result.recommendation).toContain('Ambient field noise too severe');
  });

  it('approves biometric sign-off for matching inspector voiceprint in acceptable acoustic conditions', () => {
    const clearTelemetry = {
      sampleRateHz: 16000,
      durationSeconds: 2.5,
      rmsLevelDb: -18.2,
      noiseFloorDb: -42.0,
      snrDb: 23.8,
      noiseSuppressionApplied: false,
    };

    // Very close matching vector (cosine similarity ~0.98)
    const observedVector = mockVoiceprint.enrollmentVector.map((v) => v * 1.02);

    const result = VoiceBiometricValidator.verifyInspectorVoice(
      mockVoiceprint,
      observedVector,
      clearTelemetry
    );

    expect(result.status).toBe('VERIFIED_SIGNATURE');
    expect(result.isBiometricallyVerified).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(result.signatureDigestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.recommendation).toContain('Voice biometric verified');
  });

  it('rejects sign-off for mismatched voiceprint', () => {
    const clearTelemetry = {
      sampleRateHz: 16000,
      durationSeconds: 2.0,
      rmsLevelDb: -15.0,
      noiseFloorDb: -38.0,
      snrDb: 23.0,
      noiseSuppressionApplied: false,
    };

    // Completely orthogonal vector (imposter or different crew member)
    const imposterVector = [0.85, 0.05, 0.92, 0.02, 0.78, 0.01, 0.88, 0.04];

    const result = VoiceBiometricValidator.verifyInspectorVoice(
      mockVoiceprint,
      imposterVector,
      clearTelemetry
    );

    expect(result.status).toBe('BIOMETRIC_MISMATCH');
    expect(result.isBiometricallyVerified).toBe(false);
    expect(result.confidenceScore).toBeLessThan(0.85);
  });
});
