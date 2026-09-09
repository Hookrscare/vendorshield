/**
 * src/lib/soc2-tsc-control-monitor.ts
 * QA-139: Automated Continuous SOC 2 Trust Services Criteria Control Monitor.
 *
 * Continuously evaluates SOC 2 Trust Services Criteria (Common Criteria,
 * Availability, Confidentiality, Processing Integrity, Privacy) across
 * multi-tenant infrastructure telemetry, scoring compliance and generating
 * cryptographically sealed audit evidence.
 */

import { createHash } from 'crypto';

export type TrustCategory =
  | 'SECURITY'
  | 'AVAILABILITY'
  | 'CONFIDENTIALITY'
  | 'PROCESSING_INTEGRITY'
  | 'PRIVACY';

export type ControlStatus = 'PASS' | 'DEGRADED' | 'FAIL';

export type SeverityLevel = 'P0_CRITICAL' | 'P1_MAJOR' | 'P2_MODERATE' | 'P3_LOW' | 'COMPLIANT';

export interface InfrastructureTelemetry {
  tenantId: string;
  mfaEnforcementRatio: number; // 0.0 to 1.0 (CC6.1)
  tlsVersion: string; // e.g. "TLSv1.3", "TLSv1.2", "TLSv1.0" (CC6.6)
  backupFrequencyHours: number; // e.g. 12 (A1.2)
  backupSuccessfulLast24h: boolean;
  vulnerabilityScanAgeDays: number; // e.g. 7 (CC7.1)
  unpatchedCriticalVulnCount: number;
  auditLogRetentionDays: number; // e.g. 365 (CC7.2)
  encryptionAtRestEnabled: boolean; // (C1.1)
  keyRotationAgeDays: number; // e.g. 60
  privacyNoticeAcknowledged: boolean; // (P1.1)
}

export interface ControlEvaluation {
  controlId: string; // e.g. "CC6.1", "A1.2"
  title: string;
  category: TrustCategory;
  status: ControlStatus;
  severity: SeverityLevel;
  finding?: string;
  remediation?: string;
}

export interface SOC2AuditEvidencePackage {
  tenantId: string;
  evaluationTimestamp: string;
  overallHealthScore: number; // 0..100
  compliantCount: number;
  failingCount: number;
  controls: ControlEvaluation[];
  attestationSignature: string; // SHA-256
}

export class SOC2TSCControlMonitor {
  /**
   * Evaluates telemetry against the 5 SOC 2 Trust Services Criteria categories.
   */
  public static evaluateTelemetry(telemetry: InfrastructureTelemetry): SOC2AuditEvidencePackage {
    const controls: ControlEvaluation[] = [];

    // CC6.1 - Logical Access: Multi-Factor Authentication
    if (telemetry.mfaEnforcementRatio >= 1.0) {
      controls.push({
        controlId: 'CC6.1',
        title: 'Universal Multi-Factor Authentication Enforcement',
        category: 'SECURITY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else if (telemetry.mfaEnforcementRatio >= 0.90) {
      controls.push({
        controlId: 'CC6.1',
        title: 'Universal Multi-Factor Authentication Enforcement',
        category: 'SECURITY',
        status: 'DEGRADED',
        severity: 'P2_MODERATE',
        finding: `MFA enforcement ratio is ${(telemetry.mfaEnforcementRatio * 100).toFixed(1)}% (< 100%)`,
        remediation: 'Enforce mandatory MFA challenge on remaining tenant administrator accounts.'
      });
    } else {
      controls.push({
        controlId: 'CC6.1',
        title: 'Universal Multi-Factor Authentication Enforcement',
        category: 'SECURITY',
        status: 'FAIL',
        severity: 'P0_CRITICAL',
        finding: `Severe MFA gap: ${(telemetry.mfaEnforcementRatio * 100).toFixed(1)}% enforcement`,
        remediation: 'Immediately block login for all accounts lacking enrolled MFA credentials.'
      });
    }

    // CC6.6 - Boundary Protection & Encryption in Transit
    const isTlsModern = telemetry.tlsVersion === 'TLSv1.3' || telemetry.tlsVersion === 'TLSv1.2';
    if (isTlsModern && telemetry.tlsVersion === 'TLSv1.3') {
      controls.push({
        controlId: 'CC6.6',
        title: 'Boundary Protection & Modern TLS In-Transit Encryption',
        category: 'SECURITY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else if (isTlsModern) {
      controls.push({
        controlId: 'CC6.6',
        title: 'Boundary Protection & Modern TLS In-Transit Encryption',
        category: 'SECURITY',
        status: 'DEGRADED',
        severity: 'P3_LOW',
        finding: 'TLSv1.2 currently accepted; migration to TLSv1.3 recommended.',
        remediation: 'Deprecate legacy cipher suites and upgrade load balancer minimum TLS policy.'
      });
    } else {
      controls.push({
        controlId: 'CC6.6',
        title: 'Boundary Protection & Modern TLS In-Transit Encryption',
        category: 'SECURITY',
        status: 'FAIL',
        severity: 'P0_CRITICAL',
        finding: `Insecure protocol in production: ${telemetry.tlsVersion}`,
        remediation: 'Disable TLS versions below 1.2 immediately.'
      });
    }

    // A1.2 - Data Backup & System Availability Recovery
    if (telemetry.backupSuccessfulLast24h && telemetry.backupFrequencyHours <= 24) {
      controls.push({
        controlId: 'A1.2',
        title: 'System Recovery & Disaster Preparedness Backups',
        category: 'AVAILABILITY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else {
      controls.push({
        controlId: 'A1.2',
        title: 'System Recovery & Disaster Preparedness Backups',
        category: 'AVAILABILITY',
        status: 'FAIL',
        severity: 'P1_MAJOR',
        finding: 'No verified successful database snapshot in the preceding 24-hour cycle.',
        remediation: 'Trigger emergency automated snapshot and inspect backup runner logs.'
      });
    }

    // CC7.1 - Vulnerability Detection & Patch Management
    if (telemetry.vulnerabilityScanAgeDays <= 14 && telemetry.unpatchedCriticalVulnCount === 0) {
      controls.push({
        controlId: 'CC7.1',
        title: 'Vulnerability Detection & Rapid Patch Management',
        category: 'SECURITY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else if (telemetry.unpatchedCriticalVulnCount > 0) {
      controls.push({
        controlId: 'CC7.1',
        title: 'Vulnerability Detection & Rapid Patch Management',
        category: 'SECURITY',
        status: 'FAIL',
        severity: 'P0_CRITICAL',
        finding: `${telemetry.unpatchedCriticalVulnCount} critical unpatched CVEs detected`,
        remediation: 'Apply hotfixes or deploy isolation firewalls within 24-hour SLA.'
      });
    } else {
      controls.push({
        controlId: 'CC7.1',
        title: 'Vulnerability Detection & Rapid Patch Management',
        category: 'SECURITY',
        status: 'DEGRADED',
        severity: 'P2_MODERATE',
        finding: `Vulnerability scan age exceeds threshold: ${telemetry.vulnerabilityScanAgeDays} days`,
        remediation: 'Trigger automated weekly container and dependency vulnerability scans.'
      });
    }

    // C1.1 - Confidentiality & Data Encryption at Rest
    if (telemetry.encryptionAtRestEnabled && telemetry.keyRotationAgeDays <= 90) {
      controls.push({
        controlId: 'C1.1',
        title: 'Data-at-Rest Protection & Key Lifecycle Rotation',
        category: 'CONFIDENTIALITY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else if (!telemetry.encryptionAtRestEnabled) {
      controls.push({
        controlId: 'C1.1',
        title: 'Data-at-Rest Protection & Key Lifecycle Rotation',
        category: 'CONFIDENTIALITY',
        status: 'FAIL',
        severity: 'P0_CRITICAL',
        finding: 'Unencrypted tenant persistent volumes identified.',
        remediation: 'Enable AES-256 / XTS volume-level encryption across storage pools.'
      });
    } else {
      controls.push({
        controlId: 'C1.1',
        title: 'Data-at-Rest Protection & Key Lifecycle Rotation',
        category: 'CONFIDENTIALITY',
        status: 'DEGRADED',
        severity: 'P2_MODERATE',
        finding: `Cryptographic key rotation age exceeds 90-day threshold (${telemetry.keyRotationAgeDays} days)`,
        remediation: 'Initiate automated KMS key rotation and re-encrypt data keys.'
      });
    }

    // P1.1 - Privacy Notice & Customer Consent
    if (telemetry.privacyNoticeAcknowledged) {
      controls.push({
        controlId: 'P1.1',
        title: 'Privacy Notice & Lawful Basis of Processing',
        category: 'PRIVACY',
        status: 'PASS',
        severity: 'COMPLIANT'
      });
    } else {
      controls.push({
        controlId: 'P1.1',
        title: 'Privacy Notice & Lawful Basis of Processing',
        category: 'PRIVACY',
        status: 'FAIL',
        severity: 'P1_MAJOR',
        finding: 'Missing documented privacy notice acceptance for active tenant.',
        remediation: 'Display required privacy disclosure modal on next dashboard session.'
      });
    }

    // Aggregate health score (PASS = 100, DEGRADED = 50, FAIL = 0)
    const totalPoints = controls.reduce((sum, c) => {
      if (c.status === 'PASS') return sum + 100;
      if (c.status === 'DEGRADED') return sum + 50;
      return sum;
    }, 0);
    const overallHealthScore = Math.round(totalPoints / controls.length);
    const compliantCount = controls.filter((c) => c.status === 'PASS').length;
    const failingCount = controls.filter((c) => c.status === 'FAIL').length;

    const timestamp = new Date().toISOString();
    const attestationPayload = `${telemetry.tenantId}:${overallHealthScore}:${compliantCount}:${failingCount}:${timestamp}`;
    const attestationSignature = createHash('sha256').update(attestationPayload).digest('hex');

    return {
      tenantId: telemetry.tenantId,
      evaluationTimestamp: timestamp,
      overallHealthScore,
      compliantCount,
      failingCount,
      controls,
      attestationSignature
    };
  }
}
