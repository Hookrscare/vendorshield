import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

// Regression: ISSUE-005 — legal footer labels were not links
// Found by /qa on 2026-08-23
// Report: .gstack/qa-reports/qa-report-vendorshield-blond-vercel-app-2026-08-23.md

describe("Footer legal navigation", () => {
  it("links users to the privacy policy and terms of service", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/terms"
    );
  });
});
