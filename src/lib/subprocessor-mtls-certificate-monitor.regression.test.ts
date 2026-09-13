/**
 * src/lib/subprocessor-mtls-certificate-monitor.regression.test.ts
 * Vitest regression test suite for QA-166.
 */

import { describe, it, expect } from 'vitest';
import {
  SubProcessorMtlsCertificateMonitor,
  SubProcessorMtlsEndpoint
} from './subprocessor-mtls-certificate-monitor';

describe('QA-166: SubProcessorMtlsCertificateMonitor', () => {
  const monitor = new SubProcessorMtlsCertificateMonitor(30, 7);
  const now = new Date('2026-09-13T09:00:00Z');

  it('identifies healthy, compliant mTLS endpoints with >30 days validity', () => {
    const validEndpoint: SubProcessorMtlsEndpoint = {
      vendorId: 'vend_auth0',
      vendorName: 'Auth0 Identity Provider',
      egressHost: 'auth0.example.com',
      certSerialNumber: 'SN-0012938102',
      issuerCN: 'DigiCert Zero-Trust CA',
      subjectCN: 'auth0.example.com',
      sanDomains: ['auth0.example.com', '*.auth0.example.com'],
      validFrom: new Date('2026-01-01T00:00:00Z'),
      validTo: new Date('2027-01-01T00:00:00Z'), // ~110 days remaining
      signatureAlgorithm: 'SHA256withRSA',
      keyType: 'RSA',
      keyLengthBits: 4096
    };

    const evalResult = monitor.evaluateEndpoint(validEndpoint, now);
    expect(evalResult.status).toBe('ACTIVE');
    expect(evalResult.daysRemaining).toBeGreaterThan(30);

    const report = monitor.auditEndpoints([validEndpoint], now);
    expect(report.compliantCount).toBe(1);
    expect(report.nonCompliantCount).toBe(0);
    expect(report.alerts.length).toBe(0);
    expect(report.attestationHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('triggers critical alert when expiration is imminent (<= 7 days)', () => {
    const expiringEndpoint: SubProcessorMtlsEndpoint = {
      vendorId: 'vend_datadog',
      vendorName: 'Datadog Telemetry Agent',
      egressHost: 'intake.datadoghq.com',
      certSerialNumber: 'SN-99887766',
      issuerCN: 'Datadog Internal CA',
      subjectCN: 'intake.datadoghq.com',
      sanDomains: ['intake.datadoghq.com'],
      validFrom: new Date('2025-09-15T00:00:00Z'),
      validTo: new Date('2026-09-16T00:00:00Z'), // 3 days remaining
      signatureAlgorithm: 'ECDSA-SHA256',
      keyType: 'ECDSA',
      keyLengthBits: 256
    };

    const evalResult = monitor.evaluateEndpoint(expiringEndpoint, now);
    expect(evalResult.status).toBe('CRITICAL_EXPIRATION_IMMINENT');
    expect(evalResult.daysRemaining).toBe(2);

    const report = monitor.auditEndpoints([expiringEndpoint], now);
    expect(report.compliantCount).toBe(0);
    expect(report.nonCompliantCount).toBe(1);
    expect(report.alerts[0].severity).toBe('HIGH');
  });

  it('detects insecure legacy cipher suites or RSA keys below 2048-bit', () => {
    const weakCipherEndpoint: SubProcessorMtlsEndpoint = {
      vendorId: 'vend_legacy_crm',
      vendorName: 'Legacy CRM Integration',
      egressHost: 'api.legacycrm.com',
      certSerialNumber: 'SN-WEAK-01',
      issuerCN: 'Legacy Root CA',
      subjectCN: 'api.legacycrm.com',
      sanDomains: ['api.legacycrm.com'],
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validTo: new Date('2027-01-01T00:00:00Z'),
      signatureAlgorithm: 'SHA1withRSA',
      keyType: 'RSA',
      keyLengthBits: 1024
    };

    const evalResult = monitor.evaluateEndpoint(weakCipherEndpoint, now);
    expect(evalResult.status).toBe('INSECURE_CIPHER');
    expect(evalResult.reason).toContain('Weak cipher or key length detected');

    const report = monitor.auditEndpoints([weakCipherEndpoint], now);
    expect(report.alerts[0].severity).toBe('CRITICAL');
  });

  it('detects SAN domain mismatches preventing egress spoofing', () => {
    const mismatchedEndpoint: SubProcessorMtlsEndpoint = {
      vendorId: 'vend_spoof_candidate',
      vendorName: 'Untrusted Relay Provider',
      egressHost: 'secure.external-gateway.com',
      certSerialNumber: 'SN-MISMATCH-99',
      issuerCN: 'Let\'s Encrypt Authority X3',
      subjectCN: 'other-site.com',
      sanDomains: ['other-site.com', 'api.other-site.com'],
      validFrom: new Date('2026-01-01T00:00:00Z'),
      validTo: new Date('2027-01-01T00:00:00Z'),
      signatureAlgorithm: 'SHA256withRSA',
      keyType: 'RSA',
      keyLengthBits: 2048
    };

    const evalResult = monitor.evaluateEndpoint(mismatchedEndpoint, now);
    expect(evalResult.status).toBe('SAN_DOMAIN_MISMATCH');
  });
});
