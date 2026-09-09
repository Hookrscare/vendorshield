/**
 * Unit tests for SNAP-28: Real-Time Acoustic Echo Cancellation & Reverberation Suppression.
 */

import { describe, it, expect } from "vitest";
import {
  AcousticEchoCancellationFilter,
  AECFilterConfig
} from "./acoustic-echo-cancellation";

describe("SNAP-28: AcousticEchoCancellationFilter", () => {
  it("cancels simulated acoustic echo and reduces output energy significantly", () => {
    const filter = new AcousticEchoCancellationFilter({
      filterLength: 32,
      stepSize: 0.2,
      nlpSuppressionGain: 0.05
    });

    const numSamples = 500;
    const farEndReference: number[] = [];
    const micSignal: number[] = [];

    // Synthesize reference audio (e.g. 440 Hz tone) and echoed version with delay
    const delay = 5;
    for (let i = 0; i < numSamples; i++) {
      const ref = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.3;
      farEndReference.push(ref);
    }

    // Microphone picks up attenuated/delayed far-end echo + small background hiss
    for (let i = 0; i < numSamples; i++) {
      const echo = i >= delay ? farEndReference[i - delay] * 0.6 : 0.0;
      const noise = (Math.random() - 0.5) * 0.01;
      micSignal.push(echo + noise);
    }

    const result = filter.processFrame(micSignal, farEndReference);

    expect(result.cleanedSignal.length).toBe(numSamples);
    expect(result.doubleTalkDetected).toBe(false);
    expect(result.residualAttenuationDb).toBeGreaterThan(5.0);
    expect(result.telemetryHashSha256).toHaveLength(64);
  });

  it("detects double-talk when near-end inspector speaks and preserves speech fidelity", () => {
    const filter = new AcousticEchoCancellationFilter({
      filterLength: 32,
      geigelThresholdDb: 4.0
    });

    const numSamples = 400;
    const farEndReference: number[] = [];
    const micSignal: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      // Quiet far-end signal
      farEndReference.push(Math.sin(i * 0.1) * 0.05);
      // Loud near-end inspector voice command
      const inspectorVoice = Math.sin((2 * Math.PI * 220 * i) / 16000) * 0.7;
      micSignal.push(inspectorVoice);
    }

    const result = filter.processFrame(micSignal, farEndReference);

    expect(result.doubleTalkDetected).toBe(true);
    // When double talk occurs, inspector speech should NOT be aggressively suppressed
    const avgCleanedMag =
      result.cleanedSignal.reduce((sum, s) => sum + Math.abs(s), 0) / numSamples;
    expect(avgCleanedMag).toBeGreaterThan(0.2);
  });

  it("correctly classifies acoustic room environment based on input RMS", () => {
    const filter = new AcousticEchoCancellationFilter({ filterLength: 16 });

    // 1. High-decibel chiller room
    const loudSamples = new Array(200).fill(0.5);
    const refSamples = new Array(200).fill(0.1);
    const r1 = filter.processFrame(loudSamples, refSamples);
    expect(r1.classifiedRoom).toBe("HIGH_DECIBEL_CHILLER_ROOM");

    // 2. Quiet survey zone
    filter.reset();
    const quietSamples = new Array(200).fill(0.02);
    const r2 = filter.processFrame(quietSamples, refSamples);
    expect(r2.classifiedRoom).toBe("QUIET_SURVEY_ZONE");
  });

  it("throws an error when empty microphone signal is supplied", () => {
    const filter = new AcousticEchoCancellationFilter();
    expect(() => filter.processFrame([], [])).toThrow("Microphone input signal cannot be empty");
  });
});
