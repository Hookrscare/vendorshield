/**
 * QA-202: Automated Zero-Trust Microsegmentation Network Policy Audit Attestor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Evaluates Kubernetes NetworkPolicies, Cilium/Calico CNI policies, and cloud security groups
 * against NIST SP 800-207 Zero-Trust Architecture standards:
 * - Validates default-deny posture on all pod namespaces and security zones.
 * - Flags uncontained ingress/egress CIDR blocks (0.0.0.0/0 or ::/0) on private data tiers.
 * - Enforces strict tier microsegmentation (blocks DMZ-to-database bypasses).
 * - Audits mandatory mTLS cryptographic pod-to-pod identity assertion.
 * - Issues formal SHA-256 cryptographically sealed audit attestations for SOC 2 CC6.6 & FedRAMP High.
 */

import { createHash } from "crypto";

export type NetworkTier = "DMZ_INGRESS" | "APP_SERVICES" | "DATA_TIER" | "INTERNAL_VAULT" | "EXTERNAL_EGRESS";

export interface NetworkPolicyRule {
  policyName: string;
  namespace: string;
  sourceTier: NetworkTier;
  destinationTier: NetworkTier;
  destinationPorts: number[];
  protocol: "TCP" | "UDP" | "SCTP";
  allowedCidrs: string[];
  enforcesDefaultDeny: boolean;
  requiresMtls: boolean;
  loggingEnabled: boolean;
}

export type PolicyAuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PolicyAuditViolation {
  violationId: string;
  policyName: string;
  namespace: string;
  severity: PolicyAuditSeverity;
  ruleViolation: string;
  rationale: string;
  remediationPlan: string;
}

export interface ZeroTrustPolicyAttestation {
  attestationId: string;
  clusterId: string;
  evaluatedPoliciesCount: number;
  totalViolationsCount: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  conformityScorePct: number; // 0 - 100
  isCompliant: boolean;
  violations: PolicyAuditViolation[];
  auditDigestSha256: string;
  evaluatedAt: string;
}

export class ZeroTrustMicrosegmentationNetworkPolicyAttestor {
  /**
   * Audits a fleet of microsegmentation policies against NIST SP 800-207 zero-trust standards.
   */
  public static auditPolicies(
    clusterId: string,
    policies: NetworkPolicyRule[]
  ): ZeroTrustPolicyAttestation {
    const violations: PolicyAuditViolation[] = [];
    let violationCounter = 0;

    for (const policy of policies) {
      // 1. Check Default Deny
      if (!policy.enforcesDefaultDeny) {
        violationCounter++;
        violations.push({
          violationId: `ZT-VIO-${String(violationCounter).padStart(3, "0")}`,
          policyName: policy.policyName,
          namespace: policy.namespace,
          severity: "CRITICAL",
          ruleViolation: "MISSING_DEFAULT_DENY",
          rationale: `Namespace ${policy.namespace} does not declare an explicit default-deny ingress/egress baseline.`,
          remediationPlan: "Add an isolated NetworkPolicy with spec.podSelector: {} and spec.policyTypes: [Ingress, Egress].",
        });
      }

      // 2. Check Unrestricted CIDRs (0.0.0.0/0 or ::/0) on private/vault/data tiers
      const hasWildcardCidr = policy.allowedCidrs.some(
        (c) => c === "0.0.0.0/0" || c === "::/0"
      );
      if (
        hasWildcardCidr &&
        (policy.destinationTier === "DATA_TIER" ||
          policy.destinationTier === "INTERNAL_VAULT" ||
          policy.destinationTier === "APP_SERVICES")
      ) {
        violationCounter++;
        violations.push({
          violationId: `ZT-VIO-${String(violationCounter).padStart(3, "0")}`,
          policyName: policy.policyName,
          namespace: policy.namespace,
          severity: "CRITICAL",
          ruleViolation: "UNRESTRICTED_PRIVATE_TIER_INGRESS",
          rationale: `Wildcard CIDR exposure detected targeting sensitive tier ${policy.destinationTier}.`,
          remediationPlan: "Restrict allowed CIDRs to internal VPC subnets and enforce specific podSelectors.",
        });
      }

      // 3. Check Tier Bypass: DMZ cannot directly communicate with DATA_TIER or INTERNAL_VAULT
      if (
        policy.sourceTier === "DMZ_INGRESS" &&
        (policy.destinationTier === "DATA_TIER" || policy.destinationTier === "INTERNAL_VAULT")
      ) {
        violationCounter++;
        violations.push({
          violationId: `ZT-VIO-${String(violationCounter).padStart(3, "0")}`,
          policyName: policy.policyName,
          namespace: policy.namespace,
          severity: "HIGH",
          ruleViolation: "TIER_MICROSEGMENTATION_BYPASS",
          rationale: `Direct connection permitted from DMZ_INGRESS to ${policy.destinationTier}, bypassing APP_SERVICES tier.`,
          remediationPlan: "Route all database and vault queries through hardened intermediate application service proxies.",
        });
      }

      // 4. Mandatory mTLS validation
      if (!policy.requiresMtls) {
        violationCounter++;
        violations.push({
          violationId: `ZT-VIO-${String(violationCounter).padStart(3, "0")}`,
          policyName: policy.policyName,
          namespace: policy.namespace,
          severity: "HIGH",
          ruleViolation: "UNENCRYPTED_EAST_WEST_TRAFFIC",
          rationale: `Policy does not mandate cryptographic mTLS / SPIFFE identity verification for inter-service communication.`,
          remediationPlan: "Enable Istio PeerAuthentication STRICT or Cilium WireGuard node-to-node pod encryption.",
        });
      }

      // 5. Audit Logging requirement
      if (!policy.loggingEnabled) {
        violationCounter++;
        violations.push({
          violationId: `ZT-VIO-${String(violationCounter).padStart(3, "0")}`,
          policyName: policy.policyName,
          namespace: policy.namespace,
          severity: "MEDIUM",
          ruleViolation: "FLOW_LOGGING_DISABLED",
          rationale: `Network policy does not record telemetry or flow logs for audit forensics.`,
          remediationPlan: "Enable Hubble flow logging or AWS VPC flow log publishing for the security group.",
        });
      }
    }

    const criticalViolations = violations.filter((v) => v.severity === "CRITICAL").length;
    const highViolations = violations.filter((v) => v.severity === "HIGH").length;
    const mediumViolations = violations.filter((v) => v.severity === "MEDIUM").length;
    const lowViolations = violations.filter((v) => v.severity === "LOW").length;

    // Scoring: Start at 100, deduct for findings
    const penalty =
      criticalViolations * 25 +
      highViolations * 12 +
      mediumViolations * 5 +
      lowViolations * 2;
    const conformityScorePct = Math.max(0, Math.min(100, 100 - penalty));

    const isCompliant = criticalViolations === 0 && highViolations === 0 && conformityScorePct >= 85;

    const evaluatedAt = new Date().toISOString();
    const attestationId = `ZT-ATT-${createHash("sha256")
      .update(`${clusterId}-${evaluatedAt}`)
      .digest("hex")
      .slice(0, 12)
      .toUpperCase()}`;

    const auditPayload = {
      attestationId,
      clusterId,
      policiesCount: policies.length,
      violationsCount: violations.length,
      conformityScorePct,
      isCompliant,
      violationDigests: violations.map((v) => `${v.violationId}:${v.severity}:${v.ruleViolation}`),
      evaluatedAt,
    };

    const auditDigestSha256 = createHash("sha256")
      .update(JSON.stringify(auditPayload))
      .digest("hex");

    return {
      attestationId,
      clusterId,
      evaluatedPoliciesCount: policies.length,
      totalViolationsCount: violations.length,
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      conformityScorePct,
      isCompliant,
      violations,
      auditDigestSha256,
      evaluatedAt,
    };
  }
}
