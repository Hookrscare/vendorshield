/**
 * src/lib/vendor-soc2-access-control-enforcer.regression.test.ts
 * Regression tests for QA-145: Automated Vendor SOC 2 CC6.1 - CC6.8 Access Control Policy Enforcer.
 */

import { describe, it, expect } from 'vitest';
import {
  VendorSOC2AccessControlEnforcer,
  VendorAccessPosture
} from './vendor-soc2-access-control-enforcer';

describe('QA-145: VendorSOC2AccessControlEnforcer', () => {
  const enforcer = new VendorSOC2AccessControlEnforcer();

  const fullyCompliantVendor: VendorAccessPosture = {
    vendorId: 'VEND_ACME_SECURE',
    vendorName: 'Acme Cloud Data Inc.',
    mfaEnforced: true,
    mfaType: 'WEBAUTHN_FIDO2',
    rbacImplemented: true,
    privilegedAccessJitDurationHours: 4,
    quarterlyAccessReviewDocumented: true,
    deprovisioningSlaHours: 2,
    networkSegmentationActive: true,
    tlsVersion: 'TLS_1_3',
    cipherSuitesPfs: true,
    edrDeployedPercentage: 99,
    vulnerabilityPatchSlaDays: 7
  };

  it('should award 100/100 and approve tier-1 fully compliant vendor', () => {
    const report = enforcer.evaluateVendor(fullyCompliantVendor);

    expect(report.vendorId).toBe('VEND_ACME_SECURE');
    expect(report.overallScore).toBe(100);
    expect(report.isApproved).toBe(true);
    expect(report.riskTier).toBe('TIER_1_LOW');
    expect(report.criticalDeficiencies).toHaveLength(0);
    expect(report.attestationToken).toMatch(/^SOC2-CC6-[A-F0-9]{16}$/);
  });

  it('should trigger critical deficiency when MFA is missing or SMS-only (CC6.1)', () => {
    const insecureMfaVendor: VendorAccessPosture = {
      ...fullyCompliantVendor,
      vendorId: 'VEND_SMS_ONLY',
      mfaType: 'SMS_INSECURE'
    };

    const report = enforcer.evaluateVendor(insecureMfaVendor);
    expect(report.isApproved).toBe(false);
    expect(report.riskTier).toBe('TIER_3_HIGH_RISK');
    expect(report.criticalDeficiencies.some(d => d.includes('CC6.1'))).toBe(true);
  });

  it('should reject vendor exceeding 4-hour offboarding deprovisioning SLA (CC6.3)', () => {
    const slowDeprovisionVendor: VendorAccessPosture = {
      ...fullyCompliantVendor,
      vendorId: 'VEND_SLOW_OFFBOARD',
      deprovisioningSlaHours: 24
    };

    const report = enforcer.evaluateVendor(slowDeprovisionVendor);
    expect(report.isApproved).toBe(false);
    expect(report.riskTier).toBe('TIER_3_HIGH_RISK');
    expect(report.criticalDeficiencies.some(d => d.includes('CC6.3'))).toBe(true);
  });

  it('should flag deprecated TLS cipher suites under CC6.7', () => {
    const legacyTlsVendor: VendorAccessPosture = {
      ...fullyCompliantVendor,
      vendorId: 'VEND_LEGACY_TLS',
      tlsVersion: 'TLS_1_0_INSECURE',
      cipherSuitesPfs: false
    };

    const report = enforcer.evaluateVendor(legacyTlsVendor);
    expect(report.overallScore).toBeLessThan(90);
    expect(report.criticalDeficiencies.some(d => d.includes('CC6.7'))).toBe(true);
  });
});
