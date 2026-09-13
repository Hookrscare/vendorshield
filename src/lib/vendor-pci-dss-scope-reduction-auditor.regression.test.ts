import { describe, it, expect } from 'vitest';
import {
  VendorPciDssScopeReductionAuditor,
  PaymentVendorIntegrationConfig,
} from './vendor-pci-dss-scope-reduction-auditor';

describe('QA-179: VendorPciDssScopeReductionAuditor Regression Tests', () => {
  const auditor = new VendorPciDssScopeReductionAuditor();

  it('approves compliant SAQ-A hosted fields setup with network tokenization', () => {
    const config: PaymentVendorIntegrationConfig = {
      vendorName: 'Stripe Payments',
      integrationPattern: 'IFRAME_HOSTED_FIELDS',
      usesNetworkTokenization: true,
      hasStrictCspScriptSrc: true,
      hasSubresourceIntegritySri: true,
      hasTamperDetectionHeader: true,
      panStoredInVendorDatabase: false,
    };

    const res = auditor.auditVendorIntegration(config);
    expect(res.applicableSaqType).toBe('SAQ_A');
    expect(res.isPciScopeMinimized).toBe(true);
    expect(res.isCompliantWithV4Mandate).toBe(true);
    expect(res.identifiedComplianceRisks.length).toBe(0);
  });

  it('flags direct PAN transmission as full SAQ-D scope expansion', () => {
    const config: PaymentVendorIntegrationConfig = {
      vendorName: 'Legacy Merchant Gateway',
      integrationPattern: 'DIRECT_API_TRANSMISSION',
      usesNetworkTokenization: false,
      hasStrictCspScriptSrc: true,
      hasSubresourceIntegritySri: true,
      hasTamperDetectionHeader: true,
      panStoredInVendorDatabase: true,
    };

    const res = auditor.auditVendorIntegration(config);
    expect(res.applicableSaqType).toBe('SAQ_D_SERVICE_PROVIDER');
    expect(res.isPciScopeMinimized).toBe(false);
    expect(res.isCompliantWithV4Mandate).toBe(false);
    expect(res.identifiedComplianceRisks[0]).toContain('CRITICAL');
  });

  it('detects PCI 6.4.3 and 11.6.1 non-compliance on missing CSP/SRI/tamper headers', () => {
    const config: PaymentVendorIntegrationConfig = {
      vendorName: 'Unsecured Hosted Fields',
      integrationPattern: 'IFRAME_HOSTED_FIELDS',
      usesNetworkTokenization: true,
      hasStrictCspScriptSrc: false, // Missing CSP
      hasSubresourceIntegritySri: false, // Missing SRI
      hasTamperDetectionHeader: false, // Missing 11.6.1
      panStoredInVendorDatabase: false,
    };

    const res = auditor.auditVendorIntegration(config);
    expect(res.applicableSaqType).toBe('SAQ_A');
    expect(res.isCompliantWithV4Mandate).toBe(false);
    expect(res.identifiedComplianceRisks.some((r) => r.includes('6.4.3'))).toBe(true);
    expect(res.identifiedComplianceRisks.some((r) => r.includes('11.6.1'))).toBe(true);
  });
});
