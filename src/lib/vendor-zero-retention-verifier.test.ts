import { describe, it, expect } from 'vitest';
import {
  VendorZeroRetentionVerifier,
  VendorErasureReceipt
} from './vendor-zero-retention-verifier';

describe('QA-186: Sub-Processor Zero-Data Retention SLA Verifier', () => {
  it('certifies full NIST cryptographic erasure of primary and backup stores', () => {
    const receipt: VendorErasureReceipt = {
      vendorId: 'vend_snowflake_01',
      contractTerminationDate: '2026-06-01',
      primaryStorePurgeDate: '2026-06-15', // 14 days later (<= 30)
      sanitizationStandard: 'NIST_SP_800_88_CRYPTOGRAPHIC_ERASE',
      backupRetentionWindowDays: 60,
      areBackupSnapshotsPurged: true,
      residualTenantRecordCount: 0
    };

    const res = VendorZeroRetentionVerifier.verifyErasure(receipt, '2026-09-13');

    expect(res.complianceStatus).toBe('VERIFIED_PURGED_NIST_COMPLIANT');
    expect(res.isLegalBreach).toBe(false);
    expect(res.legalNoticeDirective).toContain('Full verification completed');
  });

  it('triggers SLA breach notice for active records retained past 30 days', () => {
    const receipt: VendorErasureReceipt = {
      vendorId: 'vend_crm_breach_02',
      contractTerminationDate: '2026-07-01',
      primaryStorePurgeDate: '2026-07-20',
      sanitizationStandard: 'LOGICAL_DELETE_ONLY',
      backupRetentionWindowDays: 90,
      areBackupSnapshotsPurged: false,
      residualTenantRecordCount: 1420 // Zombie active records found in database
    };

    const res = VendorZeroRetentionVerifier.verifyErasure(receipt, '2026-09-13'); // 74 days post-termination

    expect(res.complianceStatus).toBe('SLA_BREACH_DATA_RETAINED');
    expect(res.isLegalBreach).toBe(true);
    expect(res.legalNoticeDirective).toContain('1420 customer records');
  });

  it('permits pending backup lifecycle rotation within valid window', () => {
    const receipt: VendorErasureReceipt = {
      vendorId: 'vend_analytics_03',
      contractTerminationDate: '2026-08-25', // 19 days ago
      primaryStorePurgeDate: '2026-09-02',  // 8 days later
      sanitizationStandard: 'NIST_SP_800_88_PURGE',
      backupRetentionWindowDays: 60,
      areBackupSnapshotsPurged: false,
      residualTenantRecordCount: 0
    };

    const res = VendorZeroRetentionVerifier.verifyErasure(receipt, '2026-09-13');

    expect(res.complianceStatus).toBe('PENDING_BACKUP_LIFECYCLE_PURGE');
    expect(res.isLegalBreach).toBe(false);
    expect(res.legalNoticeDirective).toContain('Awaiting automatic rotation');
  });
});
