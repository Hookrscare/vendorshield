import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Regression: ISSUE-002 — production checkout redirected to a simulated Vercel URL
// Found by /qa on 2026-08-23
// Report: .gstack/qa-reports/qa-report-vendorshield-blond-vercel-app-2026-08-23.md

function checkoutRequest(planId = "vendorshield-startup") {
  return new NextRequest("https://vendorshield-blond.vercel.app/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planId }),
  });
}

describe("POST /api/checkout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fails closed in production when Stripe is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const response = await POST(checkoutRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      error: "Secure checkout is temporarily unavailable. Please try again shortly.",
    });
    expect(body.url).toBeUndefined();
  });

  it("returns the Stripe-hosted URL when session creation succeeds", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example");
    const stripeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_example" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const response = await POST(checkoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_example",
    });
    expect(stripeFetch).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/checkout/sessions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("prefers the stable Vercel production domain over an ephemeral deployment URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "vendorshield-blond.vercel.app");
    vi.stubEnv("VERCEL_URL", "vendorshield-preview-abc123.vercel.app");
    const stripeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_example" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await POST(checkoutRequest());

    const requestInit = stripeFetch.mock.calls[0][1];
    const body = new URLSearchParams(requestInit?.body as string);
    expect(body.get("success_url")).toBe(
      "https://vendorshield-blond.vercel.app/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}"
    );
    expect(body.get("cancel_url")).toBe(
      "https://vendorshield-blond.vercel.app/#pricing"
    );
  });

  it("keeps simulation available for local development only", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const response = await POST(
      new NextRequest("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: "dispel-pro" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isSimulated).toBe(true);
    expect(body.url).toContain("http://localhost:3000/dashboard?payment_simulated=true");
  });
});
