import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  normalizeEmail,
  normalizeName,
  normalizeOtp,
  slugifyOrganizationName,
} from "./validation";

describe("auth validation", () => {
  it("normalizes and validates email addresses", () => {
    expect(normalizeEmail("  Founder@Example.COM ")).toBe("founder@example.com");
    expect(isValidEmail("founder@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("normalizes names and verification codes", () => {
    expect(normalizeName("  Acme   Security  ")).toBe("Acme Security");
    expect(normalizeOtp("12 34-56x")).toBe("123456");
  });

  it("creates database-safe organization slugs", () => {
    expect(slugifyOrganizationName("  Acmé Risk & Compliance, Inc. ")).toBe(
      "acme-risk-compliance-inc"
    );
  });
});
