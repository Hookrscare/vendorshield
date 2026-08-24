import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn().mockResolvedValue(Buffer.from("paid toolkit")),
  };
});

import { GET } from "./route";

// Regression: ISSUE-003 — paid toolkit files were public before checkout
// Found by /qa on 2026-08-23
// Report: .gstack/qa-reports/qa-report-vendorshield-blond-vercel-app-2026-08-23.md

function downloadRequest(sessionId?: string) {
  const url = new URL(
    "https://vendorshield-blond.vercel.app/api/downloads/inspector-toolkit"
  );
  if (sessionId) url.searchParams.set("session_id", sessionId);
  return new NextRequest(url);
}

describe("GET /api/downloads/inspector-toolkit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects download requests without a checkout session", async () => {
    const response = await GET(downloadRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "A valid paid checkout session is required",
    });
  });

  it("rejects sessions that are not paid for the toolkit plan", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          payment_status: "unpaid",
          metadata: { planId: "inspector-toolkit" },
        }),
        { status: 200 }
      )
    );

    const response = await GET(downloadRequest("cs_test_unpaid123"));

    expect(response.status).toBe(403);
  });

  it("serves the archive only after Stripe confirms toolkit payment", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          payment_status: "paid",
          metadata: { planId: "inspector-toolkit" },
        }),
        { status: 200 }
      )
    );

    const response = await GET(downloadRequest("cs_test_paid123"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toContain(
      "inspector-business-toolkit-2026.zip"
    );
  });
});
