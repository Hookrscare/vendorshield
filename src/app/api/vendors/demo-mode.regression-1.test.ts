import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { PUT as UPDATE_VENDOR, DELETE as DELETE_VENDOR } from "./[id]/route";
import { PUT as UPDATE_COMPANY } from "../company/route";

// Regression: ISSUE-004 — public visitors could use dashboard mutation APIs
// Found by /qa on 2026-08-23
// Report: .gstack/qa-reports/qa-report-vendorshield-blond-vercel-app-2026-08-23.md

describe("production dashboard demo write protection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    [
      "creates a vendor",
      () =>
        POST(
          new NextRequest("https://vendorshield-blond.vercel.app/api/vendors", {
            method: "POST",
            body: JSON.stringify({ name: "Attacker", category: "Developer Tools & CI/CD" }),
          })
        ),
    ],
    [
      "updates a vendor",
      () =>
        UPDATE_VENDOR(
          new NextRequest("https://vendorshield-blond.vercel.app/api/vendors/vendor-1", {
            method: "PUT",
            body: JSON.stringify({ name: "Changed" }),
          }),
          { params: Promise.resolve({ id: "vendor-1" }) }
        ),
    ],
    [
      "deletes a vendor",
      () =>
        DELETE_VENDOR(
          new NextRequest("https://vendorshield-blond.vercel.app/api/vendors/vendor-1", {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: "vendor-1" }) }
        ),
    ],
    [
      "updates company settings",
      () =>
        UPDATE_COMPANY(
          new NextRequest("https://vendorshield-blond.vercel.app/api/company", {
            method: "PUT",
            body: JSON.stringify({ name: "Changed" }),
          })
        ),
    ],
  ])("blocks a public request that %s", async (_name, requestFactory) => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await requestFactory();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "The public dashboard is a read-only product demo.",
    });
  });
});
