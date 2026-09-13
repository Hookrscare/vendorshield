import { describe, it, expect } from 'vitest';
import {
  DpaSubProcessorNotificationDispatcher,
  ProposedSubProcessorChange,
  CustomerDpaAgreement
} from './dpa-subprocessor-notification-dispatcher';

describe('QA-172: Automated DPA & Sub-Processor Change Notification Dispatcher', () => {
  const fixedNow = 1773400000000; // Mock current timestamp
  const msPerDay = 86400000;

  const sampleChange: ProposedSubProcessorChange = {
    changeId: 'chg_aws_rds_eu',
    vendorName: 'Amazon Web Services EMEA SARL',
    serviceDescription: 'Managed PostgreSQL Aurora Cloud DB',
    dataProcessingRegion: 'eu-west-1 (Ireland)',
    dataCategories: ['Customer Profile Data', 'Payment Audit Logs'],
    proposedEffectiveDateEpochMs: fixedNow + 35 * msPerDay // 35 days in future
  };

  const customers: CustomerDpaAgreement[] = [
    {
      customerId: 'cust_std_01',
      customerName: 'Acme SaaS',
      tier: 'STANDARD',
      requiredNoticeDays: 14,
      webhookUrl: 'https://acme.com/api/webhooks/compliance',
      webhookSecret: 'secret_key_acme_123'
    },
    {
      customerId: 'cust_ent_02',
      customerName: 'Global Bank Corp',
      tier: 'ENTERPRISE',
      requiredNoticeDays: 30,
      webhookUrl: 'https://bank.com/hooks/dpa',
      webhookSecret: 'secret_key_bank_999'
    }
  ];

  it('generates HMAC signatures and verifies notice period compliance', () => {
    const dispatches = DpaSubProcessorNotificationDispatcher.prepareDispatches(sampleChange, customers, fixedNow);

    expect(dispatches).toHaveLength(2);
    // Both 14-day and 30-day notice periods are satisfied by 35 days lead time
    expect(dispatches[0].compliantNoticePeriod).toBe(true);
    expect(dispatches[1].compliantNoticePeriod).toBe(true);

    expect(dispatches[0].signatureHeader).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(dispatches[0].payload.vendorName).toBe('Amazon Web Services EMEA SARL');
  });

  it('flags non-compliant lead time when change date violates enterprise notice requirements', () => {
    const tightChange: ProposedSubProcessorChange = {
      ...sampleChange,
      proposedEffectiveDateEpochMs: fixedNow + 20 * msPerDay // 20 days lead time
    };

    const dispatches = DpaSubProcessorNotificationDispatcher.prepareDispatches(tightChange, customers, fixedNow);

    // 20 days is enough for standard (14 days), but violates enterprise (30 days)
    expect(dispatches[0].compliantNoticePeriod).toBe(true);
    expect(dispatches[1].compliantNoticePeriod).toBe(false);
  });
});
