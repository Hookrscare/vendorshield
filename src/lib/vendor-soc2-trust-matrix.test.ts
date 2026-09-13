import { describe, it, expect } from 'vitest';
import {
  VendorSoc2TrustMatrix,
  VendorSoc2AuditSubmission
} from './vendor-soc2-trust-matrix';

describe('QA-183: Vendor SOC 2 Trust Services Criteria Coverage Matrix', () => {
  it('evaluates comprehensive 5-criteria audit report with zero exceptions', () => {
    const audit: VendorSoc2AuditSubmission = {
      vendorId: 'vend_snowflake',
      vendorName: 'Snowflake Inc',
      auditPeriodEnd: '2026-06-30',
      auditingFirm: 'PwC',
      inScopeCategories: ['SECURITY', 'AVAILABILITY', 'CONFIDENTIALITY', 'PROCESSING_INTEGRITY', 'PRIVACY'],
      controls: [
        { controlId: 'CC6.1', category: 'SECURITY', description: 'Logical boundary firewalls', testedWithoutException: true },
        { controlId: 'A1.2', category: 'AVAILABILITY', description: 'Multi-zone replication', testedWithoutException: true },
        { controlId: 'C1.1', category: 'CONFIDENTIALITY', description: 'At-rest KMS encryption', testedWithoutException: true }
      ],
      complementaryUserEntityControls: ['Enforce IP Whitelisting', 'Enforce SAML SSO']
    };

    const matrix = VendorSoc2TrustMatrix.generateMatrix(audit);

    expect(matrix.trustPostureScore).toBe(100);
    expect(matrix.certificationStatus).toBe('CERTIFIED_EXEMPLARY');
    expect(matrix.totalExceptions).toBe(0);
    expect(matrix.unresolvedCuecsCount).toBe(2);
  });

  it('detects auditor exceptions and downgrades certification status', () => {
    const flawedAudit: VendorSoc2AuditSubmission = {
      vendorId: 'vend_legacy_crm',
      vendorName: 'Legacy CRM Corp',
      auditPeriodEnd: '2026-05-15',
      auditingFirm: 'A-LIGN',
      inScopeCategories: ['SECURITY', 'AVAILABILITY'],
      controls: [
        { controlId: 'CC6.3', category: 'SECURITY', description: 'Access revocation within 24h', testedWithoutException: false, exceptionDetails: '2 of 25 terminated staff maintained active credentials for 7 days.' },
        { controlId: 'A1.1', category: 'AVAILABILITY', description: 'Daily backup snapshot validation', testedWithoutException: true }
      ],
      complementaryUserEntityControls: []
    };

    const matrix = VendorSoc2TrustMatrix.generateMatrix(flawedAudit);

    // Score: 40 (Security) + 15 (Availability) - 10 (exception) = 45 -> Insufficient coverage (<50)
    expect(matrix.totalExceptions).toBe(1);
    expect(matrix.trustPostureScore).toBe(45);
    expect(matrix.certificationStatus).toBe('INSUFFICIENT_COVERAGE');
  });
});
