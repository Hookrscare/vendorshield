import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const WEBHOOK_SECRET = "whsec_test_regression_secret";

function signedRequest(payload: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return new NextRequest("https://vendorshield-blond.vercel.app/api/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
}

describe("POST /api/webhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("accepts a correctly signed checkout event without logging customer email", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const payload = JSON.stringify({
      id: "evt_test_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          customer_details: { email: "customer@example.com" },
          metadata: { planId: "vendorshield-startup" },
        },
      },
    });

    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(log).toHaveBeenCalledWith(
      "[Stripe Webhook] Checkout completed (Event: evt_test_checkout_completed, Plan: vendorshield-startup)"
    );
    expect(log.mock.calls.flat().join(" ")).not.toContain("customer@example.com");
  });

  it("rejects requests when the webhook secret is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(signedRequest("{}"));

    expect(response.status).toBe(503);
  });

  it("rejects stale signatures outside the five-minute tolerance", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    const staleTimestamp = Math.floor(Date.now() / 1000) - 301;

    const response = await POST(signedRequest("{}", staleTimestamp));

    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON even when the signature is valid", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);

    const response = await POST(signedRequest("not-json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
  });
});
