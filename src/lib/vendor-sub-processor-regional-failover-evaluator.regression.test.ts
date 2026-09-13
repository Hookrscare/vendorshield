import { describe, it, expect } from 'vitest';
import {
  VendorSubProcessorRegionalFailoverEvaluator,
  SubProcessorRegionHealth,
  DataResidencyPolicy,
} from './vendor-sub-processor-regional-failover-evaluator';

describe('QA-171: VendorSubProcessorRegionalFailoverEvaluator Regression Tests', () => {
  const evaluator = new VendorSubProcessorRegionalFailoverEvaluator();

  const gdprStrictPolicy: DataResidencyPolicy = {
    policyId: 'POL-GDPR-EU-ONLY',
    allowedJurisdictions: ['EU'],
    maxAcceptableLatencyMs: 400.0,
    maxAcceptableErrorRatePct: 2.0,
  };

  it('keeps routing on nominal primary EU region without failover', () => {
    const primaryEu: SubProcessorRegionHealth = {
      regionId: 'eu-central-1-frankfurt',
      geographicJurisdiction: 'EU',
      latencyMs: 65.0,
      errorRatePct: 0.1,
      circuitState: 'CLOSED',
      isAvailable: true,
    };

    const decision = evaluator.evaluateRegionalRouting(primaryEu, [], gdprStrictPolicy);
    expect(decision.isFailoverTriggered).toBe(false);
    expect(decision.selectedTargetRegionId).toBe('eu-central-1-frankfurt');
    expect(decision.isDataResidencyCompliant).toBe(true);
  });

  it('triggers failover to secondary EU region when primary suffers circuit-breaker trip', () => {
    const primaryFailed: SubProcessorRegionHealth = {
      regionId: 'eu-central-1-frankfurt',
      geographicJurisdiction: 'EU',
      latencyMs: 1850.0,
      errorRatePct: 15.0,
      circuitState: 'OPEN',
      isAvailable: false,
    };

    const standbys: SubProcessorRegionHealth[] = [
      {
        regionId: 'us-east-1-virginia',
        geographicJurisdiction: 'US', // Not allowed by GDPR strict
        latencyMs: 95.0,
        errorRatePct: 0.0,
        circuitState: 'CLOSED',
        isAvailable: true,
      },
      {
        regionId: 'eu-west-1-dublin',
        geographicJurisdiction: 'EU', // Allowed
        latencyMs: 85.0,
        errorRatePct: 0.2,
        circuitState: 'CLOSED',
        isAvailable: true,
      },
    ];

    const decision = evaluator.evaluateRegionalRouting(primaryFailed, standbys, gdprStrictPolicy);
    expect(decision.isFailoverTriggered).toBe(true);
    expect(decision.selectedTargetRegionId).toBe('eu-west-1-dublin');
    expect(decision.activeJurisdiction).toBe('EU');
    expect(decision.isDataResidencyCompliant).toBe(true);
  });

  it('blocks failover and flags violation if all available standbys breach data residency boundary', () => {
    const primaryFailed: SubProcessorRegionHealth = {
      regionId: 'eu-central-1-frankfurt',
      geographicJurisdiction: 'EU',
      latencyMs: 2500.0,
      errorRatePct: 50.0,
      circuitState: 'OPEN',
      isAvailable: false,
    };

    const usOnlyStandbys: SubProcessorRegionHealth[] = [
      {
        regionId: 'us-west-2-oregon',
        geographicJurisdiction: 'US',
        latencyMs: 120.0,
        errorRatePct: 0.0,
        circuitState: 'CLOSED',
        isAvailable: true,
      },
    ];

    const decision = evaluator.evaluateRegionalRouting(primaryFailed, usOnlyStandbys, gdprStrictPolicy);
    expect(decision.isFailoverTriggered).toBe(true);
    expect(decision.selectedTargetRegionId).toBeNull();
    expect(decision.isDataResidencyCompliant).toBe(false);
    expect(decision.failoverReason).toContain('NO failover regions satisfy GDPR/Sovereignty');
  });
});
