import { describe, it, expect } from 'vitest';
import {
  SOC2TSCControlMonitor,
  InfrastructureTelemetry
} from './soc2-tsc-control-monitor';

describe('QA-139: SOC2TSCControlMonitor', () => {
  it('evaluates fully compliant infrastructure with 100 health score', () => {
    const telemetry: InfrastructureTelemetry = {
      tenantId: 'tenant-enterprise-001',
      mfaEnforcementRatio: 1.0,
      tlsVersion: 'TLSv1.3',
      backupFrequencyHours: 12,
      backupSuccessfulLast24h: true,
      vulnerabilityScanAgeDays: 5,
      unpatchedCriticalVulnCount: 0,
      auditLogRetentionDays: 365,
      encryptionAtRestEnabled: true,
      keyRotationAgeDays: 45,
      privacyNoticeAcknowledged: true
    };

    const evidence = SOC2TSCControlMonitor.evaluateTelemetry(telemetry);
    expect(evidence.overallHealthScore).toBe(100);
    expect(evidence.compliantCount).toBe(6);
    expect(evidence.failingCount).toBe(0);
    expect(evidence.attestationSignature).toHaveLength(64);
  });

  it('detects degraded controls and calculates partial score', () => {
    const telemetry: InfrastructureTelemetry = {
      tenantId: 'tenant-startup-002',
      mfaEnforcementRatio: 0.95, // DEGRADED (P2)
      tlsVersion: 'TLSv1.2', // DEGRADED (P3)
      backupFrequencyHours: 12,
      backupSuccessfulLast24h: true,
      vulnerabilityScanAgeDays: 5,
      unpatchedCriticalVulnCount: 0,
      auditLogRetentionDays: 365,
      encryptionAtRestEnabled: true,
      keyRotationAgeDays: 120, // DEGRADED (P2)
      privacyNoticeAcknowledged: true
    };

    const evidence = SOC2TSCControlMonitor.evaluateTelemetry(telemetry);
    expect(evidence.overallHealthScore).toBe(75); // (100*3 + 50*3) / 6 = 450 / 6 = 75
    expect(evidence.compliantCount).toBe(3);
    expect(evidence.failingCount).toBe(0);
  });

  it('flags critical failing controls with P0 severity', () => {
    const telemetry: InfrastructureTelemetry = {
      tenantId: 'tenant-breach-risk-003',
      mfaEnforcementRatio: 0.40, // FAIL (P0)
      tlsVersion: 'TLSv1.0', // FAIL (P0)
      backupFrequencyHours: 48, // FAIL (P1)
      backupSuccessfulLast24h: false,
      vulnerabilityScanAgeDays: 30,
      unpatchedCriticalVulnCount: 3, // FAIL (P0)
      auditLogRetentionDays: 90,
      encryptionAtRestEnabled: false, // FAIL (P0)
      keyRotationAgeDays: 200,
      privacyNoticeAcknowledged: false // FAIL (P1)
    };

    const evidence = SOC2TSCControlMonitor.evaluateTelemetry(telemetry);
    expect(evidence.overallHealthScore).toBe(0);
    expect(evidence.failingCount).toBe(6);
    const p0s = evidence.controls.filter((c) => c.severity === 'P0_CRITICAL');
    expect(p0s.length).toBeGreaterThanOrEqual(4);
  });
});
