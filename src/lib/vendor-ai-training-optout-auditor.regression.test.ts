/**
 * src/lib/vendor-ai-training-optout-auditor.regression.test.ts
 * Regression test suite for QA-172: Enterprise Vendor AI Model Training Opt-Out & ZDR Auditor.
 */

import { describe, it, expect } from 'vitest';
import { 
  VendorAiTrainingOptOutAuditor, 
  VendorAiPolicyConfig 
} from './vendor-ai-training-optout-auditor';

describe('QA-172: VendorAiTrainingOptOutAuditor', () => {
  const auditor = new VendorAiTrainingOptOutAuditor();
  const baseDate = '2026-09-13T00:00:00.000Z';

  it('verifies a fully compliant AI vendor with active ZDR and DPA', () => {
    const config: VendorAiPolicyConfig = {
      vendorId: 'VND-AI-001',
      vendorName: 'Anthropic Claude Enterprise',
      provider: 'ANTHROPIC',
      zeroDataRetentionEnforced: true,
      modelTrainingOptOutEnforced: true,
      contractualDpaAddendumActive: true,
      dpaAddendumExpirationDate: '2027-12-31',
      telemetryLoggingExcluded: true,
      tlsVersion: 'TLS_1_3',
      verifiedHeaderEnforcement: true,
    };

    const result = auditor.auditVendorAiPolicy(config, baseDate);
    expect(result.complianceScore).toBe(100);
    expect(result.isCompliant).toBe(true);
    expect(result.riskTier).toBe('NEGLIGIBLE_RISK');
    expect(result.auditFindings).toHaveLength(0);
    expect(result.auditProofTokenSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('flags critical IP leakage risk when vendor retains data for training', () => {
    const config: VendorAiPolicyConfig = {
      vendorId: 'VND-AI-002',
      vendorName: 'Consumer AI Wrapper',
      provider: 'UNVERIFIED_THIRD_PARTY',
      zeroDataRetentionEnforced: false,
      modelTrainingOptOutEnforced: false,
      contractualDpaAddendumActive: false,
      dpaAddendumExpirationDate: '2025-01-01',
      telemetryLoggingExcluded: false,
      tlsVersion: 'INSECURE',
      verifiedHeaderEnforcement: false,
    };

    const result = auditor.auditVendorAiPolicy(config, baseDate);
    expect(result.complianceScore).toBeLessThan(30);
    expect(result.isCompliant).toBe(false);
    expect(result.riskTier).toBe('CRITICAL_IP_LEAK_RISK');
    expect(result.auditFindings.some(f => f.includes('CRITICAL'))).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(2);
  });

  it('detects expired DPA AI addendum and applies appropriate penalty', () => {
    const config: VendorAiPolicyConfig = {
      vendorId: 'VND-AI-003',
      vendorName: 'Azure OpenAI Instance',
      provider: 'AZURE_OPENAI',
      zeroDataRetentionEnforced: true,
      modelTrainingOptOutEnforced: true,
      contractualDpaAddendumActive: true,
      dpaAddendumExpirationDate: '2026-08-01', // Expired relative to 2026-09-13
      telemetryLoggingExcluded: true,
      tlsVersion: 'TLS_1_3',
      verifiedHeaderEnforcement: true,
    };

    const result = auditor.auditVendorAiPolicy(config, baseDate);
    expect(result.complianceScore).toBe(85);
    expect(result.auditFindings.some(f => f.includes('expired'))).toBe(true);
  });

  it('evaluates overall portfolio compliance accurately across multiple AI vendors', () => {
    const vendors: VendorAiPolicyConfig[] = [
      {
        vendorId: 'VND-1',
        vendorName: 'Bedrock Enterprise',
        provider: 'AWS_BEDROCK',
        zeroDataRetentionEnforced: true,
        modelTrainingOptOutEnforced: true,
        contractualDpaAddendumActive: true,
        dpaAddendumExpirationDate: '2027-06-30',
        telemetryLoggingExcluded: true,
        tlsVersion: 'TLS_1_3',
        verifiedHeaderEnforcement: true,
      },
      {
        vendorId: 'VND-2',
        vendorName: 'Rogue LLM Service',
        provider: 'UNVERIFIED_THIRD_PARTY',
        zeroDataRetentionEnforced: false,
        modelTrainingOptOutEnforced: false,
        contractualDpaAddendumActive: false,
        dpaAddendumExpirationDate: '2024-01-01',
        telemetryLoggingExcluded: false,
        tlsVersion: 'TLS_1_2',
        verifiedHeaderEnforcement: false,
      },
    ];

    const report = auditor.evaluatePortfolioCompliance(vendors, baseDate);
    expect(report.totalAudited).toBe(2);
    expect(report.fullyCompliantCount).toBe(1);
    expect(report.criticalRiskCount).toBe(1);
    expect(report.overallPortfolioStatus).toBe('FAIL_NON_COMPLIANT');
  });
});
