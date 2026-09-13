/**
 * QA-110: Self-Service Stripe Customer Portal Integration for Plan Upgrades.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Provides self-service billing management, plan entitlement resolution,
 * secure Stripe Billing Portal session configuration, and proration calculation
 * for enterprise compliance tiers.
 */

import { createHash, createHmac } from "crypto";

export type SubscriptionPlanTier =
  | "FREE_EVALUATION"
  | "STARTER_COMPLIANCE"
  | "GROWTH_SCALE"
  | "ENTERPRISE_DEDICATED";

export interface PlanEntitlements {
  tier: SubscriptionPlanTier;
  monthlyPriceUsd: number;
  maxMonitoredVendors: number;
  continuousSoc2Monitoring: boolean;
  customDpaWorkflowEnabled: boolean;
  dedicatedSecurityAdvisor: boolean;
  apiRateLimitPerMin: number;
}

export const PLAN_TIER_CONFIGS: Record<SubscriptionPlanTier, PlanEntitlements> = {
  FREE_EVALUATION: {
    tier: "FREE_EVALUATION",
    monthlyPriceUsd: 0,
    maxMonitoredVendors: 5,
    continuousSoc2Monitoring: false,
    customDpaWorkflowEnabled: false,
    dedicatedSecurityAdvisor: false,
    apiRateLimitPerMin: 60
  },
  STARTER_COMPLIANCE: {
    tier: "STARTER_COMPLIANCE",
    monthlyPriceUsd: 299,
    maxMonitoredVendors: 25,
    continuousSoc2Monitoring: true,
    customDpaWorkflowEnabled: false,
    dedicatedSecurityAdvisor: false,
    apiRateLimitPerMin: 300
  },
  GROWTH_SCALE: {
    tier: "GROWTH_SCALE",
    monthlyPriceUsd: 899,
    maxMonitoredVendors: 100,
    continuousSoc2Monitoring: true,
    customDpaWorkflowEnabled: true,
    dedicatedSecurityAdvisor: false,
    apiRateLimitPerMin: 1200
  },
  ENTERPRISE_DEDICATED: {
    tier: "ENTERPRISE_DEDICATED",
    monthlyPriceUsd: 2499,
    maxMonitoredVendors: 1000,
    continuousSoc2Monitoring: true,
    customDpaWorkflowEnabled: true,
    dedicatedSecurityAdvisor: true,
    apiRateLimitPerMin: 5000
  }
};

export interface TenantBillingProfile {
  tenantId: string;
  stripeCustomerId: string;
  currentTier: SubscriptionPlanTier;
  subscriptionId?: string;
  billingEmail: string;
  currency: "USD" | "EUR" | "GBP";
  billingCycleAnchorDaysRemaining: number;
}

export interface PortalSessionConfig {
  sessionUrl: string;
  expiresAtUnix: number;
  allowedFeatures: {
    paymentMethodUpdate: boolean;
    customerUpdate: boolean;
    invoiceHistory: boolean;
    subscriptionCancel: boolean;
    subscriptionUpdate: boolean;
  };
  hmacSignature: string;
}

export interface ProrationEstimate {
  currentTier: SubscriptionPlanTier;
  targetTier: SubscriptionPlanTier;
  isUpgrade: boolean;
  immediateProrationChargeUsd: number;
  newRecurringMonthlyUsd: number;
  effectiveImmediately: boolean;
}

export class StripeCustomerPortalUpgradeEngine {
  private static readonly PORTAL_URL_BASE = "https://billing.stripe.com/p/session/";

  /**
   * Generates a self-service customer portal session configuration for tenant plan management.
   */
  public static createPortalSession(
    profile: TenantBillingProfile,
    returnUrl: string,
    secretKey: string
  ): PortalSessionConfig {
    if (!profile.tenantId || !profile.stripeCustomerId) {
      throw new Error("Invalid billing profile: tenantId and stripeCustomerId are required.");
    }
    if (!returnUrl.startsWith("https://")) {
      throw new Error("Security policy violation: returnUrl must be secure HTTPS.");
    }
    if (!secretKey || secretKey.length < 16) {
      throw new Error("Signing key of at least 16 characters is required.");
    }

    const sessionId = createHash("sha256")
      .update(`${profile.tenantId}:${profile.stripeCustomerId}:${Date.now()}`)
      .digest("hex")
      .slice(0, 32);

    const expiresAtUnix = Math.floor(Date.now() / 1000) + 1800; // 30 min expiration
    const sessionUrl = `${this.PORTAL_URL_BASE}${sessionId}?return_url=${encodeURIComponent(returnUrl)}`;

    const allowedFeatures = {
      paymentMethodUpdate: true,
      customerUpdate: true,
      invoiceHistory: true,
      subscriptionCancel: profile.currentTier !== "FREE_EVALUATION",
      subscriptionUpdate: true
    };

    const signaturePayload = `${profile.tenantId}:${profile.stripeCustomerId}:${expiresAtUnix}:${sessionId}`;
    const hmacSignature = createHmac("sha256", secretKey).update(signaturePayload).digest("hex");

    return {
      sessionUrl,
      expiresAtUnix,
      allowedFeatures,
      hmacSignature
    };
  }

  /**
   * Calculates estimated proration and pricing delta when a customer requests a plan upgrade.
   */
  public static calculateUpgradeProration(
    profile: TenantBillingProfile,
    targetTier: SubscriptionPlanTier
  ): ProrationEstimate {
    const currentConfig = PLAN_TIER_CONFIGS[profile.currentTier];
    const targetConfig = PLAN_TIER_CONFIGS[targetTier];

    if (!currentConfig || !targetConfig) {
      throw new Error("Invalid tier specified for proration calculation.");
    }

    const isUpgrade = targetConfig.monthlyPriceUsd >= currentConfig.monthlyPriceUsd;
    const monthlyDiff = targetConfig.monthlyPriceUsd - currentConfig.monthlyPriceUsd;

    // Proration fraction based on remaining cycle days (out of 30 standard billing cycle days)
    const daysRemaining = Math.max(0, Math.min(30, profile.billingCycleAnchorDaysRemaining));
    const prorationFraction = daysRemaining / 30.0;

    const immediateProrationChargeUsd = isUpgrade
      ? Math.round(monthlyDiff * prorationFraction * 100) / 100
      : 0.0; // Downgrades apply credit to next cycle

    return {
      currentTier: profile.currentTier,
      targetTier,
      isUpgrade,
      immediateProrationChargeUsd,
      newRecurringMonthlyUsd: targetConfig.monthlyPriceUsd,
      effectiveImmediately: true
    };
  }

  /**
   * Resolves plan entitlements and validates whether a tenant's usage is within limits.
   */
  public static checkVendorCountCapacity(
    tier: SubscriptionPlanTier,
    activeVendorCount: number
  ): { canAddMoreVendors: boolean; remainingCapacity: number; tierLimit: number } {
    const config = PLAN_TIER_CONFIGS[tier];
    const remaining = Math.max(0, config.maxMonitoredVendors - activeVendorCount);
    return {
      canAddMoreVendors: activeVendorCount < config.maxMonitoredVendors,
      remainingCapacity: remaining,
      tierLimit: config.maxMonitoredVendors
    };
  }
}
