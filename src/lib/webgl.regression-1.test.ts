import { describe, expect, it, vi } from "vitest";
import { createWebGLRendererOrNull, hasWebGLSupport } from "./webgl";

// Regression: ISSUE-001 — Three.js renderer failure crashed entire pages
// Found by /qa on 2026-08-23
// Report: .gstack/qa-reports/qa-report-vendorshield-blond-vercel-app-2026-08-23.md

describe("createWebGLRendererOrNull", () => {
  it("returns null instead of throwing when WebGL context creation fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failingFactory = vi.fn(() => {
      throw new Error("Error creating WebGL context");
    });

    const renderer = createWebGLRendererOrNull(
      { alpha: true },
      failingFactory as never
    );

    expect(renderer).toBeNull();
    expect(failingFactory).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      "WebGL is unavailable; using the static visual fallback.",
      expect.any(Error)
    );
    warn.mockRestore();
  });

  it("returns the renderer when context creation succeeds", () => {
    const expectedRenderer = { render: vi.fn() };
    const renderer = createWebGLRendererOrNull(
      { antialias: true },
      (() => expectedRenderer) as never
    );

    expect(renderer).toBe(expectedRenderer);
  });
});

describe("hasWebGLSupport", () => {
  it("returns false without invoking Three.js when no context is available", () => {
    const canvasFactory = () =>
      ({ getContext: vi.fn().mockReturnValue(null) } as unknown as HTMLCanvasElement);

    expect(hasWebGLSupport(canvasFactory)).toBe(false);
  });

  it("returns true when the browser can create a WebGL context", () => {
    const canvasFactory = () =>
      ({
        getContext: vi.fn((kind: string) =>
          kind === "webgl2" ? { drawingBufferWidth: 1 } : null
        ),
      } as unknown as HTMLCanvasElement);

    expect(hasWebGLSupport(canvasFactory)).toBe(true);
  });
});
