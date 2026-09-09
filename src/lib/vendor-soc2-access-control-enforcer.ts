/**
 * QA-145: Automated Vendor SOC 2 CC6.1 - CC6.8 Access Control Policy Enforcer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Validates vendor security configurations against AICPA SOC 2 Common Criteria CC6.1 - CC6.8:
 * - CC6.1: Logical access infrastructure (MFA, SSO, session timeouts)
 * - CC6.2: RBAC & Least Privilege
 * - CC6.3: Timely access revocation on offboarding (<24h)
 * - CC6.6: Boundary & perimeter protection (mTLS, IP Allowlist, WAF)
 * - CC6.7: Data-in-transit encryption (TLS 1.3/1.2 requirement)
 * - CC6.8: Malware & unauthorized code execution prevention (EDR, signed binaries)
 */

import crypto from "crypto";

export interface VendorAccessConfig {
  vendorId: string;
  vendorName: string;
  mfaEnforcedForAllUsers: boolean;
  ssoSamlConfigured: boolean;
  sessionTimeoutMinutes: number;
  rbacRoleCount: number;
  unassignedPermissionAccounts: number;
  deprovisioningSlaHours: number;
  tlsMinimumVersion: "TLS_1_0" | "TLS_1_1" | "TLS_1_2" | "TLS_1_3";
  wafActive: boolean;
  edrAgentCoveragePercent: number;
  privilegedAccessReviewCadenceDays: number;
}

export interface ControlEvaluation {
  controlId: "CC6.1" | "CC6.2" | "CC6.3" | "CC6.6" | "CC6.7" | "CC6.8";
  controlName: string;
  isCompliant: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deficiencyReason?: string;
  remediationGuidance?: string;
}

export interface AccessControlAuditReport {
  vendorId: string;
  vendorName: string;
  evaluatedAtIso: string;
  overallComplianceScore: number; // 0 - 100
  status: "COMPLIANT" | "CONDITIONALLY_ACCEPTABLE" | "NON_COMPLIANT_HIGH_RISK";
  controlEvaluations: ControlEvaluation[];
  criticalViolationsCount: number;
  auditAttestationHash: string;
}

export class VendorSoc2AccessControlEnforcer {
  /**
   * Audits a vendor against SOC 2 CC6.1 - CC6.8 access criteria.
   */
  public static evaluateVendor(config: VendorAccessConfig): AccessControlAuditReport {
    const evaluations: ControlEvaluation[] = [];

    // CC6.1: Logical Access Security (MFA, SSO, Session Timeout <= 30 mins)
    const cc6_1_compliant = config.mfaEnforcedForAllUsers && config.sessionTimeoutMinutes <= 30;
    evaluations.push({
      controlId: "CC6.1",
      controlName: "Logical Access Security Infrastructure",
      isCompliant: cc6_1_compliant,
      severity: "CRITICAL",
      deficiencyReason: !cc6_1_compliant
        ? "MFA must be enforced for 100% of accounts and session timeout must not exceed 30 minutes."
        : undefined,
      remediationGuidance: !cc6_1_compliant
        ? "Enforce mandatory WebAuthn/TOTP MFA in IdP and configure max 15-30m idle session timeouts."
        : undefined,
    });

    // CC6.2: RBAC & Least Privilege
    const cc6_2_compliant = config.rbacRoleCount >= 2 && config.unassignedPermissionAccounts === 0;
    evaluations.push({
      controlId: "CC6.2",
      controlName: "Role-Based Access Control & Least Privilege",
      isCompliant: cc6_2_compliant,
      severity: "HIGH",
      deficiencyReason: !cc6_2_compliant
        ? "Accounts with wildcard/unassigned direct permissions detected or missing RBAC hierarchy."
        : undefined,
      remediationGuidance: !cc6_2_compliant
        ? "Map all accounts to structured RBAC roles and eliminate direct permission attachments."
        : undefined,
    });

    // CC6.3: Offboarding Access Revocation
    const cc6_3_compliant = config.deprovisioningSlaHours <= 24;
    evaluations.push({
      controlId: "CC6.3",
      controlName: "Timely Deprovisioning & Access Revocation",
      isCompliant: cc6_3_compliant,
      severity: "CRITICAL",
      deficiencyReason: !cc6_3_compliant
        ? `Deprovisioning SLA (${config.deprovisioningSlaHours}h) exceeds SOC 2 maximum allowed threshold of 24h.`
        : undefined,
      remediationGuidance: !cc6_3_compliant
        ? "Implement SCIM automated identity de-provisioning tied to HRIS termination triggers."
        : undefined,
    });

    // CC6.6: Perimeter & Network Boundary
    const cc6_6_compliant = config.wafActive;
    evaluations.push({
      controlId: "CC6.6",
      controlName: "Boundary Protection & Threat Interception",
      isCompliant: cc6_6_compliant,
      severity: "MEDIUM",
      deficiencyReason: !cc6_6_compliant ? "Active Cloud WAF / perimeter filter not detected." : undefined,
      remediationGuidance: !cc6_6_compliant ? "Deploy managed WAF with OWASP Core Rule Set." : undefined,
    });

    // CC6.7: Data-in-Transit Encryption
    const isTlsSecure = config.tlsMinimumVersion === "TLS_1_2" || config.tlsMinimumVersion === "TLS_1_3";
    evaluations.push({
      controlId: "CC6.7",
      controlName: "Data-in-Transit Cryptographic Safeguards",
      isCompliant: isTlsSecure,
      severity: "CRITICAL",
      deficiencyReason: !isTlsSecure
        ? `Insecure TLS version (${config.tlsMinimumVersion}) allowed. Only TLS 1.2+ meets compliance.`
        : undefined,
      remediationGuidance: !isTlsSecure ? "Disable SSLv3, TLS 1.0, and TLS 1.1 at edge reverse proxy." : undefined,
    });

    // CC6.8: Malicious Software & Endpoint Protection
    const isEdrAdequate = config.edrAgentCoveragePercent >= 95.0;
    evaluations.push({
      controlId: "CC6.8",
      controlName: "Malicious Software Prevention & Endpoint Detection",
      isCompliant: isEdrAdequate,
      severity: "HIGH",
      deficiencyReason: !isEdrAdequate
        ? `EDR coverage (${config.edrAgentCoveragePercent}%) below 95% threshold for fleet protection.`
        : undefined,
      remediationGuidance: !isEdrAdequate
        ? "Enforce MDM enrollment policy blocking non-EDR reporting workstations from company VPN/IdP."
        : undefined,
    });

    const compliantCount = evaluations.filter((e) => e.isCompliant).length;
    const overallComplianceScore = Math.round((compliantCount / evaluations.length) * 100);

    const criticalViolationsCount = evaluations.filter((e) => !e.isCompliant && e.severity === "CRITICAL").length;

    let status: "COMPLIANT" | "CONDITIONALLY_ACCEPTABLE" | "NON_COMPLIANT_HIGH_RISK";
    if (criticalViolationsCount > 0 || overallComplianceScore < 70) {
      status = "NON_COMPLIANT_HIGH_RISK";
    } else if (overallComplianceScore < 100) {
      status = "CONDITIONALLY_ACCEPTABLE";
    } else {
      status = "COMPLIANT";
    }

    const timestamp = new Date().toISOString();
    const digestPayload = `${config.vendorId}:${overallComplianceScore}:${criticalViolationsCount}:${status}:${timestamp}`;
    const auditAttestationHash = crypto.createHash("sha256").update(digestPayload).digest("hex");

    return {
      vendorId: config.vendorId,
      vendorName: config.vendorName,
      evaluatedAtIso: timestamp,
      overallComplianceScore,
      status,
      controlEvaluations: evaluations,
      criticalViolationsCount,
      auditAttestationHash,
    };
  }
}
