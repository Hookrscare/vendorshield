/**
 * src/lib/subprocessor-dpa-transfer-breach-detector.regression.test.ts
 * Vitest regression test suite for QA-168.
 */

import { describe, it, expect } from 'vitest';
import {
  SubprocessorDpaTransferBreachDetector,
  SubProcessorTransferProfile
} from './subprocessor-dpa-transfer-breach-detector';

describe('QA-168: SubprocessorDpaTransferBreachDetector', () => {
  const detector = new SubprocessorDpaTransferBreachDetector();
  const now = 1757750000;

  it('passes compliant sub-processor hosted entirely within the EEA', () => {
    const profile: SubProcessorTransferProfile = {
      subprocessorId: 'sp-hetzner-de',
      name: 'Hetzner Online GmbH',
      headquartersCountry: 'DE',
      processingRegions: ['DE', 'FI'],
      transferMechanisms: ['EU_ADEQUACY_DECISION'],
      dpfCertified: false,
      supplementaryEncryptionEnforced: true,
      customerKeysRetainedInEu: true,
    };

    const result = detector.evaluateTransferCompliance(profile, now);
    expect(result.overallStatus).toBe('COMPLIANT');
    expect(result.findings.length).toBe(0);
    expect(result.requiresDataProcessingSuspension).toBe(false);
    expect(result.attestationHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('flags CRITICAL_BREACH when transferring to non-adequate third country without SCC or DPF', () => {
    const profile: SubProcessorTransferProfile = {
      subprocessorId: 'sp-unauthorized-in',
      name: 'CloudSupport Analytics India Ltd',
      headquartersCountry: 'IN',
      processingRegions: ['IN'],
      transferMechanisms: ['NONE'],
      dpfCertified: false,
      supplementaryEncryptionEnforced: false,
      customerKeysRetainedInEu: false,
    };

    const result = detector.evaluateTransferCompliance(profile, now);
    expect(result.overallStatus).toBe('CRITICAL_BREACH');
    expect(result.requiresDataProcessingSuspension).toBe(true);
    expect(result.curePeriodDaysRemaining).toBe(14);
    expect(result.findings.some((f) => f.ruleId === 'GDPR-ART-46-MISSING-SCC')).toBe(true);
  });

  it('validates US sub-processor with active DPF certification', () => {
    const profile: SubProcessorTransferProfile = {
      subprocessorId: 'sp-us-cloud',
      name: 'US Cloud Analytics Inc',
      headquartersCountry: 'US',
      processingRegions: ['US'],
      transferMechanisms: ['EU_US_DATA_PRIVACY_FRAMEWORK'],
      dpfCertified: true,
      dpfCertificationExpiresEpoch: now + 86400 * 180, // valid for 180 days
      supplementaryEncryptionEnforced: true,
      customerKeysRetainedInEu: true,
    };

    const result = detector.evaluateTransferCompliance(profile, now);
    expect(result.overallStatus).toBe('COMPLIANT');
    expect(result.requiresDataProcessingSuspension).toBe(false);
  });

  it('flags HIGH_RISK_WARNING when SCCs exist but customer keys are held in foreign surveillance jurisdiction', () => {
    const profile: SubProcessorTransferProfile = {
      subprocessorId: 'sp-us-scc-nokeys',
      name: 'Global SaaS US Inc',
      headquartersCountry: 'US',
      processingRegions: ['US'],
      transferMechanisms: ['EU_SCCS_MODULE_2', 'UK_ADDENDUM_TO_SCCS'],
      dpfCertified: false,
      supplementaryEncryptionEnforced: true,
      customerKeysRetainedInEu: false, // key custody retained outside EU
    };

    const result = detector.evaluateTransferCompliance(profile, now);
    expect(result.overallStatus).toBe('HIGH_RISK_WARNING');
    expect(result.requiresDataProcessingSuspension).toBe(false);
    expect(result.findings.some((f) => f.ruleId === 'SCHREMS-II-SUPPLEMENTARY-MEASURES-DEFICIENT')).toBe(true);
  });
});
