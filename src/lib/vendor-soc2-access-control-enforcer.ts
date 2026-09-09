/**
 * src/lib/vendor-soc2-access-control-enforcer.ts
 * QA-145: Automated Vendor SOC 2 CC6.1 - CC6.8 Access Control Policy Enforcer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Validates vendor technical access controls against AICPA Trust Services Criteria CC6:
 * - CC6.1: Multi-Factor Authentication (MFA) & Role-Based Access Control (RBAC).
 * - CC6.2: Explicit Access Provisioning & Least Privilege Authorizations.
 * - CC6.3: Offboarding Access Revocation SLAs (< 4 hours).
 * - CC6.6: Network Segmentation & Perimeter Intrusion Prevention.
 * - CC6.7: Transmission Encryption (TLS 1.3 / Perfect Forward Secrecy).
 * - CC6.8: Anti-Malware / EDR & Endpoint Protection Enforcement.
 */

import { createHash } from 'crypto';

export interface VendorAccessPosture {
  vendorId: string;
  vendorName: string;
  mfaEnforced: boolean;
  mfaType: 'WEBAUTHN_FIDO2' | 'TOTP' | 'SMS_INSECURE' | 'NONE';
  rbacImplemented: boolean;
  privilegedAccessJitDurationHours: number; // Max allowed: 8 hours
  quarterlyAccessReviewDocumented: boolean;
  deprovisioningSlaHours: number; // Max allowed: 4 hours
  networkSegmentationActive: boolean;
  tlsVersion: 'TLS_1_3' | 'TLS_1_2' | 'TLS_1_1_INSECURE' | 'TLS_1_0_INSECURE';
  cipherSuitesPfs: boolean; // Perfect Forward Secrecy
  edrDeployedPercentage: number; // 0 - 100%
  vulnerabilityPatchSlaDays: number; // Critical patch SLA (max: 14 days)
}

export interface ControlEvaluation {
  criteria: string;
  title: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'CRITICAL_DEFICIENCY';
  points: number;
  weight: number;
  finding?: string;
}

export interface VendorSOC2AuditReport {
  vendorId: string;
  vendorName: string;
  overallScore: number; // 0 - 100
  isApproved: boolean;
  riskTier: 'TIER_1_LOW' | 'TIER_2_MODERATE' | 'TIER_3_HIGH_RISK';
  controlEvaluations: ControlEvaluation[];
  criticalDeficiencies: string[];
  attestationToken: string;
}

export class VendorSOC2AccessControlEnforcer {
  /**
   * Audits sub-processor access security against SOC 2 Common Criteria 6.1 - 6.8.
   */
  public evaluateVendor(posture: VendorAccessPosture): VendorSOC2AuditReport {
    const controls: ControlEvaluation[] = [];
    const deficiencies: string[] = [];

    // CC6.1: Logical Access & MFA
    if (posture.mfaEnforced && (posture.mfaType === 'WEBAUTHN_FIDO2' || posture.mfaType === 'TOTP') && posture.rbacImplemented) {
      controls.push({
        criteria: 'CC6.1',
        title: 'MFA & Logical RBAC Infrastructure',
        status: 'COMPLIANT',
        points: 20,
        weight: 20
      });
    } else {
      const finding = !posture.mfaEnforced
        ? 'MFA is not enforced across vendor infrastructure.'
        : posture.mfaType === 'SMS_INSECURE'
        ? 'Insecure SMS-based MFA is in use; phishing-resistant or TOTP required.'
        : 'Role-based access control (RBAC) is missing or unverified.';
      controls.push({
        criteria: 'CC6.1',
        title: 'MFA & Logical RBAC Infrastructure',
        status: 'CRITICAL_DEFICIENCY',
        points: 0,
        weight: 20,
        finding
      });
      deficiencies.push(`CC6.1: ${finding}`);
    }

    // CC6.2: Authorized Provisioning & Least Privilege
    if (posture.privilegedAccessJitDurationHours <= 8 && posture.quarterlyAccessReviewDocumented) {
      controls.push({
        criteria: 'CC6.2',
        title: 'Authorized Provisioning & Least Privilege',
        status: 'COMPLIANT',
        points: 15,
        weight: 15
      });
    } else {
      const finding = posture.privilegedAccessJitDurationHours > 8
        ? `Privileged access JIT duration (${posture.privilegedAccessJitDurationHours}h) exceeds 8-hour ceiling.`
        : 'Quarterly user access review documentation is missing.';
      controls.push({
        criteria: 'CC6.2',
        title: 'Authorized Provisioning & Least Privilege',
        status: 'NON_COMPLIANT',
        points: 5,
        weight: 15,
        finding
      });
      deficiencies.push(`CC6.2: ${finding}`);
    }

    // CC6.3: Offboarding Deprovisioning SLA (< 4h)
    if (posture.deprovisioningSlaHours <= 4) {
      controls.push({
        criteria: 'CC6.3',
        title: 'Timely Access Revocation SLA',
        status: 'COMPLIANT',
        points: 15,
        weight: 15
      });
    } else {
      const finding = `Offboarding revocation SLA is ${posture.deprovisioningSlaHours}h, exceeding 4-hour mandate.`;
      controls.push({
        criteria: 'CC6.3',
        title: 'Timely Access Revocation SLA',
        status: 'CRITICAL_DEFICIENCY',
        points: 0,
        weight: 15,
        finding
      });
      deficiencies.push(`CC6.3: ${finding}`);
    }

    // CC6.6: Perimeter Boundary & Network Segmentation
    if (posture.networkSegmentationActive) {
      controls.push({
        criteria: 'CC6.6',
        title: 'Network Boundary & Workload Segmentation',
        status: 'COMPLIANT',
        points: 15,
        weight: 15
      });
    } else {
      const finding = 'Flat network topology detected; VPC/subnet workload isolation required.';
      controls.push({
        criteria: 'CC6.6',
        title: 'Network Boundary & Workload Segmentation',
        status: 'NON_COMPLIANT',
        points: 0,
        weight: 15,
        finding
      });
      deficiencies.push(`CC6.6: ${finding}`);
    }

    // CC6.7: Data Transmission Encryption
    if ((posture.tlsVersion === 'TLS_1_3' || posture.tlsVersion === 'TLS_1_2') && posture.cipherSuitesPfs) {
      controls.push({
        criteria: 'CC6.7',
        title: 'Transmission Encryption & Perfect Forward Secrecy',
        status: 'COMPLIANT',
        points: 15,
        weight: 15
      });
    } else {
      const finding = posture.tlsVersion.includes('INSECURE')
        ? `Legacy unencrypted or deprecated protocol (${posture.tlsVersion}) permitted.`
        : 'Cipher suites lack Perfect Forward Secrecy (PFS).';
      controls.push({
        criteria: 'CC6.7',
        title: 'Transmission Encryption & Perfect Forward Secrecy',
        status: 'CRITICAL_DEFICIENCY',
        points: 0,
        weight: 15,
        finding
      });
      deficiencies.push(`CC6.7: ${finding}`);
    }

    // CC6.8: Anti-Malware / EDR & Patch Management
    if (posture.edrDeployedPercentage >= 95 && posture.vulnerabilityPatchSlaDays <= 14) {
      controls.push({
        criteria: 'CC6.8',
        title: 'Endpoint Detection (EDR) & Vulnerability Remediation',
        status: 'COMPLIANT',
        points: 20,
        weight: 20
      });
    } else {
      const finding = posture.edrDeployedPercentage < 95
        ? `EDR endpoint coverage is ${posture.edrDeployedPercentage}%, below 95% threshold.`
        : `Critical patch SLA is ${posture.vulnerabilityPatchSlaDays} days, exceeding 14-day limit.`;
      controls.push({
        criteria: 'CC6.8',
        title: 'Endpoint Detection (EDR) & Vulnerability Remediation',
        status: 'NON_COMPLIANT',
        points: 8,
        weight: 20,
        finding
      });
      deficiencies.push(`CC6.8: ${finding}`);
    }

    const totalEarned = controls.reduce((acc, c) => acc + c.points, 0);
    const overallScore = totalEarned;

    let riskTier: 'TIER_1_LOW' | 'TIER_2_MODERATE' | 'TIER_3_HIGH_RISK' = 'TIER_1_LOW';
    if (overallScore < 70 || deficiencies.some(d => d.includes('CC6.1') || d.includes('CC6.3'))) {
      riskTier = 'TIER_3_HIGH_RISK';
    } else if (overallScore < 85) {
      riskTier = 'TIER_2_MODERATE';
    }

    const isApproved = riskTier !== 'TIER_3_HIGH_RISK' && overallScore >= 75;

    const payload = `${posture.vendorId}:${overallScore}:${riskTier}:${isApproved}:${deficiencies.length}`;
    const tokenHash = createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();

    return {
      vendorId: posture.vendorId,
      vendorName: posture.vendorName,
      overallScore,
      isApproved,
      riskTier,
      controlEvaluations: controls,
      criticalDeficiencies: deficiencies,
      attestationToken: `SOC2-CC6-${tokenHash}`
    };
  }
}
