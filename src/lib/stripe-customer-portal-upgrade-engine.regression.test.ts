import { describe, it, expect } from "vitest";
import {
  StripeCustomerPortalUpgradeEngine,
  TenantBillingProfile,
  PLAN_TIER_CONFIGS
} from "./stripe-customer-portal-upgrade-engine";

describe("StripeCustomerPortalUpgradeEngine (QA-110)", () => {
  const secret = "super_secure_compliance_stripe_secret_key_12345";
  const profile: TenantBillingProfile = {
    tenantId: "TENANT-ACME-CORP",
    stripeCustomerId: "cus_N7V8a92KldP",
    currentTier: "STARTER_COMPLIANCE",
    subscriptionId: "sub_1OmX923",
    billingEmail: "compliance@acmecorp.com",
    currency: "USD",
    billingCycleAnchorDaysRemaining: 15 // Exactly half-month left
  };

  it("should generate a secure HMAC-signed customer portal session", () => {
    const session = StripeCustomerPortalUpgradeEngine.createPortalSession(
      profile,
      "https://app.vendorshield.io/dashboard/billing",
      secret
    );

    expect(session.sessionUrl).toContain("https://billing.stripe.com/p/session/");
    expect(session.sessionUrl).toContain("return_url=https%3A%2F%2Fapp.vendorshield.io%2Fdashboard%2Fbilling");
    expect(session.allowedFeatures.subscriptionUpdate).toBe(true);
    expect(session.allowedFeatures.paymentMethodUpdate).toBe(true);
    expect(session.hmacSignature).toHaveLength(64);
    expect(session.expiresAtUnix).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("should calculate exact proration for mid-cycle plan upgrade", () => {
    // Starter ($299) -> Growth ($899). Delta = $600.
    // 15 days remaining out of 30 = 50% proration -> $300.00 charge.
    const proration = StripeCustomerPortalUpgradeEngine.calculateUpgradeProration(
      profile,
      "GROWTH_SCALE"
    );

    expect(proration.isUpgrade).toBe(true);
    expect(proration.immediateProrationChargeUsd).toBe(300.0);
    expect(proration.newRecurringMonthlyUsd).toBe(899.0);
  });

  it("should enforce capacity checks and vendor tier limits", () => {
    const starterCheck = StripeCustomerPortalUpgradeEngine.checkVendorCountCapacity("STARTER_COMPLIANCE", 20);
    expect(starterCheck.canAddMoreVendors).toBe(true);
    expect(starterCheck.remainingCapacity).toBe(5);

    const starterFull = StripeCustomerPortalUpgradeEngine.checkVendorCountCapacity("STARTER_COMPLIANCE", 25);
    expect(starterFull.canAddMoreVendors).toBe(false);
    expect(starterFull.remainingCapacity).toBe(0);
  });

  it("should reject insecure return URLs or missing tenant credentials", () => {
    expect(() => {
      StripeCustomerPortalUpgradeEngine.createPortalSession(
        { ...profile, stripeCustomerId: "" },
        "https://app.vendorshield.io",
        secret
      );
    }).toThrow();

    expect(() => {
      StripeCustomerPortalUpgradeEngine.createPortalSession(
        profile,
        "http://insecure-url.com",
        secret
      );
    }).toThrow();
  });
});
