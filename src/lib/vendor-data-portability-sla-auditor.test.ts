import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  VendorDataPortabilitySlaAuditor,
  VendorPortabilityExportRequest
} from './vendor-data-portability-sla-auditor';

describe('QA-189: Vendor Data Portability & Export SLA Auditor', () => {
  const samplePayload = JSON.stringify([{ id: 1, user: 'alice@example.com' }]);
  const validHash = crypto.createHash('sha256').update(samplePayload, 'utf-8').digest('hex');

  it('validates compliant export within SLA', () => {
    const req: VendorPortabilityExportRequest = {
      exportId: 'exp_ok_01',
      vendorName: 'Segment Data Inc',
      requestedAtIso: '2026-09-10T10:00:00Z',
      deliveredAtIso: '2026-09-11T16:00:00Z', // 30h delivery
      slaMaxHours: 72,
      format: 'ndjson',
      transportProtocol: 'TLS_1_3',
      manifestSha256Expected: validHash,
      exportedDataPayload: samplePayload
    };

    const res = VendorDataPortabilitySlaAuditor.auditExportJob(req);

    expect(res.isCompliant).toBe(true);
    expect(res.auditStatus).toBe('PORTABILITY_SLA_COMPLIANT');
    expect(res.actualDeliveryHours).toBe(30);
  });

  it('flags overdue export exceeding contractual SLA limit', () => {
    const req: VendorPortabilityExportRequest = {
      exportId: 'exp_late_02',
      vendorName: 'Legacy CRM Corp',
      requestedAtIso: '2026-09-01T10:00:00Z',
      deliveredAtIso: '2026-09-06T10:00:00Z', // 120h delivery
      slaMaxHours: 72,
      format: 'json',
      transportProtocol: 'TLS_1_3',
      manifestSha256Expected: validHash,
      exportedDataPayload: samplePayload
    };

    const res = VendorDataPortabilitySlaAuditor.auditExportJob(req);

    expect(res.isCompliant).toBe(false);
    expect(res.auditStatus).toBe('SLA_BREACH_DELIVERY_OVERDUE');
    expect(res.complianceNotes).toContain('SLA BREACH');
  });

  it('rejects unencrypted or legacy transport protocols', () => {
    const req: VendorPortabilityExportRequest = {
      exportId: 'exp_insecure_03',
      vendorName: 'Insecure SaaS',
      requestedAtIso: '2026-09-10T10:00:00Z',
      deliveredAtIso: '2026-09-11T10:00:00Z',
      slaMaxHours: 72,
      format: 'json',
      transportProtocol: 'TLS_1_2', // Outdated for critical bulk data egress
      manifestSha256Expected: validHash,
      exportedDataPayload: samplePayload
    };

    const res = VendorDataPortabilitySlaAuditor.auditExportJob(req);

    expect(res.isCompliant).toBe(false);
    expect(res.auditStatus).toBe('INSECURE_CIPHER_TRANSPORT_REJECTED');
  });
});
