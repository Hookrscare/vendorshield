/**
 * QA-197: Zero Trust Microsegmentation Policy Compliance Auditor.
 * Part of VendorShield Third-Party Governance & Compliance Platform.
 *
 * Implements automated NIST SP 800-207 Zero Trust network microsegmentation auditing:
 * - Validates Kubernetes NetworkPolicy, Cilium eBPF, and Cloud Security Group rules
 * - Detects broad ingress/egress CIDRs (0.0.0.0/0), missing default-deny baselines,
 *   and unmediated tier jumps (e.g. DMZ frontend -> database without API gateway)
 * - Emits cryptographic SHA-256 microsegmentation compliance digests
 */

import { createHash } from "crypto";

export interface NetworkPolicyRule {
  policyName: string;
  namespace: string;
  sourceTier: "DMZ_INGRESS" | "APPLICATION_SERVICES" | "DATABASE_STORAGE" | "THIRD_PARTY_EXT";
  destinationTier: "DMZ_INGRESS" | "APPLICATION_SERVICES" | "DATABASE_STORAGE" | "THIRD_PARTY_EXT";
  allowedPort: number;
  protocol: "TCP" | "UDP";
  isDefaultDenyEnforced: boolean;
  isMtlsRequired: boolean;
  cidrAllowlist: string[]; // e.g. ["10.0.1.0/24"] or ["0.0.0.0/0"]
}

export interface MicrosegmentationAuditResult {
  clusterIdentifier: string;
  totalPoliciesEvaluated: number;
  complianceScorePct: number;
  isZeroTrustCompliant: boolean;
  criticalViolations: string[];
  remediationDirectives: string[];
  auditDigest: string;
}

export class ZeroTrustMicrosegmentationAuditor {
  public static readonly MINIMUM_COMPLIANCE_PASS_THRESHOLD = 90.0;

  public static auditPolicies(
    clusterIdentifier: string,
    rules: NetworkPolicyRule[]
  ): MicrosegmentationAuditResult {
    if (!clusterIdentifier || clusterIdentifier.trim() === "") {
      throw new Error("clusterIdentifier is required.");
    }
    if (!rules || rules.length === 0) {
      throw new Error("rules list cannot be empty.");
    }

    const criticalViolations: string[] = [];
    const remediationDirectives: string[] = [];
    let passedChecks = 0;
    let totalChecks = 0;

    for (const rule of rules) {
      // Check 1: Default Deny enforcement
      totalChecks++;
      if (rule.isDefaultDenyEnforced) {
        passedChecks++;
      } else {
        criticalViolations.push(`Policy '${rule.policyName}' in '${rule.namespace}' lacks default-deny isolation.`);
        remediationDirectives.push(`Enforce 'spec.podSelector: {}' default deny ingress and egress in namespace '${rule.namespace}'.`);
      }

      // Check 2: Unmediated Direct DB Access from Ingress/DMZ
      totalChecks++;
      if (rule.sourceTier === "DMZ_INGRESS" && rule.destinationTier === "DATABASE_STORAGE") {
        criticalViolations.push(`Direct DMZ-to-Database pathway detected in policy '${rule.policyName}'.`);
        remediationDirectives.push(`Route ingress traffic through APPLICATION_SERVICES intermediary before database queries.`);
      } else {
        passedChecks++;
      }

      // Check 3: Broad CIDR exposure (0.0.0.0/0)
      totalChecks++;
      const hasWildcardCidr = rule.cidrAllowlist.some(cidr => cidr.trim() === "0.0.0.0/0");
      if (hasWildcardCidr && rule.destinationTier !== "THIRD_PARTY_EXT") {
        criticalViolations.push(`Overly permissive 0.0.0.0/0 CIDR in policy '${rule.policyName}' targeting ${rule.destinationTier}.`);
        remediationDirectives.push(`Restrict CIDRs in '${rule.policyName}' to specific VPC pod subnets.`);
      } else {
        passedChecks++;
      }

      // Check 4: mTLS enforcement for internal east-west traffic
      totalChecks++;
      if (rule.destinationTier === "DATABASE_STORAGE" && !rule.isMtlsRequired) {
        criticalViolations.push(`mTLS encryption not enforced for database access in policy '${rule.policyName}'.`);
        remediationDirectives.push(`Enable SPIFFE/mTLS sidecar verification for port ${rule.allowedPort}.`);
      } else {
        passedChecks++;
      }
    }

    const scorePct = Number(((passedChecks / totalChecks) * 100.0).toFixed(1));
    const isCompliant = scorePct >= this.MINIMUM_COMPLIANCE_PASS_THRESHOLD && criticalViolations.length === 0;

    const digestPayload = `${clusterIdentifier}:${rules.length}:${scorePct}:${isCompliant}:${criticalViolations.length}`;
    const auditDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      clusterIdentifier,
      totalPoliciesEvaluated: rules.length,
      complianceScorePct: scorePct,
      isZeroTrustCompliant: isCompliant,
      criticalViolations,
      remediationDirectives,
      auditDigest
    };
  }
}
