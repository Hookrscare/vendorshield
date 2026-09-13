import { describe, it, expect } from 'vitest';
import {
  VendorSubprocessorHaFailoverEvaluator,
  VendorDisasterRecoveryTopology
} from './vendor-subprocessor-ha-failover-evaluator';

describe('QA-171: Multi-Region Vendor Sub-Processor High-Availability Regional Failover Evaluator', () => {
  it('approves compliant intra-EEA active-active multi-region failover topology', () => {
    const topology: VendorDisasterRecoveryTopology = {
      vendorId: 'v-auth01',
      vendorName: 'AuthShield Europe',
      primaryRegion: 'eu-west-1',
      failoverRegion: 'eu-central-1',
      architectureType: 'ACTIVE_ACTIVE',
      claimedRtoMinutes: 2,
      claimedRpoMinutes: 1,
      automatedFailoverEnabled: true,
      dpaSccExecuted: true
    };

    const result = VendorSubprocessorHaFailoverEvaluator.evaluateTopology(topology, 30, 5);

    expect(result.architectureGrade).toBe('OPTIMAL');
    expect(result.dataSovereigntyViolation).toBe(false);
    expect(result.soc2AvailabilityPass).toBe(true);
    expect(result.remediations).toHaveLength(0);
  });

  it('detects GDPR cross-border transfer violation during transatlantic failover without SCCs', () => {
    const topology: VendorDisasterRecoveryTopology = {
      vendorId: 'v-db-global',
      vendorName: 'Global Cloud DB',
      primaryRegion: 'eu-west-1',
      failoverRegion: 'us-east-1',
      architectureType: 'ACTIVE_PASSIVE_HOT',
      claimedRtoMinutes: 10,
      claimedRpoMinutes: 5,
      automatedFailoverEnabled: true,
      dpaSccExecuted: false // Missing SCCs!
    };

    const result = VendorSubprocessorHaFailoverEvaluator.evaluateTopology(topology, 60, 15);

    expect(result.architectureGrade).toBe('NON_COMPLIANT');
    expect(result.dataSovereigntyViolation).toBe(true);
    expect(result.remediations.some(r => r.includes('ILLEGAL_CROSS_BORDER_FAILOVER'))).toBe(true);
  });

  it('penalizes manual failover and cold standby recovery times', () => {
    const topology: VendorDisasterRecoveryTopology = {
      vendorId: 'v-legacy-erp',
      vendorName: 'Legacy ERP Sync',
      primaryRegion: 'us-east-1',
      failoverRegion: 'us-west-2',
      architectureType: 'COLD_STANDBY',
      claimedRtoMinutes: 30,
      claimedRpoMinutes: 10,
      automatedFailoverEnabled: false, // Manual failover
      dpaSccExecuted: true
    };

    const result = VendorSubprocessorHaFailoverEvaluator.evaluateTopology(topology, 60, 15);

    expect(result.architectureGrade).toBe('ELEVATED_RISK');
    expect(result.effectiveRtoMinutes).toBeGreaterThanOrEqual(240);
    expect(result.soc2AvailabilityPass).toBe(false);
    expect(result.remediations.some(r => r.includes('ENABLE_AUTOMATED_DNS_FAILOVER'))).toBe(true);
  });
});
