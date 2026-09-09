import { describe, it, expect } from 'vitest';
import {
  createDeletionRequest,
  generateDeletionCertificate,
  verifyCertificateIntegrity,
  exportCertificateMarkdown
} from './deletion-attestation';

describe('QA-126: Automated Multi-Tenant Sub-Processor Data Export & DPA Deletion Attestation Engine', () => {
  it('creates deletion request with 30-day statutory deadline', () => {
    const fixedIso = '2026-09-08T12:00:00.000Z';
    const req = createDeletionRequest(
      'tenant-fintech-99',
      'sub-proc-analytics',
      'Mixpanel Analytics',
      'ALL_TENANT_DATA',
      fixedIso
    );

    expect(req.tenantId).toBe('tenant-fintech-99');
    expect(req.subProcessorName).toBe('Mixpanel Analytics');
    expect(req.status).toBe('PENDING');

    const reqDate = new Date(fixedIso);
    const deadlineDate = new Date(req.slaDeadline);
    const diffDays = Math.round((deadlineDate.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('generates cryptographic deletion certificate and verifies HMAC signature', () => {
    const req = createDeletionRequest('tenant-health-1', 'sub-cloud', 'Google Cloud Storage');
    const secret = 'custom_tenant_secret_key_88';

    const cert = generateDeletionCertificate(
      req,
      'CRYPTO_SHRED',
      450200,
      'Sarah Connor, Data Protection Officer',
      secret,
      '2026-09-08T14:30:00.000Z'
    );

    expect(cert.recordsPurged).toBe(450200);
    expect(cert.method).toBe('CRYPTO_SHRED');
    expect(cert.cryptographicChecksum).toHaveLength(64); // SHA256 hex string

    // Verification with valid key passes
    expect(verifyCertificateIntegrity(cert, secret)).toBe(true);

    // Verification with wrong key fails
    expect(verifyCertificateIntegrity(cert, 'wrong_key')).toBe(false);

    // Tampered certificate fails
    const tampered = { ...cert, recordsPurged: 450201 };
    expect(verifyCertificateIntegrity(tampered, secret)).toBe(false);
  });

  it('exports auditor-ready markdown attestation notice', () => {
    const req = createDeletionRequest('tenant-retail-corp', 'sub-crm', 'HubSpot CRM');
    const cert = generateDeletionCertificate(
      req,
      'NIST_800_88_PURGE',
      12500,
      'Marcus Vance, CISO'
    );

    const md = exportCertificateMarkdown(cert);
    expect(md).toContain('# 📜 Formal Certificate of Data Deletion & DPA Attestation');
    expect(md).toContain('HubSpot CRM');
    expect(md).toContain('NIST_800_88_PURGE');
    expect(md).toContain('Marcus Vance, CISO');
    expect(md).toContain('GDPR Art. 28(3)(g)');
  });
});
