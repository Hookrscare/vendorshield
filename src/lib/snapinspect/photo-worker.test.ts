// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  calculateAspectRatioFit,
  estimateBase64SizeBytes,
} from "./photo-worker";

describe("SNAP-03: Multi-Photo Batch Compression & Aspect Ratio Calculations", () => {
  it("scales down oversized landscape photos preserving ratio", () => {
    // 4000 x 3000 photo with max 1920 x 1080
    const { width, height } = calculateAspectRatioFit(4000, 3000, 1920, 1080);
    expect(width).toBeLessThanOrEqual(1920);
    expect(height).toBeLessThanOrEqual(1080);
    // Aspect ratio 4:3
    expect(Number((width / height).toFixed(2))).toBe(1.33);
  });

  it("scales down portrait photos preserving ratio", () => {
    // 3000 x 4000 photo with max 1920 x 1080
    const { width, height } = calculateAspectRatioFit(3000, 4000, 1920, 1080);
    expect(width).toBeLessThanOrEqual(1920);
    expect(height).toBeLessThanOrEqual(1080);
  });

  it("leaves photos smaller than max dimensions unchanged", () => {
    const { width, height } = calculateAspectRatioFit(800, 600, 1920, 1080);
    expect(width).toBe(800);
    expect(height).toBe(600);
  });

  it("estimates base64 image byte size accurately", () => {
    // Raw string length of 100 base64 chars represents ~75 bytes
    const dummyBase64 = "data:image/jpeg;base64," + "A".repeat(100);
    const estimated = estimateBase64SizeBytes(dummyBase64);
    expect(estimated).toBe(75);
  });
});
