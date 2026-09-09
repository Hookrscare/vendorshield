/**
 * QA-133: Regression tests for Automated Vendor Sub-Contractor 4th-Party Supply Chain Risk Mapping.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FourthPartyRiskMapper,
  ThirdPartyVendorNode,
  FourthPartySubcontractor,
} from './fourth-party-risk-mapper';

describe('FourthPartyRiskMapper (QA-133)', () => {
  let mapper: FourthPartyRiskMapper;

  beforeEach(() => {
    mapper = new FourthPartyRiskMapper();
  });

  it('handles an empty vendor portfolio gracefully', () => {
    const report = mapper.analyzeSupplyChain();
    expect(report.totalThirdParties).toBe(0);
    expect(report.totalUniqueFourthParties).toBe(0);
    expect(report.overallSupplyChainRiskScore).toBe(0);
    expect(report.riskRating).toBe('LOW');
    expect(report.concentrationHotspots).toHaveLength(0);
    expect(report.cascadeVulnerabilities).toHaveLength(0);
    expect(report.immutableManifestHash).toHaveLength(64);
  });

  it('identifies systemic concentration SPOF hotspots when multiple vendors depend on the same 4th party', () => {
    const awsSub: FourthPartySubcontractor = {
      id: 'sub-aws',
      name: 'Amazon Web Services (us-east-1)',
      category: 'INFRASTRUCTURE',
      region: 'us-east-1',
      hasDpa: true,
      soc2Valid: true,
      riskScore: 15,
      dataAccessScope: 'CUSTOMER_PII',
    };

    const cloudflareSub: FourthPartySubcontractor = {
      id: 'sub-cloudflare',
      name: 'Cloudflare Edge CDN',
      category: 'INFRASTRUCTURE',
      region: 'global',
      hasDpa: true,
      soc2Valid: true,
      riskScore: 20,
      dataAccessScope: 'METADATA_ONLY',
    };

    const vendors: ThirdPartyVendorNode[] = [
      {
        vendorId: 'v-datadog',
        vendorName: 'Datadog Inc',
        tier: 'TIER_1',
        subcontractors: [awsSub, cloudflareSub],
      },
      {
        vendorId: 'v-auth0',
        vendorName: 'Auth0 / Okta',
        tier: 'TIER_1',
        subcontractors: [awsSub],
      },
      {
        vendorId: 'v-stripe',
        vendorName: 'Stripe Payments',
        tier: 'TIER_1',
        subcontractors: [awsSub, cloudflareSub],
      },
    ];

    mapper.registerVendorsBatch(vendors);
    const report = mapper.analyzeSupplyChain();

    expect(report.totalThirdParties).toBe(3);
    expect(report.totalUniqueFourthParties).toBe(2);

    // AWS is used by all 3 vendors (100% dependency -> SPOF)
    const awsHotspot = report.concentrationHotspots.find((h) => h.fourthPartyId === 'sub-aws');
    expect(awsHotspot).toBeDefined();
    expect(awsHotspot?.dependencyPercentage).toBe(100);
    expect(awsHotspot?.isSystemicSPOF).toBe(true);
    expect(awsHotspot?.dependentVendors).toEqual(['Auth0 / Okta', 'Datadog Inc', 'Stripe Payments']);

    // Cloudflare is used by 2 out of 3 (67% dependency -> SPOF)
    const cfHotspot = report.concentrationHotspots.find((h) => h.fourthPartyId === 'sub-cloudflare');
    expect(cfHotspot).toBeDefined();
    expect(cfHotspot?.dependencyPercentage).toBe(67);
    expect(cfHotspot?.isSystemicSPOF).toBe(true);

    const md = mapper.exportMarkdownReport(report);
    expect(md).toContain('Amazon Web Services');
    expect(md).toContain('Cloudflare Edge CDN');
    expect(md).toContain('⚠️ YES (>=50%)');
  });

  it('detects compliance cascade vulnerabilities when a 4th-party has missing DPA or expired SOC 2', () => {
    const unverifiedSub: FourthPartySubcontractor = {
      id: 'sub-unv-ai',
      name: 'Unverified Deep AI Host',
      category: 'AI_MODELS',
      region: 'ap-southeast-1',
      hasDpa: false, // Critical missing DPA
      soc2Valid: false, // Expired/Missing SOC 2
      riskScore: 85, // High risk
      dataAccessScope: 'CUSTOMER_PII',
    };

    const vendor: ThirdPartyVendorNode = {
      vendorId: 'v-ai-tool',
      vendorName: 'OmniAI Copilot',
      tier: 'TIER_1',
      subcontractors: [unverifiedSub],
    };

    mapper.registerVendor(vendor);
    const report = mapper.analyzeSupplyChain();

    expect(report.cascadeVulnerabilities).toHaveLength(1);
    const vuln = report.cascadeVulnerabilities[0];
    expect(vuln.vendorName).toBe('OmniAI Copilot');
    expect(vuln.fourthPartyName).toBe('Unverified Deep AI Host');
    expect(vuln.impactSeverity).toBe('CRITICAL');
    expect(vuln.deficiencies).toEqual([
      'Missing executed Data Processing Addendum (DPA)',
      'Expired or absent SOC 2 Type II attestation',
      'High 4th-party risk score (85/100)',
    ]);

    expect(report.overallSupplyChainRiskScore).toBeGreaterThanOrEqual(50);
  });
});
