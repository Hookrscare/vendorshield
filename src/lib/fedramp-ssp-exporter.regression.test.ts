/**
 * Regression tests for QA-134: FedRAMP Continuous Monitoring SSP Exporter.
 */

import { describe, it, expect } from 'vitest';
import { FedrampSspExporter, NistControl, PoamItem } from './fedramp-ssp-exporter';

describe('QA-134: FedrampSspExporter', () => {
  it('initializes correctly and validates constructor parameters', () => {
    expect(() => new FedrampSspExporter('', '1.0.0')).toThrowError(
      'System name must not be empty'
    );
    expect(() => new FedrampSspExporter('TrustHub', '')).toThrowError(
      'System version must not be empty'
    );

    const exporter = new FedrampSspExporter('VendorShield Trust Hub', '2.4.0', 'MODERATE');
    const report = exporter.generateReport();

    expect(report.systemName).toBe('VendorShield Trust Hub');
    expect(report.baseline).toBe('MODERATE');
    expect(report.totalControlsEvaluated).toBe(0);
    expect(report.conMonComplianceStatus).toBe('COMPLIANT');
    expect(report.immutableDigest).toHaveLength(64);
  });

  it('calculates control implementation rate and generates OSCAL package', () => {
    const exporter = new FedrampSspExporter('VendorShield Core', '2.4.0', 'HIGH');

    const c1: NistControl = {
      id: 'AC-2',
      family: 'AC',
      title: 'Account Management',
      status: 'IMPLEMENTED',
      responsibleRole: 'Security Operations',
      implementationDescription: 'Automated SCIM Okta user lifecycle management with quarterly reviews.',
    };

    const c2: NistControl = {
      id: 'IA-2',
      family: 'IA',
      title: 'Identification and Authentication (Organizational Users)',
      status: 'IMPLEMENTED',
      responsibleRole: 'Identity Team',
      implementationDescription: 'FIDO2 WebAuthn MFA mandatory across all internal routes.',
    };

    const c3: NistControl = {
      id: 'SC-7',
      family: 'SC',
      title: 'Boundary Protection',
      status: 'PARTIALLY_IMPLEMENTED',
      responsibleRole: 'DevOps',
      implementationDescription: 'AWS VPC security groups and Cloudflare WAF.',
    };

    exporter.registerControl(c1);
    exporter.registerControl(c2);
    exporter.registerControl(c3);

    const report = exporter.generateReport();
    expect(report.totalControlsEvaluated).toBe(3);
    expect(report.implementedControlsCount).toBe(2);
    expect(report.implementationRatePercentage).toBe(66.7);
    expect(report.oscalPackage['system-security-plan']['control-implementation']['implemented-requirements']).toHaveLength(3);
    expect(report.markdownSummary).toContain('66.7%');
  });

  it('flags non-compliance when critical POA&Ms exceed 30-day FedRAMP SLA', () => {
    const exporter = new FedrampSspExporter('VendorShield Core', '2.4.0', 'MODERATE');

    const overduePoam: PoamItem = {
      poamId: 'POAM-001',
      controlId: 'SI-4',
      weakness: 'Outdated IDS snort signature set',
      severity: 'CRITICAL',
      daysOpen: 45, // Exceeds 30-day SLA!
      scheduledCompletionDate: '2026-10-01',
      status: 'OPEN',
    };

    exporter.addPoamItem(overduePoam);
    const report = exporter.generateReport();

    expect(report.openPoamCount).toBe(1);
    expect(report.overduePoamCount).toBe(1);
    expect(report.conMonComplianceStatus).toBe('NON_COMPLIANT');
    expect(report.markdownSummary).toContain('NON_COMPLIANT');
  });
});
