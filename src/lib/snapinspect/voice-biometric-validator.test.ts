import { describe, it, expect } from "vitest";
import {
  VoiceBiometricValidator,
  AudioSampleFrame,
  InspectorVoiceProfile,
} from "./voice-biometric-validator";

describe("SNAP-26: Field Speech Noise Canceling Voice Biometric Signature Validator", () => {
  const sampleFrames: AudioSampleFrame[] = [
    { timestampMs: 0, rmsEnergy: 0.12, zeroCrossingRate: 0.08, spectralCentroidHz: 1200, dominantFrequencyHz: 140 },
    { timestampMs: 100, rmsEnergy: 0.15, zeroCrossingRate: 0.09, spectralCentroidHz: 1250, dominantFrequencyHz: 142 },
    { timestampMs: 200, rmsEnergy: 0.14, zeroCrossingRate: 0.085, spectralCentroidHz: 1220, dominantFrequencyHz: 139 },
    { timestampMs: 300, rmsEnergy: 0.02, zeroCrossingRate: 0.03, spectralCentroidHz: 600, dominantFrequencyHz: 60 }, // background noise pause
  ];

  const profile: InspectorVoiceProfile = {
    inspectorId: "INSP-4091",
    inspectorName: "Marcus Vance",
    enrolledAtIso: "2026-08-15T08:00:00.000Z",
    baselinePitchHz: 140,
    pitchToleranceHz: 20,
    voiceprintVector: VoiceBiometricValidator.extractVoiceprint(sampleFrames),
    minimumMatchConfidence: 0.75,
  };

  it("should analyze acoustic noise floor and calculate positive SNR", () => {
    const noise = VoiceBiometricValidator.analyzeAcousticNoise(sampleFrames);
    expect(noise.speechActivityDetected).toBe(true);
    expect(noise.estimatedSnrDb).toBeGreaterThan(0);
    expect(noise.noiseSuppressionGainFactor).toBeGreaterThan(0);
  });

  it("should match authentic inspector dictation and generate audit signature", () => {
    const result = VoiceBiometricValidator.validateDictation(profile, sampleFrames, "2026-09-09T03:00:00.000Z");
    expect(result.isMatch).toBe(true);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.75);
    expect(result.voiceprintSimilarity).toBeGreaterThan(0.95);
    expect(result.validationId).toMatch(/^VAL-[A-F0-9]{10}$/);
    expect(result.auditSignatureSha256).toHaveLength(64);
    expect(result.rejectionReason).toBeUndefined();
  });

  it("should reject dictation when voice biometric does not match enrolled profile", () => {
    // Foreign voice with drastically different pitch and centroid
    const imposterFrames: AudioSampleFrame[] = [
      { timestampMs: 0, rmsEnergy: 0.2, zeroCrossingRate: 0.25, spectralCentroidHz: 2800, dominantFrequencyHz: 260 },
      { timestampMs: 100, rmsEnergy: 0.22, zeroCrossingRate: 0.27, spectralCentroidHz: 2900, dominantFrequencyHz: 265 },
      { timestampMs: 200, rmsEnergy: 0.19, zeroCrossingRate: 0.24, spectralCentroidHz: 2750, dominantFrequencyHz: 258 },
    ];

    const result = VoiceBiometricValidator.validateDictation(profile, imposterFrames, "2026-09-09T03:00:00.000Z");
    expect(result.isMatch).toBe(false);
    expect(result.rejectionReason).toBeDefined();
  });

  it("should reject audio frames with no speech activity detected", () => {
    const silentNoiseFrames: AudioSampleFrame[] = [
      { timestampMs: 0, rmsEnergy: 0.01, zeroCrossingRate: 0.01, spectralCentroidHz: 150, dominantFrequencyHz: 40 },
      { timestampMs: 100, rmsEnergy: 0.01, zeroCrossingRate: 0.01, spectralCentroidHz: 160, dominantFrequencyHz: 40 },
    ];

    const result = VoiceBiometricValidator.validateDictation(profile, silentNoiseFrames);
    expect(result.isMatch).toBe(false);
    expect(result.rejectionReason).toContain("No voice activity detected");
  });
});
