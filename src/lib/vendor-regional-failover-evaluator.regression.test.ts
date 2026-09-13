/**
 * src/lib/vendor-regional-failover-evaluator.regression.test.ts
 * Regression tests for QA-171: Multi-Region Vendor Sub-Processor Regional Failover Evaluator.
 */

import { describe, it, expect } from 'vitest';
import { 
  VendorRegionalFailoverEvaluator,
  SubProcessorFailoverConfig,
  RegionalDataResidencyRule
} from './vendor-regional-failover-evaluator';

describe('QA-171: VendorRegionalFailoverEvaluator', () => {
  it('approves compliant multi-region active-active sub-processor within EEA', () => {
    const config: SubProcessorFailoverConfig = {
      vendorId: 'vend-aws-eu',
      vendorName: 'AWS Ireland & Frankfurt',
      primaryRegion: 'eu-west-1',
      failoverRegions: ['eu-central-1'],
      topology: 'ACTIVE_ACTIVE',
      slaRtoMinutes: 5,
      slaRpoMinutes: 1,
      lastDisasterRecoveryTestDate: '2026-06-15T00:00:00Z',
      healthCheckIntervalSec: 10
    };

    const residencyRule: RegionalDataResidencyRule = {
      allowedRegions: ['eu-west-1', 'eu-west-3', 'eu-central-1'],
      strictResidencyEnforced: true,
      jurisdiction: 'EU_EEA'
    };

    const result = VendorRegionalFailoverEvaluator.evaluate(config, residencyRule);

    expect(result.isCompliant).toBe(true);
    expect(result.highAvailabilityScore).toBe(100);
    expect(result.residencyViolations.length).toBe(0);
    expect(result.riskWarnings.length).toBe(0);
    expect(result.certificationSealSha256).toHaveLength(64);
  });

  it('flags data residency violation when failover region is outside permitted jurisdiction', () => {
    const config: SubProcessorFailoverConfig = {
      vendorId: 'vend-us-failover',
      vendorName: 'Cloud DB',
      primaryRegion: 'eu-west-1',
      failoverRegions: ['us-east-1'], // Violates EEA residency!
      topology: 'ACTIVE_PASSIVE_HOT',
      slaRtoMinutes: 15,
      slaRpoMinutes: 5,
      lastDisasterRecoveryTestDate: '2026-05-01T00:00:00Z',
      healthCheckIntervalSec: 30
    };

    const residencyRule: RegionalDataResidencyRule = {
      allowedRegions: ['eu-west-1', 'eu-central-1'],
      strictResidencyEnforced: true,
      jurisdiction: 'EU_EEA'
    };

    const result = VendorRegionalFailoverEvaluator.evaluate(config, residencyRule);

    expect(result.isCompliant).toBe(false);
    expect(result.residencyViolations.some(v => v.includes('us-east-1'))).toBe(true);
    expect(result.highAvailabilityScore).toBeLessThan(70);
  });

  it('penalizes single region deployments with zero regional failover', () => {
    const config: SubProcessorFailoverConfig = {
      vendorId: 'vend-single-rg',
      vendorName: 'Legacy Host',
      primaryRegion: 'us-east-1',
      failoverRegions: [],
      topology: 'SINGLE_REGION_NONE',
      slaRtoMinutes: 240,
      slaRpoMinutes: 60,
      lastDisasterRecoveryTestDate: '2024-01-01T00:00:00Z', // > 1 year ago
      healthCheckIntervalSec: 60
    };

    const result = VendorRegionalFailoverEvaluator.evaluate(config);

    expect(result.isCompliant).toBe(false);
    expect(result.highAvailabilityScore).toBeLessThan(40);
    expect(result.riskWarnings.some(w => w.includes('Single region'))).toBe(true);
  });
});
