import { describe, it, expect } from 'vitest';
import {
  DoraOperationalResilienceEvaluator,
  VendorDoraProfile,
} from './dora-operational-resilience-evaluator';

describe('QA-182: DoraOperationalResilienceEvaluator Regression Tests', () => {
  const evaluator = new DoraOperationalResilienceEvaluator();

  it('validates fully compliant critical ICT third-party vendor', () => {
    const compliantVendor: VendorDoraProfile = {
      vendorId: 'v-core-banking-cloud',
      vendorName: 'Global Cloud Tier 1',
      isCriticalIctProvider: true,
      recoveryTimeObjectiveMinutes: 30, // < 60 min
      recoveryPointObjectiveMinutes: 5,  // < 15 min
      lastLiveFailoverDrillDaysAgo: 120, // < 365 days
      lastThreatLedPenTestMonthsAgo: 14, // < 36 months
      hasDocumentedTransitionAndExitStrategy: true,
      subcontractorChainAudited: true,
    };

    const res = evaluator.evaluateVendor(compliantVendor);
    expect(res.isDoraCompliant).toBe(true);
    expect(res.readinessScoreOutOf100).toBe(100);
    expect(res.identifiedGaps.length).toBe(0);
    expect(res.remediationRequirements.length).toBe(0);
  });

  it('detects high-risk gaps in non-compliant critical ICT provider', () => {
    const nonCompliantVendor: VendorDoraProfile = {
      vendorId: 'v-legacy-ledger',
      vendorName: 'Legacy Host Solutions',
      isCriticalIctProvider: true,
      recoveryTimeObjectiveMinutes: 240, // 4 hours >> 60 min limit
      recoveryPointObjectiveMinutes: 120, // 2 hours >> 15 min limit
      lastLiveFailoverDrillDaysAgo: 500, // Stale drill
      lastThreatLedPenTestMonthsAgo: 48, // Stale TLPT
      hasDocumentedTransitionAndExitStrategy: false,
      subcontractorChainAudited: false,
    };

    const res = evaluator.evaluateVendor(nonCompliantVendor);
    expect(res.isDoraCompliant).toBe(false);
    expect(res.readinessScoreOutOf100).toBe(0);
    expect(res.identifiedGaps).toContain('RTO_EXCEEDS_THRESHOLD: 240m > 60m');
    expect(res.identifiedGaps).toContain('RPO_EXCEEDS_THRESHOLD: 120m > 15m');
    expect(res.identifiedGaps).toContain('MISSING_EXIT_STRATEGY: Lack of contractually guaranteed transition and exit assistance');
    expect(res.identifiedGaps).toContain('UNAUDITED_SUBCONTRACTOR_CHAIN: Critical fourth-party dependencies unmapped');
  });
});
