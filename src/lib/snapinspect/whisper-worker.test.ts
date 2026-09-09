import { describe, it, expect } from "vitest";
import {
  computeRmsEnergy,
  OfflineUtteranceSegmenter,
  OfflineWhisperPipeline,
  type TranscriptionJob
} from "./whisper-worker";

describe("SNAP-12: Offline Whisper Audio Transcription Worker", () => {
  it("computes RMS energy correctly", () => {
    const empty = new Float32Array([]);
    expect(computeRmsEnergy(empty)).toBe(0.0);

    const silent = new Float32Array([0.0, 0.0, 0.0, 0.0]);
    expect(computeRmsEnergy(silent)).toBe(0.0);

    const uniform = new Float32Array([0.5, -0.5, 0.5, -0.5]);
    expect(computeRmsEnergy(uniform)).toBeCloseTo(0.5);
  });

  it("segments continuous streaming speech frames based on silence thresholds", () => {
    const segmenter = new OfflineUtteranceSegmenter({
      sampleRate: 16000,
      energyThreshold: 0.02,
      silenceTimeoutMs: 64 // ~2 frames of 512 samples
    });

    const activeFrame = new Float32Array(512).fill(0.08); // High energy speech
    const silentFrame = new Float32Array(512).fill(0.001); // Silence

    // Push 3 active speech frames
    expect(segmenter.processFrame(activeFrame).utteranceReady).toBe(false);
    expect(segmenter.processFrame(activeFrame).utteranceReady).toBe(false);
    expect(segmenter.processFrame(activeFrame).utteranceReady).toBe(false);

    // Push silence frames until timeout triggers utterance completion
    expect(segmenter.processFrame(silentFrame).utteranceReady).toBe(false);
    const completed = segmenter.processFrame(silentFrame);

    expect(completed.utteranceReady).toBe(true);
    expect(completed.audioChunk).toBeDefined();
    expect(completed.audioChunk!.length).toBe(512 * 5); // 3 speech + 2 trailing silence
  });

  it("flushes remaining buffered audio on demand", () => {
    const segmenter = new OfflineUtteranceSegmenter();
    const activeFrame = new Float32Array(512).fill(0.1);
    segmenter.processFrame(activeFrame);

    const flushed = segmenter.flush();
    expect(flushed).not.toBeNull();
    expect(flushed!.length).toBe(512);

    // Second flush should be empty
    expect(segmenter.flush()).toBeNull();
  });

  it("processes transcription jobs and generates parsed defects", () => {
    const pipeline = new OfflineWhisperPipeline();

    const job: TranscriptionJob = {
      jobId: "job-001",
      inspectorId: "insp-marcus",
      trade: "commercial_hvac",
      audioSamples: new Float32Array(16000 * 3), // 3 seconds
      sampleRate: 16000,
      durationMs: 3000
    };

    pipeline.enqueueJob(job);
    expect(pipeline.queueLength).toBe(1);

    const result = pipeline.processNextJob(
      "Safety hazard exposed high voltage wiring in main electrical panel 4"
    );

    expect(result).not.toBeNull();
    expect(result!.jobId).toBe("job-001");
    expect(result!.confidence).toBeGreaterThan(0.9);
    expect(result!.audioDurationMs).toBe(3000);
    expect(result!.realTimeFactor).toBeLessThan(1.0); // Faster than real-time

    // Defect parsing verification
    const defect = result!.parsedDefect;
    expect(defect.severity).toBe("Safety Hazard");
    expect(defect.category).toContain("Electrical");
    expect(pipeline.queueLength).toBe(0);
  });
});
