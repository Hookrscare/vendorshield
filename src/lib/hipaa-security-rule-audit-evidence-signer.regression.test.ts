import { describe, it, expect } from 'vitest';
import {
  HipaaSecurityRuleAuditEvidenceSigner,
  HipaaAuditEvidenceItem
} from './hipaa-security-rule-audit-evidence-signer';

describe('QA-188: HipaaSecurityRuleAuditEvidenceSigner', () => {
  const signer = new HipaaSecurityRuleAuditEvidenceSigner('super-secret-hipaa-audit-key-2026', 'hsm-us-east-1');

  const validEvidence: HipaaAuditEvidenceItem = {
    evidenceId: 'EV-HIPAA-2026-001',
    cfrCitation: '164.312(e)(2)(ii)',
    safeguardCategory: 'technical',
    controlTitle: 'Transmission Security - ePHI Encryption in Transit',
    vendorOrgId: 'vendor-health-data-cloud',
    collectedAtIso: '2026-09-13T14:00:00.000Z',
    auditTelemetry: {
      ephiEncryptionCipher: 'AES-256-GCM',
      tlsMinVersion: 'TLSv1.3',
      auditLogRetentionYears: 7,
      baaExecuted: true,
      mfaEnforced: true
    }
  };

  it('signs and verifies compliant HIPAA evidence correctly', () => {
    const seal = signer.signEvidence(validEvidence);

    expect(seal.complianceVerdict).toBe('COMPLIANT');
    expect(seal.findings[0]).toContain('satisfy');
    expect(seal.hmacSignature).toHaveLength(64);
    expect(seal.signerKeyId).toBe('hsm-us-east-1');

    const isValid = signer.verifyAttestationSeal(seal, validEvidence);
    expect(isValid).toBe(true);
  });

  it('detects HIPAA violations for unexecuted BAA and deprecated TLS', () => {
    const nonCompliantEvidence: HipaaAuditEvidenceItem = {
      ...validEvidence,
      evidenceId: 'EV-HIPAA-2026-002',
      auditTelemetry: {
        ...validEvidence.auditTelemetry,
        baaExecuted: false,
        tlsMinVersion: 'TLSv1.0',
        auditLogRetentionYears: 3
      }
    };

    const seal = signer.signEvidence(nonCompliantEvidence);
    expect(seal.complianceVerdict).toBe('NON_COMPLIANT');
    expect(seal.findings.some(f => f.includes('BAA'))).toBe(true);
    expect(seal.findings.some(f => f.includes('TLSv1.0'))).toBe(true);
    expect(seal.findings.some(f => f.includes('6-year'))).toBe(true);

    const isValid = signer.verifyAttestationSeal(seal, nonCompliantEvidence);
    expect(isValid).toBe(true);
  });

  it('detects tampering with evidence payload', () => {
    const seal = signer.signEvidence(validEvidence);

    const tamperedEvidence: HipaaAuditEvidenceItem = {
      ...validEvidence,
      auditTelemetry: {
        ...validEvidence.auditTelemetry,
        ephiEncryptionCipher: 'DES-CBC'
      }
    };

    const isValid = signer.verifyAttestationSeal(seal, tamperedEvidence);
    expect(isValid).toBe(false);
  });
});
