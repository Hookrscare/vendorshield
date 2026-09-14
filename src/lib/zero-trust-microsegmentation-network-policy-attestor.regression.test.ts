/**
 * QA-202: Automated Zero-Trust Microsegmentation Network Policy Audit Attestor Regression Test Suite.
 */

import { describe, it, expect } from "vitest";
import {
  ZeroTrustMicrosegmentationNetworkPolicyAttestor,
  NetworkPolicyRule,
} from "./zero-trust-microsegmentation-network-policy-attestor";

describe("ZeroTrustMicrosegmentationNetworkPolicyAttestor (QA-202 Regression)", () => {
  it("approves fully compliant zero-trust microsegmentation architecture", () => {
    const compliantPolicies: NetworkPolicyRule[] = [
      {
        policyName: "ingress-dmz-to-app",
        namespace: "dmz-zone",
        sourceTier: "DMZ_INGRESS",
        destinationTier: "APP_SERVICES",
        destinationPorts: [443],
        protocol: "TCP",
        allowedCidrs: ["10.0.1.0/24"],
        enforcesDefaultDeny: true,
        requiresMtls: true,
        loggingEnabled: true,
      },
      {
        policyName: "app-to-data-vault",
        namespace: "core-apps",
        sourceTier: "APP_SERVICES",
        destinationTier: "DATA_TIER",
        destinationPorts: [5432],
        protocol: "TCP",
        allowedCidrs: ["10.0.2.0/24"],
        enforcesDefaultDeny: true,
        requiresMtls: true,
        loggingEnabled: true,
      },
    ];

    const attestation = ZeroTrustMicrosegmentationNetworkPolicyAttestor.auditPolicies(
      "prod-k8s-us-east-1",
      compliantPolicies
    );

    expect(attestation.isCompliant).toBe(true);
    expect(attestation.conformityScorePct).toBe(100);
    expect(attestation.totalViolationsCount).toBe(0);
    expect(attestation.criticalViolations).toBe(0);
    expect(attestation.auditDigestSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("detects critical violations for missing default deny and wildcard CIDR on data tier", () => {
    const flawedPolicies: NetworkPolicyRule[] = [
      {
        policyName: "unrestricted-db-access",
        namespace: "database-tier",
        sourceTier: "EXTERNAL_EGRESS",
        destinationTier: "DATA_TIER",
        destinationPorts: [5432],
        protocol: "TCP",
        allowedCidrs: ["0.0.0.0/0"], // CRITICAL
        enforcesDefaultDeny: false, // CRITICAL
        requiresMtls: false, // HIGH
        loggingEnabled: false, // MEDIUM
      },
    ];

    const attestation = ZeroTrustMicrosegmentationNetworkPolicyAttestor.auditPolicies(
      "dev-k8s-cluster",
      flawedPolicies
    );

    expect(attestation.isCompliant).toBe(false);
    expect(attestation.criticalViolations).toBe(2);
    expect(attestation.highViolations).toBe(1);
    expect(attestation.mediumViolations).toBe(1);
    expect(attestation.conformityScorePct).toBeLessThan(50);
  });

  it("flags tier bypass between DMZ and database", () => {
    const bypassPolicy: NetworkPolicyRule[] = [
      {
        policyName: "dmz-direct-db-bypass",
        namespace: "dmz-zone",
        sourceTier: "DMZ_INGRESS",
        destinationTier: "DATA_TIER",
        destinationPorts: [5432],
        protocol: "TCP",
        allowedCidrs: ["10.0.1.0/24"],
        enforcesDefaultDeny: true,
        requiresMtls: true,
        loggingEnabled: true,
      },
    ];

    const attestation = ZeroTrustMicrosegmentationNetworkPolicyAttestor.auditPolicies(
      "prod-edge-cluster",
      bypassPolicy
    );

    expect(attestation.isCompliant).toBe(false);
    expect(attestation.highViolations).toBe(1);
    const bypassFinding = attestation.violations.find((v) => v.ruleViolation === "TIER_MICROSEGMENTATION_BYPASS");
    expect(bypassFinding).toBeDefined();
    expect(bypassFinding?.severity).toBe("HIGH");
  });
});
