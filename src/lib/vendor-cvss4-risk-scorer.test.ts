import { describe, it, expect } from 'vitest';
import {
  VendorCvss4RiskScorer,
  Cvss4Metrics
} from './vendor-cvss4-risk-scorer';

describe('QA-176: Vendor CVSS v4.0 Vulnerability Risk Scorer', () => {
  const criticalZeroDay: Cvss4Metrics = {
    attackVector: 'N',
    attackComplexity: 'L',
    privilegesRequired: 'N',
    userInteraction: 'N',
    vulnImpactConfidentiality: 'H',
    vulnImpactIntegrity: 'H',
    vulnImpactAvailability: 'H',
    subsequentImpactConfidentiality: 'H',
    subsequentImpactIntegrity: 'H',
    subsequentImpactAvailability: 'H'
  };

  const localLowMetric: Cvss4Metrics = {
    attackVector: 'L',
    attackComplexity: 'H',
    privilegesRequired: 'H',
    userInteraction: 'A',
    vulnImpactConfidentiality: 'L',
    vulnImpactIntegrity: 'N',
    vulnImpactAvailability: 'N',
    subsequentImpactConfidentiality: 'N',
    subsequentImpactIntegrity: 'N',
    subsequentImpactAvailability: 'N'
  };

  it('calculates CVSS v4.0 base score for unauthenticated remote code execution', () => {
    const base = VendorCvss4RiskScorer.calculateBaseScore(criticalZeroDay);
    expect(base).toBeGreaterThanOrEqual(9.0);
    expect(base).toBeLessThanOrEqual(10.0);
  });

  it('escalates Tier 1 Production vendor vulnerability to CRITICAL with 24-hour SLA', () => {
    const assessment = VendorCvss4RiskScorer.evaluateVendorVulnerability(
      'CVE-2026-40192',
      'vend_auth0',
      'Auth0 by Okta',
      criticalZeroDay,
      'TIER_1_PROD_ACCESS'
    );

    expect(assessment.severityRating).toBe('CRITICAL');
    expect(assessment.remediationSlaHours).toBe(24);
    expect(assessment.executiveAction).toContain('EMERGENCY: Isolate vendor API integration tokens');
  });

  it('downgrades risk for isolated sandbox vendors with low impact', () => {
    const assessment = VendorCvss4RiskScorer.evaluateVendorVulnerability(
      'CVE-2026-1184',
      'vend_analytics_sandbox',
      'Test Sandbox Metric Provider',
      localLowMetric,
      'TIER_3_SANDBOX'
    );

    expect(assessment.severityRating).toBe('LOW');
    expect(assessment.remediationSlaHours).toBe(336);
  });
});
