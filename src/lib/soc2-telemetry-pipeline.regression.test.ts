/**
 * QA-132 Regression Test Suite: Sub-Processor SOC 2 Continuous Evidence Telemetry Pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Soc2TelemetryPipeline, EvidenceTelemetryItem } from './soc2-telemetry-pipeline';

describe('QA-132: Soc2TelemetryPipeline', () => {
  let pipeline: Soc2TelemetryPipeline;

  beforeEach(() => {
    pipeline = new Soc2TelemetryPipeline();
  });

  it('marks controls compliant and outputs PASS when all telemetry feeds are healthy', () => {
    const items: EvidenceTelemetryItem[] = [
      {
        controlId: 'CC6.1',
        vendorId: 'vendor-datadog',
        category: 'Access Control',
        sourceSystem: 'OKTA',
        rawMetricValue: 100,
        isCompliant: true,
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: '100% MFA enforced across employees',
      },
      {
        controlId: 'CC6.6',
        vendorId: 'vendor-datadog',
        category: 'Perimeter Defense',
        sourceSystem: 'CLOUDFLARE',
        rawMetricValue: true,
        isCompliant: true,
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: 'WAF active with zero unmanaged endpoints',
      },
      {
        controlId: 'CC6.8',
        vendorId: 'vendor-datadog',
        category: 'Vulnerabilities',
        sourceSystem: 'AWS_SECURITY_HUB',
        rawMetricValue: 0,
        isCompliant: true,
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: 'Zero Critical or High unpatched CVEs',
      },
      {
        controlId: 'CC7.2',
        vendorId: 'vendor-datadog',
        category: 'Monitoring',
        sourceSystem: 'DATADOG',
        rawMetricValue: true,
        isCompliant: true,
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: 'Real-time SIEM alerts and log retention active',
      },
      {
        controlId: 'CC8.1',
        vendorId: 'vendor-datadog',
        category: 'Change Management',
        sourceSystem: 'GITHUB',
        rawMetricValue: true,
        isCompliant: true,
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: 'Branch protection and mandatory PR peer reviews active',
      },
    ];

    pipeline.ingestBatch(items);
    const report = pipeline.generateReport('vendor-datadog');

    expect(report.compliancePercentage).toBe(100);
    expect(report.overallStatus).toBe('PASS');
    expect(report.controls['CC6.1'].status).toBe('COMPLIANT');
    expect(report.immutableManifestHash).toHaveLength(64);
  });

  it('detects deficient controls when partial evidence items fail', () => {
    pipeline.ingestBatch([
      {
        controlId: 'CC6.1',
        vendorId: 'vendor-stripe',
        category: 'Access Control',
        sourceSystem: 'OKTA',
        rawMetricValue: 92,
        isCompliant: false, // MFA gap
        timestamp: '2026-09-08T20:00:00Z',
        evidenceDetails: 'MFA coverage 92% (below 100% policy)',
      },
      {
        controlId: 'CC6.1',
        vendorId: 'vendor-stripe',
        category: 'Access Control',
        sourceSystem: 'OKTA',
        rawMetricValue: true,
        isCompliant: true,
        timestamp: '2026-09-08T20:05:00Z',
        evidenceDetails: 'SSO configuration active',
      },
    ]);

    const report = pipeline.generateReport('vendor-stripe');
    expect(report.controls['CC6.1'].status).toBe('DEFICIENT');
    expect(report.controls['CC6.1'].failingItemsCount).toBe(1);
    expect(report.overallStatus).toBe('FAIL');
  });

  it('produces distinct immutable SHA-256 evidence hashes per vendor', () => {
    pipeline.ingestTelemetry({
      controlId: 'CC6.1',
      vendorId: 'vendor-a',
      category: 'Access',
      sourceSystem: 'OKTA',
      rawMetricValue: true,
      isCompliant: true,
      timestamp: '2026-09-08T20:00:00Z',
      evidenceDetails: 'ok',
    });

    pipeline.ingestTelemetry({
      controlId: 'CC6.1',
      vendorId: 'vendor-b',
      category: 'Access',
      sourceSystem: 'OKTA',
      rawMetricValue: false,
      isCompliant: false,
      timestamp: '2026-09-08T20:00:00Z',
      evidenceDetails: 'failed',
    });

    const reportA = pipeline.generateReport('vendor-a');
    const reportB = pipeline.generateReport('vendor-b');

    expect(reportA.immutableManifestHash).not.toBe(reportB.immutableManifestHash);
  });
});
