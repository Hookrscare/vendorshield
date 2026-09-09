// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { computeAudioLevel, formatAudioMeterBars } from "./audio-meter";

describe("snapinspect audio-meter (SNAP-05 Client-Side Audio Level Meter HUD)", () => {
  it("handles pure silence gracefully", () => {
    const silence = new Float32Array(512); // All zeros
    const res = computeAudioLevel(silence);

    expect(res.rms).toBe(0.0);
    expect(res.peak).toBe(0.0);
    expect(res.status).toBe("SILENCE");
    expect(res.vadDetected).toBe(false);

    const bars = formatAudioMeterBars(res, 8);
    expect(bars.activeBars).toBe(0);
    expect(bars.label).toContain("Silence");
  });

  it("classifies optimal vocal level and detects voice activity", () => {
    // Generate synthetic speech-range tone (approx 300 Hz at 16kHz sample rate)
    // 512 samples with amplitude 0.35 (-9.1 dBFS)
    const samples = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      samples[i] = 0.35 * Math.sin((2 * Math.PI * 300 * i) / 16000);
    }

    const res = computeAudioLevel(samples);

    expect(res.status).toBe("OPTIMAL");
    expect(res.peakDb).toBeCloseTo(-9.1, 0.5);
    expect(res.vadDetected).toBe(true);
    expect(res.zeroCrossingRate).toBeGreaterThan(0.02);

    const bars = formatAudioMeterBars(res, 8);
    expect(bars.activeBars).toBeGreaterThanOrEqual(2);
    expect(bars.colorClass).toContain("emerald");
    expect(bars.label).toContain("Voice Ready");
  });

  it("detects audio clipping and applies red warning bar styles", () => {
    const clippingSamples = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      clippingSamples[i] = 1.0; // Max square wave saturation
    }

    const res = computeAudioLevel(clippingSamples);

    expect(res.status).toBe("CLIPPING");
    expect(res.peakDb).toBe(0.0);

    const bars = formatAudioMeterBars(res, 8);
    expect(bars.colorClass).toContain("rose");
    expect(bars.label).toContain("Clipping");
  });

  it("flags low signal level when mic input is too quiet", () => {
    const quietSamples = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      quietSamples[i] = 0.03 * Math.sin((2 * Math.PI * 250 * i) / 16000); // ~ -30 dBFS
    }

    const res = computeAudioLevel(quietSamples);

    expect(res.status).toBe("LOW_SIGNAL");

    const bars = formatAudioMeterBars(res, 8);
    expect(bars.colorClass).toContain("amber");
    expect(bars.label).toContain("Speak Louder");
  });
});
