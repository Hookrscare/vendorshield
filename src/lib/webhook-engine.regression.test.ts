import { describe, it, expect, vi } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
  createDPAChangeEvent,
  dispatchWebhookEvent,
  WebhookEndpoint,
} from "./webhook-engine";

describe("QA-112: Multi-Tenant DPA Change Notification Webhook Engine", () => {
  const testSecret = "whsec_test_abc123xyz789";

  it("generates and verifies HMAC-SHA256 signature correctly", () => {
    const payload = JSON.stringify({ test: "compliance_update", amount: 100 });
    const signature = signWebhookPayload(payload, testSecret);

    expect(signature.startsWith("sha256=")).toBe(true);
    expect(verifyWebhookSignature(payload, signature, testSecret)).toBe(true);
  });

  it("rejects tampered payloads or mismatched secrets", () => {
    const payload = JSON.stringify({ test: "original_payload" });
    const signature = signWebhookPayload(payload, testSecret);

    const tamperedPayload = JSON.stringify({ test: "tampered_payload" });
    expect(verifyWebhookSignature(tamperedPayload, signature, testSecret)).toBe(false);
    expect(verifyWebhookSignature(payload, signature, "wrong_secret")).toBe(false);
  });

  it("constructs compliant DPA change event with effective notice date", () => {
    const event = createDPAChangeEvent(
      "tenant-acme",
      "subprocessor.added",
      { name: "Pinecone Vector DB", category: "Database & Storage" },
      "Added Pinecone for enterprise vector similarity searches.",
      30
    );

    expect(event.eventId.startsWith("evt_")).toBe(true);
    expect(event.tenantId).toBe("tenant-acme");
    expect(event.eventType).toBe("subprocessor.added");
    expect(event.effectiveDate).toBeDefined();

    // Verify 30-day notice calculation
    const now = new Date();
    const expectedYear = now.getFullYear();
    expect(event.effectiveDate.startsWith(`${expectedYear}`)).toBe(true);
  });

  it("successfully dispatches webhook with signature headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    const endpoint: WebhookEndpoint = {
      id: "ep_1",
      tenantId: "tenant-acme",
      url: "https://api.customer.example/webhooks/dpa",
      secret: testSecret,
      isActive: true,
      subscribedEvents: ["subprocessor.added", "dpa.terms_updated"],
    };

    const event = createDPAChangeEvent(
      "tenant-acme",
      "subprocessor.added",
      { name: "Supabase" },
      "New Postgres sub-processor added"
    );

    const result = await dispatchWebhookEvent(event, endpoint, mockFetch as any);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.attempts).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.customer.example/webhooks/dpa");
    expect(calledOptions.headers["x-vendorshield-event"]).toBe("subprocessor.added");
    expect(calledOptions.headers["x-vendorshield-signature"]).toBeDefined();
  });

  it("skips delivery if endpoint is unsubscribed from event type", async () => {
    const mockFetch = vi.fn();
    const endpoint: WebhookEndpoint = {
      id: "ep_2",
      tenantId: "tenant-acme",
      url: "https://api.customer.example/webhooks/dpa",
      secret: testSecret,
      isActive: true,
      subscribedEvents: ["subprocessor.removed"], // not subscribed to added
    };

    const event = createDPAChangeEvent(
      "tenant-acme",
      "subprocessor.added",
      { name: "Supabase" },
      "New Postgres sub-processor added"
    );

    const result = await dispatchWebhookEvent(event, endpoint, mockFetch as any);
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retries up to maxAttempts on failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection reset"));
    const endpoint: WebhookEndpoint = {
      id: "ep_3",
      tenantId: "tenant-acme",
      url: "https://flaky.customer.example/dpa",
      secret: testSecret,
      isActive: true,
      subscribedEvents: ["subprocessor.added"],
    };

    const event = createDPAChangeEvent(
      "tenant-acme",
      "subprocessor.added",
      { name: "OpenAI" },
      "Updated model tier terms"
    );

    const result = await dispatchWebhookEvent(event, endpoint, mockFetch as any, 3);
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
