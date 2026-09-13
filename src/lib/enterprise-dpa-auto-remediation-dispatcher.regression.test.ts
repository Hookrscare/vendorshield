import { describe, it, expect } from 'vitest';
import {
  EnterpriseDpaAutoRemediationDispatcher,
  DpaViolationReport,
} from './enterprise-dpa-auto-remediation-dispatcher';

describe('QA-160: EnterpriseDpaAutoRemediationDispatcher Regression Tests', () => {
  const dispatcher = new EnterpriseDpaAutoRemediationDispatcher();

  it('triggers SCC fallback and data quarantine on cross-border adequacy breach', () => {
    const report: DpaViolationReport = {
      vendorId: 'VEND-ACME-CLOUD',
      vendorName: 'Acme Cloud Global',
      contractId: 'DPA-2026-88',
      violationType: 'CROSS_BORDER_ADEQUACY_BREACH',
      jurisdiction: 'EU',
      detectedAtIso: '2026-09-13T06:30:00Z',
      details: 'Unannounced routing of EU telemetry through non-adequate third country',
    };

    const action = dispatcher.remediateViolation(report);
    expect(action.stage).toBe('FALLBACK_SCC');
    expect(action.requiresDataQuarantine).toBe(true);
    expect(action.effectiveClause).toContain('EU Standard Contractual Clauses');
    expect(action.injunctionPayload).toBeDefined();
    expect(action.injunctionPayload?.cryptographicAttestationSha256).toHaveLength(64);
  });

  it('triggers emergency injunction and immediate quarantine on unauthorized data retention', () => {
    const report: DpaViolationReport = {
      vendorId: 'VEND-AI-LLM',
      vendorName: 'Synthetic Intelligence Corp',
      contractId: 'DPA-AI-2026',
      violationType: 'UNAUTHORIZED_DATA_RETENTION',
      jurisdiction: 'US',
      detectedAtIso: '2026-09-13T06:45:00Z',
      details: 'Customer payload retained beyond zero-retention SLA window',
    };

    const action = dispatcher.remediateViolation(report, 'dpo@syntheticcorp.com');
    expect(action.stage).toBe('INJUNCTION_DISPATCH');
    expect(action.requiresDataQuarantine).toBe(true);
    expect(action.injunctionPayload?.dispatchedToLegalContact).toBe('dpo@syntheticcorp.com');
  });

  it('generates deterministic cure demand for 4th-party onboarding', () => {
    const report: DpaViolationReport = {
      vendorId: 'VEND-HOSTING',
      vendorName: 'FastHost LLC',
      contractId: 'DPA-FH-01',
      violationType: 'UNAUTHORIZED_FOURTH_PARTY',
      jurisdiction: 'GLOBAL',
      detectedAtIso: '2026-09-13T07:00:00Z',
      details: 'Added sub-processor without 30-day objection notice',
    };

    const action = dispatcher.remediateViolation(report);
    expect(action.stage).toBe('CURE_DEMAND');
    expect(action.requiresDataQuarantine).toBe(false);
  });
});
