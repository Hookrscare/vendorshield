import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("POST /api/billing/portal (QA-110 Regression)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("fails closed in production when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    (process.env as Record<string, string>).NODE_ENV = "production";

    const request = new NextRequest("https://vendorshield-blond.vercel.app/api/billing/portal", {
      method: "POST",
      body: JSON.stringify({ customerId: "cus_123" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("currently unconfigured");
  });

  it("provides simulated portal URL in non-production when unconfigured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    (process.env as Record<string, string>).NODE_ENV = "development";

    const request = new NextRequest("http://localhost:3000/api/billing/portal", {
      method: "POST",
      body: JSON.stringify({ customerId: "cus_mock" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.isSimulated).toBe(true);
    expect(data.url).toContain("portal_simulated=true");
  });

  it("returns 400 when STRIPE_SECRET_KEY is set but customerId is absent", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";

    const request = new NextRequest("https://vendorshield-blond.vercel.app/api/billing/portal", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("No customer account identified");
  });
});
