import { describe, it, expect } from 'vitest';
import {
  EnterpriseDpaInjunctionDispatcher,
  DpaBreachEvent,
} from './enterprise-dpa-injunction-dispatcher';

describe('QA-160: Enterprise DPA Injunction Dispatcher', () => {
  const dispatcher = new EnterpriseDpaInjunctionDispatcher('secret-test-key-2026');

  it('triggers emergency API revocation and 24-hour cure period on CRITICAL cross-border exfiltration', () => {
    const event: DpaBreachEvent = {
      vendorId: 'VEND-991',
      vendorName: 'Global Cloud Storage Ltd',
      dpaContractId: 'DPA-EU-US-009',
      breachType: 'cross_border_data_exfiltration',
      details: 'Detected EU GDPR telemetry streamed to un-approved US-East endpoint',
      timestamp: new Date().toISOString(),
    };

    const notice = dispatcher.evaluateAndDispatch(event);

    expect(notice.severity).toBe('CRITICAL');
    expect(notice.freezeApiAccess).toBe(true);
    expect(notice.curePeriodHours).toBe(24);
    expect(notice.demandedRemediations.length).toBeGreaterThan(0);
    expect(dispatcher.verifyNoticeSignature(notice)).toBe(true);
  });

  it('dispatches HIGH severity notice for unvetted sub-processor insertion without immediate API freeze', () => {
    const event: DpaBreachEvent = {
      vendorId: 'VEND-812',
      vendorName: 'Analytics Pipeline Corp',
      dpaContractId: 'DPA-CORP-442',
      breachType: 'unauthorized_subprocessor_addition',
      details: 'Added 4th-party AI vector provider without 30-day notice window',
      timestamp: new Date().toISOString(),
    };

    const notice = dispatcher.evaluateAndDispatch(event);

    expect(notice.severity).toBe('HIGH');
    expect(notice.freezeApiAccess).toBe(false);
    expect(notice.curePeriodHours).toBe(48);
    expect(dispatcher.verifyNoticeSignature(notice)).toBe(true);
  });

  it('detects tampering in legal injunction signature', () => {
    const event: DpaBreachEvent = {
      vendorId: 'VEND-104',
      vendorName: 'Legacy Email Relay',
      dpaContractId: 'DPA-LEG-101',
      breachType: 'retention_period_exceeded',
      details: 'Retained unsubscribed user hashes past 90 days',
      timestamp: new Date().toISOString(),
    };

    const notice = dispatcher.evaluateAndDispatch(event);
    expect(dispatcher.verifyNoticeSignature(notice)).toBe(true);

    // Tamper with cure period
    const tamperedNotice = { ...notice, curePeriodHours: 999 };
    expect(dispatcher.verifyNoticeSignature(tamperedNotice)).toBe(false);
  });
});
