import { describe, it, expect } from 'vitest';
import {
  StripeBillingPortalManager,
  PortalSessionConfig,
} from './stripe-billing-portal-manager';

describe('QA-110: StripeBillingPortalManager Regression Suite', () => {
  const secret = 'super_secure_stripe_portal_secret_2026';

  it('generates a valid authenticated portal session for STARTER tier upgrade', () => {
    const config: PortalSessionConfig = {
      organizationId: 'org_enterprise_99',
      stripeCustomerId: 'cus_stripe_12345',
      currentPlanTier: 'STARTER',
      targetPlanTier: 'ENTERPRISE',
      returnUrl: 'https://vendorshield.io/dashboard/billing',
      portalSigningSecret: secret,
    };

    const session = StripeBillingPortalManager.createPortalSession(config);

    expect(session.organizationId).toBe('org_enterprise_99');
    expect(session.stripeCustomerId).toBe('cus_stripe_12345');
    expect(session.canUpgradePlan).toBe(true);
    expect(session.authenticatedReturnUrl).toContain('portal_sig=');
    expect(session.sessionToken).toBeDefined();
    expect(session.verificationDigest).toBeDefined();
  });

  it('prevents upgrading if customer is already on ENTERPRISE plan tier', () => {
    const config: PortalSessionConfig = {
      organizationId: 'org_acme_corp',
      stripeCustomerId: 'cus_acme_9999',
      currentPlanTier: 'ENTERPRISE',
      returnUrl: 'https://vendorshield.io/settings',
      portalSigningSecret: secret,
    };

    const session = StripeBillingPortalManager.createPortalSession(config);

    expect(session.canUpgradePlan).toBe(false);
  });

  it('rejects insecure HTTP return URLs to prevent open redirect vulnerabilities', () => {
    const config: PortalSessionConfig = {
      organizationId: 'org_insecure',
      stripeCustomerId: 'cus_insecure',
      currentPlanTier: 'STARTER',
      returnUrl: 'http://insecure-domain.com/callback',
      portalSigningSecret: secret,
    };

    expect(() => StripeBillingPortalManager.createPortalSession(config)).toThrow(
      /returnUrl must be a secure HTTPS URL/
    );
  });
});
