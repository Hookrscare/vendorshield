/**
 * src/lib/vendor-third-party-vuln-cvss4-scorer.regression.test.ts
 * Regression tests for QA-176 Continuous Third-Party Vulnerability Disclosure & CVSS v4.0 Risk Scorer.
 */

import { describe, it, expect } from 'vitest';
import {
  VendorThirdPartyVulnCvss4Scorer,
  VulnerabilityDisclosure,
} from './vendor-third-party-vuln-cvss4-scorer';

describe('QA-176: VendorThirdPartyVulnCvss4Scorer', () => {
  const scorer = new VendorThirdPartyVulnCvss4Scorer();

  it('accurately scores a critical remote unauthenticated RCE on infrastructure vendor', () => {
    const disclosure: VulnerabilityDisclosure = {
      vulnId: 'CVE-2026-9901',
      vendorId: 'vend-infra-aws',
      vendorName: 'Cloud Compute Infrastructure',
      title: 'Remote Unauthenticated Code Execution in Hypervisor Gateway',
      publishedDateIso: '2026-09-13T08:00:00Z',
      cvss4VectorString: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
      metrics: {
        attackVector: 'NETWORK',
        attackComplexity: 'LOW',
        attackRequirements: 'NONE',
        privilegesRequired: 'NONE',
        userInteraction: 'NONE',
        vulnConfidentiality: 'HIGH',
        vulnIntegrity: 'HIGH',
        vulnAvailability: 'HIGH',
        subConfidentiality: 'HIGH',
        subIntegrity: 'HIGH',
        subAvailability: 'HIGH',
        exploitMaturity: 'ATTACKED',
      },
      vendorExposure: 'INFRASTRUCTURE_ADMIN',
    };

    const result = scorer.assessVulnerability(disclosure, new Date('2026-09-13T10:00:00Z'));
    expect(result.baseCvss4Score).toBeGreaterThanOrEqual(9.0);
    expect(result.qualitativeSeverity).toBe('CRITICAL');
    expect(result.contextualRiskScore).toBe(10.0);
    expect(result.slaRemediationHours).toBe(48); // 48h emergency SLA
    expect(result.requiresImmediateExecutiveEscalation).toBe(true);
    expect(result.auditDigestSha256).toHaveLength(64);
  });

  it('correctly scores a low local privilege denial of service on analytics vendor', () => {
    const disclosure: VulnerabilityDisclosure = {
      vulnId: 'CVE-2026-1124',
      vendorId: 'vend-analytics-mix',
      vendorName: 'Event Analytics SDK',
      title: 'Local crash upon malformed regex string parsing',
      publishedDateIso: '2026-09-10T12:00:00Z',
      cvss4VectorString: 'CVSS:4.0/AV:L/AC:H/AT:P/PR:H/UI:A/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N',
      metrics: {
        attackVector: 'LOCAL',
        attackComplexity: 'HIGH',
        attackRequirements: 'PRESENT',
        privilegesRequired: 'HIGH',
        userInteraction: 'ACTIVE',
        vulnConfidentiality: 'NONE',
        vulnIntegrity: 'NONE',
        vulnAvailability: 'LOW',
        subConfidentiality: 'NONE',
        subIntegrity: 'NONE',
        subAvailability: 'NONE',
        exploitMaturity: 'UNREPORTED',
      },
      vendorExposure: 'ANALYTICS_ONLY',
    };

    const result = scorer.assessVulnerability(disclosure, new Date('2026-09-13T10:00:00Z'));
    expect(result.baseCvss4Score).toBeLessThan(4.0);
    expect(result.qualitativeSeverity).toBe('LOW');
    expect(result.slaRemediationHours).toBe(720); // 30 days
    expect(result.requiresImmediateExecutiveEscalation).toBe(false);
  });

  it('correctly calculates contextual risk amplification for financial PII exposure', () => {
    const disclosure: VulnerabilityDisclosure = {
      vulnId: 'CVE-2026-4412',
      vendorId: 'vend-stripe-billing',
      vendorName: 'Stripe Billing Connect',
      title: 'Information disclosure via payment receipt metadata',
      publishedDateIso: '2026-09-12T14:00:00Z',
      cvss4VectorString: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N',
      metrics: {
        attackVector: 'NETWORK',
        attackComplexity: 'LOW',
        attackRequirements: 'NONE',
        privilegesRequired: 'LOW',
        userInteraction: 'NONE',
        vulnConfidentiality: 'HIGH',
        vulnIntegrity: 'LOW',
        vulnAvailability: 'NONE',
        subConfidentiality: 'NONE',
        subIntegrity: 'NONE',
        subAvailability: 'NONE',
        exploitMaturity: 'POC',
      },
      vendorExposure: 'PII_FINANCIAL',
    };

    const result = scorer.assessVulnerability(disclosure, new Date('2026-09-13T10:00:00Z'));
    expect(result.contextualRiskScore).toBeGreaterThan(result.baseCvss4Score);
    expect(result.slaRemediationHours).toBeLessThanOrEqual(168); // 7 days or less
  });
});
