import { describe, it, expect } from "vitest";
import {
  VendorRiskScoringEngine,
  VendorRiskInput,
} from "./vendor-risk-scoring";

describe("QA-131: VendorRiskScoringEngine Regression Matrix", () => {
  const engine = new VendorRiskScoringEngine("test_secure_hmac_secret");

  it("calculates low risk score for fully attested SOC 2 / ISO compliant vendor", () => {
    const input: VendorRiskInput = {
      vendorId: "v_stripe",
      vendorName: "Stripe, Inc.",
      tier: "TIER_1_CRITICAL",
      cloudProviders: ["AWS"],
      dataResidencyCompliant: true,
      hasSoc2Type2: true,
      hasIso27001: true,
      dpaSigned: true,
      unresolvedCveCount: 0,
      maxCvssScore: 0.0,
      uptimeSlaPct: 99.99,
    };

    const res = engine.calculateRisk(input);
    expect(res.riskScore).toBe(35); // Base 10 + Tier1 25
    expect(res.riskCategory).toBe("MODERATE");
    expect(res.alertRequired).toBe(false);
  });

  it("escalates to P1_CRITICAL when residency violations, missing DPA, and critical CVEs exist", () => {
    const input: VendorRiskInput = {
      vendorId: "v_rogue_sub",
      vendorName: "Rogue Cloud Services",
      tier: "TIER_1_CRITICAL",
      cloudProviders: ["AWS", "GCP"],
      dataResidencyCompliant: false, // +25
      hasSoc2Type2: false, // +20
      hasIso27001: false, // +10
      dpaSigned: false, // +20
      unresolvedCveCount: 5, // +10
      maxCvssScore: 9.8, // +30
      uptimeSlaPct: 97.5, // +15
    };

    const res = engine.calculateRisk(input);
    expect(res.riskScore).toBe(100);
    expect(res.riskCategory).toBe("CRITICAL");
    expect(res.alertRequired).toBe(true);
    expect(res.severity).toBe("P1_CRITICAL");
    expect(res.contributingFactors.length).toBeGreaterThan(4);
  });

  it("generates and cryptographically verifies multi-cloud webhook payloads", () => {
    const input: VendorRiskInput = {
      vendorId: "v_alert_needed",
      vendorName: "Legacy DB Provider",
      tier: "TIER_2_SIGNIFICANT",
      cloudProviders: ["AZURE", "GCP"],
      dataResidencyCompliant: true,
      hasSoc2Type2: false,
      hasIso27001: false,
      dpaSigned: true,
      unresolvedCveCount: 4,
      maxCvssScore: 7.8,
      uptimeSlaPct: 99.1,
    };

    const risk = engine.calculateRisk(input);
    const payload = engine.createWebhookPayload("tenant_acme_eu", risk, input.cloudProviders);

    expect(payload.tenantId).toBe("tenant_acme_eu");
    expect(payload.vendorId).toBe("v_alert_needed");
    expect(payload.affectedCloudProviders).toEqual(["AZURE", "GCP"]);
    expect(payload.signatureHmacSha256).toMatch(/^[a-f0-9]{64}$/);

    // Verify authenticity
    const isValid = engine.verifyWebhookSignature(payload);
    expect(isValid).toBe(true);

    // Tampering test
    const tamperedPayload = { ...payload, riskScore: 10 };
    expect(engine.verifyWebhookSignature(tamperedPayload)).toBe(false);
  });
});
