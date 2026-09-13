import { describe, it, expect } from 'vitest';
import {
  SubProcessorDpaTransferBreachDetector,
  SubProcessorProfile,
} from './sub-processor-dpa-transfer-breach-detector';

describe('QA-168: Sub-Processor DPA Data Transfer Breach Detector', () => {
  const baseSafeguards = {
    hasEndToEndEncryption: true,
    hasCustomerManagedKeys: true,
    hasPseudonymization: true,
    hasWarrantCanary: false,
  };

  it('should pass an adequate jurisdiction without requiring SCCs or TIA', () => {
    const euProfile: SubProcessorProfile = {
      vendorId: 'vendor_eu_01',
      vendorName: 'Hetzner Online GmbH',
      jurisdiction: 'EU',
      dataCategories: ['PII', 'FINANCIAL'],
      transferMechanism: 'ADEQUACY_DECISION',
      isDpfCertified: false,
      hasCompletedTia: false,
      supplementarySafeguards: baseSafeguards,
      contractStatus: 'ACTIVE',
    };

    const res = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(euProfile);
    expect(res.isCompliant).toBe(true);
    expect(res.riskScore).toBe(0);
    expect(res.breachViolations).toHaveLength(0);
  });

  it('should validate US vendor with active EU-U.S. DPF certification and completed TIA', () => {
    const now = 1726000000000;
    const usDpfProfile: SubProcessorProfile = {
      vendorId: 'vendor_us_aws',
      vendorName: 'Amazon Web Services Inc.',
      jurisdiction: 'US',
      dataCategories: ['PII', 'AUTHENTICATION'],
      transferMechanism: 'EU_US_DPF',
      isDpfCertified: true,
      dpfExpirationTimestamp: now + 86400000 * 90, // Expires in 90 days
      hasCompletedTia: true,
      supplementarySafeguards: baseSafeguards,
      contractStatus: 'ACTIVE',
    };

    const res = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(usDpfProfile, now);
    expect(res.isCompliant).toBe(true);
    expect(res.riskScore).toBe(0);
  });

  it('should flag expired DPF certification as breach', () => {
    const now = 1726000000000;
    const usExpiredDpf: SubProcessorProfile = {
      vendorId: 'vendor_us_expired',
      vendorName: 'Legacy Cloud Analytics LLC',
      jurisdiction: 'US',
      dataCategories: ['PII'],
      transferMechanism: 'EU_US_DPF',
      isDpfCertified: true,
      dpfExpirationTimestamp: now - 3600000, // Expired 1 hour ago
      hasCompletedTia: true,
      supplementarySafeguards: baseSafeguards,
      contractStatus: 'ACTIVE',
    };

    const res = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(usExpiredDpf, now);
    expect(res.isCompliant).toBe(false);
    expect(res.riskScore).toBeGreaterThanOrEqual(40);
    expect(res.breachViolations.some(v => v.includes('BREACH_EXPIRED_DPF'))).toBe(true);
  });

  it('should detect missing TIA and lack of supplementary encryption on high-risk data', () => {
    const thirdCountryProfile: SubProcessorProfile = {
      vendorId: 'vendor_in_dev',
      vendorName: 'Offshore Processing Corp',
      jurisdiction: 'IN',
      dataCategories: ['PII', 'HEALTH'],
      transferMechanism: 'EU_SCC_MODULE_2',
      isDpfCertified: false,
      hasCompletedTia: false, // Missing TIA
      supplementarySafeguards: {
        hasEndToEndEncryption: false,
        hasCustomerManagedKeys: false,
        hasPseudonymization: false,
        hasWarrantCanary: false,
      },
      contractStatus: 'ACTIVE',
    };

    const res = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(thirdCountryProfile);
    expect(res.isCompliant).toBe(false);
    expect(res.riskScore).toBe(50); // 25 (Missing TIA) + 25 (Inadequate Supplementary Measures)
    expect(res.breachViolations.some(v => v.includes('BREACH_MISSING_TIA'))).toBe(true);
    expect(res.breachViolations.some(v => v.includes('BREACH_INADEQUATE_SUPPLEMENTARY_MEASURES'))).toBe(true);
  });

  it('should safely treat terminated vendors without raising transfer alarms', () => {
    const terminatedProfile: SubProcessorProfile = {
      vendorId: 'vendor_dead',
      vendorName: 'Old Vendor Inc',
      jurisdiction: 'US',
      dataCategories: ['PII'],
      transferMechanism: 'NONE',
      isDpfCertified: false,
      hasCompletedTia: false,
      supplementarySafeguards: {
        hasEndToEndEncryption: false,
        hasCustomerManagedKeys: false,
        hasPseudonymization: false,
        hasWarrantCanary: false,
      },
      contractStatus: 'TERMINATED',
    };

    const res = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(terminatedProfile);
    expect(res.isCompliant).toBe(true);
    expect(res.riskScore).toBe(0);
    expect(res.recommendedActions[0]).toContain('Vendor terminated');
  });
});
