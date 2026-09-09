import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import {
  InboundWebhookSecurityEngine,
  InboundWebhookValidationOptions
} from "./inbound-webhook-security-engine";

describe("QA-146: Real-Time Third-Party Webhook Security & Signature Validation Engine", () => {
  beforeEach(() => {
    InboundWebhookSecurityEngine.resetNonceCache();
  });

  it("validates standard HMAC-SHA256 webhooks successfully", () => {
    const secret = "super-secret-vendor-token-1234";
    const payload = JSON.stringify({ event: "vendor.compliance_drift", score: 88 });
    const signature = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

    const result = InboundWebhookSecurityEngine.validate({
      provider: "standard_hmac_sha256",
      secret,
      rawPayload: payload,
      headers: {
        "x-signature-sha256": `sha256=${signature}`,
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.auditFingerprint).toHaveLength(16);
  });

  it("validates Stripe v1 timestamped signatures and detects replay/drift", () => {
    const secret = "whsec_test_stripe_secret_key_8899";
    const payload = JSON.stringify({ type: "customer.subscription.updated", id: "sub_991" });
    const nowSec = Math.floor(Date.now() / 1000);

    const signedPayload = `${nowSec}.${payload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

    // 1. Valid Stripe signature
    const validResult = InboundWebhookSecurityEngine.validate({
      provider: "stripe_v1",
      secret,
      rawPayload: payload,
      headers: {
        "stripe-signature": `t=${nowSec},v1=${sig}`,
      },
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.timestamp).toBe(nowSec);

    // 2. Replay attack should fail
    const replayResult = InboundWebhookSecurityEngine.validate({
      provider: "stripe_v1",
      secret,
      rawPayload: payload,
      headers: {
        "stripe-signature": `t=${nowSec},v1=${sig}`,
      },
    });
    expect(replayResult.isValid).toBe(false);
    expect(replayResult.reason).toContain("Replay attack detected");

    // 3. Stale timestamp exceeds tolerance (e.g. 10 minutes ago)
    const staleSec = nowSec - 600;
    const staleSigned = `${staleSec}.${payload}`;
    const staleSig = crypto.createHmac("sha256", secret).update(staleSigned, "utf8").digest("hex");

    const staleResult = InboundWebhookSecurityEngine.validate({
      provider: "stripe_v1",
      secret,
      rawPayload: payload,
      headers: {
        "stripe-signature": `t=${staleSec},v1=${staleSig}`,
      },
      toleranceSeconds: 300,
    });
    expect(staleResult.isValid).toBe(false);
    expect(staleResult.reason).toContain("Timestamp outside tolerance window");
  });

  it("validates GitHub sha256 delivery and rejects duplicates", () => {
    const secret = "gh-webhook-secret-token";
    const payload = JSON.stringify({ action: "completed", check_run: { conclusion: "success" } });
    const sig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

    const deliveryId = "7289b4f2-5c91-4e78-bc5a-e7c6b9dfa321";

    const res1 = InboundWebhookSecurityEngine.validate({
      provider: "github_sha256",
      secret,
      rawPayload: payload,
      headers: {
        "x-hub-signature-256": `sha256=${sig}`,
        "x-github-delivery": deliveryId,
      },
    });
    expect(res1.isValid).toBe(true);
    expect(res1.eventId).toBe(deliveryId);

    // Duplicate delivery ID
    const res2 = InboundWebhookSecurityEngine.validate({
      provider: "github_sha256",
      secret,
      rawPayload: payload,
      headers: {
        "x-hub-signature-256": `sha256=${sig}`,
        "x-github-delivery": deliveryId,
      },
    });
    expect(res2.isValid).toBe(false);
    expect(res2.reason).toContain("duplicate delivery ID");
  });
});
