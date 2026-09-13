/**
 * Regression Test Suite for QA-169: Autonomous Third-Party Vendor API Token Exhaustion & Rate-Limit Circuit Breaker.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import { VendorApiCircuitBreaker } from "./vendor-api-circuit-breaker";

describe("QA-169: Vendor API Circuit Breaker", () => {
  it("allows execution when vendor is healthy (CLOSED state)", () => {
    const cb = new VendorApiCircuitBreaker({
      vendorId: "OKTA_SSO_API",
      maxConsecutiveFailures: 3,
      resetTimeoutMs: 5000
    });

    const res = cb.executeOrFallback(200);

    expect(res.state).toBe("CLOSED");
    expect(res.requestAllowed).toBe(true);
    expect(res.servedFromCache).toBe(false);
    expect(res.auditHash).toHaveLength(64);
  });

  it("trips circuit to OPEN immediately on HTTP 429 rate-limit exhaustion and serves from cache", () => {
    const cb = new VendorApiCircuitBreaker({
      vendorId: "GITHUB_SECURITY_API",
      maxConsecutiveFailures: 3,
      resetTimeoutMs: 5000
    });

    // Encounter rate limit 429
    const failedRes = cb.executeOrFallback(429);
    expect(failedRes.state).toBe("OPEN");

    // Subsequent call should be blocked and served from fallback cache
    const fallbackRes = cb.executeOrFallback();
    expect(fallbackRes.state).toBe("OPEN");
    expect(fallbackRes.requestAllowed).toBe(false);
    expect(fallbackRes.servedFromCache).toBe(true);
  });

  it("recovers to CLOSED upon successful response after reset timeout", () => {
    const cb = new VendorApiCircuitBreaker({
      vendorId: "AWS_SECURITY_HUB",
      maxConsecutiveFailures: 2,
      resetTimeoutMs: 10 // ultra short for test
    });

    cb.recordFailure(503);
    cb.recordFailure(503);
    expect(cb.getState()).toBe("OPEN");

    // Wait 15ms for reset timeout
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(cb.getState()).toBe("HALF_OPEN");
        // Canary success
        const res = cb.executeOrFallback(200);
        expect(res.state).toBe("CLOSED");
        resolve();
      }, 15);
    });
  });
});
