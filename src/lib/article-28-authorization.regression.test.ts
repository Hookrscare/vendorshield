import { describe, it, expect, beforeEach } from 'vitest';
import {
  Article28AuthorizationEngine,
  SubProcessorDraft,
  AuthorisationType,
} from './article-28-authorization';

describe('QA-135: Article 28 Authorization Workflow Engine', () => {
  let engine: Article28AuthorizationEngine;

  beforeEach(() => {
    engine = new Article28AuthorizationEngine();
  });

  it('dispatches Article 28(2) notice and computes Article 28(4) flow-down compliance', () => {
    const subProcessor: SubProcessorDraft = {
      id: 'sub-aws-frankfurt',
      name: 'AWS Europe (Frankfurt)',
      changeType: 'ADDITION',
      dataCategories: ['RESTRICTED_PII', 'SYSTEM_LOGS'],
      processingLocation: 'DE',
      isEeaTransfer: false,
      transferMechanism: 'DOMESTIC_EEA',
      passThroughDpaSigned: true,
      objectionWindowDays: 30,
    };

    const customers = [
      {
        customerId: 'tenant-enterprise-1',
        customerName: 'FinTech Corp GmbH',
        authType: 'GENERAL_WRITTEN' as AuthorisationType,
        dpaContractId: 'DPA-2026-001',
      },
      {
        customerId: 'tenant-enterprise-2',
        customerName: 'HealthData SA',
        authType: 'SPECIFIC_WRITTEN' as AuthorisationType,
        dpaContractId: 'DPA-2026-002',
      },
    ];

    const notice = engine.initiateChangeNotice(subProcessor, customers, '2026-09-01T00:00:00.000Z');

    expect(notice.art28_4_flowDownCompliant).toBe(true);
    expect(notice.controllers['tenant-enterprise-1'].status).toBe('PENDING_OBJECTION_WINDOW');
    expect(notice.controllers['tenant-enterprise-1'].objectionDeadline).toBe('2026-10-01T00:00:00.000Z');
  });

  it('handles timely controller objections and triggers mitigation workflow', () => {
    const subProcessor: SubProcessorDraft = {
      id: 'sub-analytics-us',
      name: 'CloudMetrics Inc',
      changeType: 'ADDITION',
      dataCategories: ['BEACON_TELEMETRY'],
      processingLocation: 'US',
      isEeaTransfer: true,
      transferMechanism: 'SCC_MODULE_3',
      passThroughDpaSigned: true,
      objectionWindowDays: 30,
    };

    const customers = [
      {
        customerId: 'tenant-eu-bank',
        customerName: 'Deutsche Investment Bank',
        authType: 'GENERAL_WRITTEN' as AuthorisationType,
        dpaContractId: 'DPA-BANK-99',
      },
    ];

    const notice = engine.initiateChangeNotice(subProcessor, customers, '2026-09-01T00:00:00.000Z');

    const objection = engine.submitObjection(
      notice.noticeId,
      'tenant-eu-bank',
      'Data sovereignty concerns under Schrems II regarding US cloud processing.',
      '2026-09-15T12:00:00.000Z'
    );

    expect(objection.success).toBe(true);
    expect(objection.controller.status).toBe('OBJECTION_SUBMITTED');
    expect(objection.resolution.action).toBe('ENTER_DISCUSSIONS');
  });

  it('automatically authorizes silent controllers upon expiry of objection window and generates audit certificate', () => {
    const subProcessor: SubProcessorDraft = {
      id: 'sub-redis-cache',
      name: 'Upstash EU',
      changeType: 'ADDITION',
      dataCategories: ['SESSION_CACHE'],
      processingLocation: 'IE',
      isEeaTransfer: false,
      transferMechanism: 'DOMESTIC_EEA',
      passThroughDpaSigned: true,
      objectionWindowDays: 14,
    };

    const customers = [
      {
        customerId: 'c1',
        customerName: 'Customer A',
        authType: 'GENERAL_WRITTEN' as AuthorisationType,
        dpaContractId: 'DPA-A',
      },
      {
        customerId: 'c2',
        customerName: 'Customer B',
        authType: 'GENERAL_WRITTEN' as AuthorisationType,
        dpaContractId: 'DPA-B',
      },
    ];

    const notice = engine.initiateChangeNotice(subProcessor, customers, '2026-09-01T00:00:00.000Z');

    // Customer B objects on Sept 5
    engine.submitObjection(notice.noticeId, 'c2', 'Requires local sovereign storage', '2026-09-05T00:00:00.000Z');

    // Finalize on Sept 16 (after 14-day window)
    const finalized = engine.finalizeAuthorizations(notice.noticeId, '2026-09-16T00:00:00.000Z');

    expect(finalized.controllers['c1'].status).toBe('AUTHORIZED_AUTOMATIC');
    expect(finalized.controllers['c2'].status).toBe('OBJECTION_SUBMITTED');

    const cert = engine.generateAuditCertificate(notice.noticeId);
    expect(cert.totalControllers).toBe(2);
    expect(cert.authorizedCount).toBe(1);
    expect(cert.objectionsCount).toBe(1);
    expect(cert.art28_4_compliant).toBe(true);
    expect(cert.auditDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
