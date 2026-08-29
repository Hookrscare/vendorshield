import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DefectModal } from "./DefectModal";

// Regression: QA-105 — the defect editor lacked dialog semantics and a named close control.
describe("DefectModal accessibility", () => {
  it("exposes an accessible modal and close button", () => {
    render(
      <DefectModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        trade="residential"
      />
    );

    expect(
      screen.getByRole("dialog", { name: /Log Inspection Defect.*AI Voice Enabled/ })
    ).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("button", { name: "Close defect dialog" })
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Defect Title/ })).toBeRequired();
    expect(screen.getByRole("combobox", { name: /System Category/ })).toBeInTheDocument();
  });
});
