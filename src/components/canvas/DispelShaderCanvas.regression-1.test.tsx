import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DispelShaderCanvas } from "./DispelShaderCanvas";

vi.mock("@/lib/webgl", () => ({
  hasWebGLSupport: vi.fn(() => false),
  createWebGLRendererOrNull: vi.fn(),
}));

// Regression: QA-105 — Dispel crashed when WebGL was unavailable.
describe("DispelShaderCanvas WebGL fallback", () => {
  it("renders a static visual fallback without throwing", async () => {
    render(
      <DispelShaderCanvas filterMode="NORMAL" syntheticProbability={12} />
    );

    expect(await screen.findByTestId("dispel-shader-fallback")).toBeInTheDocument();
  });
});
