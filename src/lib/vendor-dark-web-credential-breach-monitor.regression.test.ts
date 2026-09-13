import { describe, it, expect } from 'vitest';
import {
  VendorDarkWebCredentialBreachMonitor,
  VendorCredentialBreachRecord,
} from './vendor-dark-web-credential-breach-monitor';

describe('QA-177: VendorDarkWebCredentialBreachMonitor Regression Tests', () => {
  const monitor = new VendorDarkWebCredentialBreachMonitor();

  it('returns clean zero-breach assessment for uncompromised vendor domain', () => {
    const assessment = monitor.assessVendorBreaches('safe-vendor.io', []);
    expect(assessment.totalCompromises).toBe(0);
    expect(assessment.maxThreatSeverityScore).toBe(0);
    expect(assessment.requiresEmergencyVendorIsolation).toBe(false);
    expect(assessment.quarantinedAccountCount).toBe(0);
  });

  it('triggers emergency isolation on critical infostealer breach of privileged account with active session token', () => {
    const records: VendorCredentialBreachRecord[] = [
      {
        breachId: 'BR-2026-001',
        vendorDomain: 'payment-gateway-subprocessor.com',
        compromisedEmail: 'devops-lead@payment-gateway-subprocessor.com',
        leakSource: 'INFOSTEALER_LOG', // 20 + 25 = 45
        isPrivilegedAccount: true,      // + 30 = 75
        hasPlaintextPassword: true,     // + 15 = 90
        hasActiveSessionToken: true,    // + 20 = 100 max
        discoveredAtIso: '2026-09-13T08:30:00Z',
      },
    ];

    const assessment = monitor.assessVendorBreaches('payment-gateway-subprocessor.com', records);
    expect(assessment.totalCompromises).toBe(1);
    expect(assessment.maxThreatSeverityScore).toBe(100);
    expect(assessment.requiresEmergencyVendorIsolation).toBe(true);
    expect(assessment.quarantinedAccountCount).toBe(1);
    expect(assessment.remediationActions[0]).toContain('API token revocation');
  });

  it('handles low-severity non-privileged leaked emails without emergency isolation', () => {
    const records: VendorCredentialBreachRecord[] = [
      {
        breachId: 'BR-2026-002',
        vendorDomain: 'saas-partner.com',
        compromisedEmail: 'marketing-intern@saas-partner.com',
        leakSource: 'COMBO_LIST', // 20
        isPrivilegedAccount: false,
        hasPlaintextPassword: false,
        hasActiveSessionToken: false,
        discoveredAtIso: '2026-09-10T12:00:00Z',
      },
    ];

    const assessment = monitor.assessVendorBreaches('saas-partner.com', records);
    expect(assessment.maxThreatSeverityScore).toBe(20);
    expect(assessment.requiresEmergencyVendorIsolation).toBe(false);
    expect(assessment.quarantinedAccountCount).toBe(0);
  });
});
