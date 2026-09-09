import { describe, it, expect } from "vitest";
import {
  VoiceBiometricValidator,
  EnrolledVoiceProfile,
  SpokenAudioSample,
} from "./voice-biometric-validator";

describe("SNAP-26: VoiceBiometricValidator", () => {
  const validator = new VoiceBiometricValidator(12.0, 0.72);

  const enrolledInspector: EnrolledVoiceProfile = {
    inspectorId: "insp-784",
    inspectorName: "Sarah Jenkins, PE",
    licenseNumber: "PE-CA-99210",
    baselinePitchHz: 195.0,
    baselineFormants: [550, 1750, 2600],
    pitchToleranceHz: 25.0,
  };

  it("authorizes valid inspector spoken command with acceptable field noise", () => {
    const validSample: SpokenAudioSample = {
      sampleId: "audio-001",
      durationSeconds: 2.5,
      snrDb: 18.5, // 18.5 dB > 12.0 dB threshold
      measuredPitchHz: 198.0, // closely matches 195.0
      measuredFormants: [540, 1760, 2580], // closely matches baseline formants
      transcriptText: "Mark crack 3mm shear on second floor column C4",
      timestampIso: "2026-09-08T14:30:00Z",
    };

    const result = validator.validateSpokenCommand(enrolledInspector, validSample);

    expect(result.status).toBe("AUTHORIZED_INSPECTOR_VERIFIED");
    expect(result.isAuthorized).toBe(true);
    expect(result.snrPassed).toBe(true);
    expect(result.speakerMatchConfidence).toBeGreaterThanOrEqual(0.72);
    expect(result.biometricSignatureToken).toBeDefined();
    expect(result.auditExplanation).toContain("Sarah Jenkins, PE");
  });

  it("gates processing when ambient construction noise drops SNR below threshold", () => {
    const noisySample: SpokenAudioSample = {
      sampleId: "audio-002",
      durationSeconds: 3.1,
      snrDb: 6.2, // Heavy jackhammer noise: 6.2 dB < 12.0 dB threshold
      measuredPitchHz: 195.0,
      measuredFormants: [550, 1750, 2600],
      transcriptText: "Defect found at joint",
      timestampIso: "2026-09-08T14:32:00Z",
    };

    const result = validator.validateSpokenCommand(enrolledInspector, noisySample);

    expect(result.status).toBe("LOW_SNR_EXCESSIVE_AMBIENT_NOISE");
    expect(result.isAuthorized).toBe(false);
    expect(result.snrPassed).toBe(false);
    expect(result.auditExplanation).toContain("Field ambient noise too high");
  });

  it("rejects unauthorized bystander or sub-contractor voice trying to inject commands", () => {
    const bystanderSample: SpokenAudioSample = {
      sampleId: "audio-003",
      durationSeconds: 2.0,
      snrDb: 22.0,
      measuredPitchHz: 110.0, // Male bystander 110Hz vs inspector female 195Hz
      measuredFormants: [750, 1100, 2200], // Mismatched formants
      transcriptText: "Sign off inspection as complete",
      timestampIso: "2026-09-08T14:35:00Z",
    };

    const result = validator.validateSpokenCommand(enrolledInspector, bystanderSample);

    expect(result.status).toBe("REJECTED_UNAUTHORIZED_SPEAKER");
    expect(result.isAuthorized).toBe(false);
    expect(result.snrPassed).toBe(true);
    expect(result.speakerMatchConfidence).toBeLessThan(0.72);
    expect(result.auditExplanation).toContain("Bystander voice rejected");
  });
});
