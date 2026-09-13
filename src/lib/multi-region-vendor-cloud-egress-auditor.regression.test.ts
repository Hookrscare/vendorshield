import { describe, it, expect } from 'vitest';
import {
  MultiRegionVendorCloudEgressAuditor,
  CloudEgressTelemetry
} from './multi-region-vendor-cloud-egress-auditor';

describe('QA-181: MultiRegionVendorCloudEgressAuditor Tests', () => {
  const auditor = new MultiRegionVendorCloudEgressAuditor();

  it('permits compliant intra-EEA encrypted flow', () => {
    const flow: CloudEgressTelemetry = {
      telemetryId: 'TEL-EU-001',
      vendorId: 'VEND-DATADOG-EU',
      provider: 'AWS',
      sourceRegion: 'EU_EEA',
      destinationRegion: 'EU_EEA',
      destinationEndpoint: 'eu-central-1.datadoghq.eu',
      dataClassification: 'CONFIDENTIAL_PII',
      egressVolumeMegabytes: 1540.5,
      transitEncryption: 'TLS_1_3',
      hasStandardContractualClauses: true,
      hasAdequacyDecision: true,
      hasDataPrivacyFrameworkCert: true,
      timestampIso: '2026-09-13T10:00:00Z'
    };

    const result = auditor.auditEgressFlow(flow);
    expect(result.isPermitted).toBe(true);
    expect(result.sovereigntyRiskScore).toBe(0);
    expect(result.violations.length).toBe(0);
    expect(result.recommendedDisposition).toBe('ALLOW');
    expect(result.auditHash).toHaveLength(16);
  });

  it('quarantines and blocks unencrypted cross-border egress', () => {
    const flow: CloudEgressTelemetry = {
      telemetryId: 'TEL-UNENC-002',
      vendorId: 'VEND-ANALYTICS-X',
      provider: 'GCP',
      sourceRegion: 'EU_EEA',
      destinationRegion: 'US_COMMERCIAL',
      destinationEndpoint: 'insecure-collector.vendor.com',
      dataClassification: 'CONFIDENTIAL_PII',
      egressVolumeMegabytes: 50.0,
      transitEncryption: 'UNENCRYPTED',
      hasStandardContractualClauses: false,
      hasAdequacyDecision: false,
      hasDataPrivacyFrameworkCert: false,
      timestampIso: '2026-09-13T10:05:00Z'
    };

    const result = auditor.auditEgressFlow(flow);
    expect(result.isPermitted).toBe(false);
    expect(result.sovereigntyRiskScore).toBeGreaterThanOrEqual(80);
    expect(result.recommendedDisposition).toBe('BLOCK_AND_ISOLATE_IMMEDIATELY');
    expect(result.violations.some(v => v.violationCode === 'EGRESS_UNENCRYPTED_PLAINTEXT')).toBe(true);
  });

  it('blocks FedRAMP GovCloud breach to commercial offshore zones', () => {
    const flow: CloudEgressTelemetry = {
      telemetryId: 'TEL-FEDRAMP-003',
      vendorId: 'VEND-AI-TRANSCRIPTION',
      provider: 'AWS',
      sourceRegion: 'US_GOVCLOUD',
      destinationRegion: 'NON_ADEQUATE_OFFSHORE',
      destinationEndpoint: 'transcribe.offshore.net',
      dataClassification: 'CRITICAL_INFRASTRUCTURE_FEDRAMP',
      egressVolumeMegabytes: 800.0,
      transitEncryption: 'TLS_1_3',
      hasStandardContractualClauses: false,
      hasAdequacyDecision: false,
      hasDataPrivacyFrameworkCert: false,
      timestampIso: '2026-09-13T10:10:00Z'
    };

    const result = auditor.auditEgressFlow(flow);
    expect(result.isPermitted).toBe(false);
    expect(result.violations.some(v => v.violationCode === 'FEDRAMP_HIGH_BOUNDARY_BREACH')).toBe(true);
    expect(result.recommendedDisposition).toBe('BLOCK_AND_ISOLATE_IMMEDIATELY');
  });
});
