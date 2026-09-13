import { describe, it, expect } from 'vitest';
import {
  SubProcessorDpaTransferBreachDetector,
  SubProcessorProfile
} from './sub-processor-dpa-transfer-breach-detector';

describe('QA-168: Sub-Processor DPA Data Transfer Mechanism Breach Detector', () => {
  it('approves transfers to jurisdictions with EU adequacy decisions without breaches', () => {
    const euProfile: SubProcessorProfile = {
      vendorId: 'vend-eu-cloud',
      vendorName: 'Hetzner Online GmbH',
      jurisdiction: 'EU',
      dataCategories: ['PII', 'TELEMETRY'],
      transferMechanism: 'ADEQUACY_DECISION',
      isDpfCertified: false,
      hasCompletedTia: true,
      supplementarySafeguards: {
        hasEndToEndEncryption: true,
        hasCustomerManagedKeys: false,
        hasPseudonymization: true,
        hasWarrantCanary: false
      },
      contractStatus: 'ACTIVE'
    };

    const result = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(euProfile);
    expect(result.isCompliant).toBe(true);
    expect(result.riskScore).toBe(0);
    expect(result.breachViolations).toHaveLength(0);
  });

  it('detects breach when US vendor claims DPF but certification has expired', () => {
    const expiredDpfProfile: SubProcessorProfile = {
      vendorId: 'vend-us-analytics',
      vendorName: 'DataMetrics Corp',
      jurisdiction: 'US',
      dataCategories: ['PII'],
      transferMechanism: 'EU_US_DPF',
      isDpfCertified: true,
      dpfExpirationTimestamp: 1690000000000, // Past timestamp
      hasCompletedTia: true,
      supplementarySafeguards: {
        hasEndToEndEncryption: false,
        hasCustomerManagedKeys: false,
        hasPseudonymization: false,
        hasWarrantCanary: false
      },
      contractStatus: 'ACTIVE'
    };

    const result = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(
      expiredDpfProfile,
      1700000000000 // Current timestamp > expiration
    );

    expect(result.isCompliant).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
    expect(result.breachViolations.some(v => v.includes('BREACH_EXPIRED_DPF'))).toBe(true);
  });

  it('detects missing TIA and lack of supplementary encryption for high-risk financial data in non-adequate jurisdiction', () => {
    const nonAdequateProfile: SubProcessorProfile = {
      vendorId: 'vend-in-support',
      vendorName: 'Global Support Pvt Ltd',
      jurisdiction: 'IN',
      dataCategories: ['PII', 'FINANCIAL'],
      transferMechanism: 'EU_SCC_MODULE_2',
      isDpfCertified: false,
      hasCompletedTia: false, // Missing TIA!
      supplementarySafeguards: {
        hasEndToEndEncryption: false,
        hasCustomerManagedKeys: false,
        hasPseudonymization: false,
        hasWarrantCanary: false
      },
      contractStatus: 'ACTIVE'
    };

    const result = SubProcessorDpaTransferBreachDetector.evaluateSubProcessor(nonAdequateProfile);
    expect(result.isCompliant).toBe(false);
    expect(result.breachViolations.some(v => v.includes('BREACH_MISSING_TIA'))).toBe(true);
    expect(result.breachViolations.some(v => v.includes('BREACH_INADEQUATE_SUPPLEMENTARY_MEASURES'))).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
  });
});
