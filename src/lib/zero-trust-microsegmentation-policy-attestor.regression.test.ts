import { describe, it, expect } from "vitest";
import {
  ZeroTrustMicrosegmentationPolicyAttestor,
  NetworkSecurityRule
} from "./zero-trust-microsegmentation-policy-attestor";

describe("QA-202: Automated Zero-Trust Microsegmentation Network Policy Audit Attestor", () => {
  it("verifies clean zero-trust microsegmentation architecture", () => {
    const rules: NetworkSecurityRule[] = [
      {
        ruleId: "RULE-WEB-INGRESS",
        sourceCidrOrIdentity: "0.0.0.0/0",
        destinationCidrOrIdentity: "k8s:ns=edge-gateway",
        destinationPort: 443,
        protocol: "TCP",
        action: "ALLOW",
        enforcesMtls: true,
      },
      {
        ruleId: "RULE-APP-TO-DB",
        sourceCidrOrIdentity: "spiffe://cluster.local/ns/backend/sa/app-server",
        destinationCidrOrIdentity: "k8s:ns=database",
        destinationPort: 5432,
        protocol: "TCP",
        action: "ALLOW",
        enforcesMtls: true,
      }
    ];

    const audit = ZeroTrustMicrosegmentationPolicyAttestor.auditNetworkPolicies("eks-prod-us-east-1", rules);

    expect(audit.totalRulesAudited).toBe(2);
    expect(audit.permissiveWildcardsCount).toBe(0);
    expect(audit.exposedDatabasePortsCount).toBe(0);
    expect(audit.isZeroTrustCompliant).toBe(true);
    expect(audit.complianceViolations).toHaveLength(0);
    expect(audit.ztaAttestationDigest).toHaveLength(64);
  });

  it("detects exposed database port and flags non-compliance", () => {
    const toxicRules: NetworkSecurityRule[] = [
      {
        ruleId: "RULE-TOXIC-REDIS",
        sourceCidrOrIdentity: "0.0.0.0/0", // Direct public exposure
        destinationCidrOrIdentity: "k8s:service=redis",
        destinationPort: 6379,
        protocol: "TCP",
        action: "ALLOW",
        enforcesMtls: false,
      }
    ];

    const audit = ZeroTrustMicrosegmentationPolicyAttestor.auditNetworkPolicies("eks-dev-cluster", toxicRules);

    expect(audit.isZeroTrustCompliant).toBe(false);
    expect(audit.exposedDatabasePortsCount).toBe(1);
    expect(audit.complianceViolations[0]).toContain("Database port 6379 directly exposed");
  });

  it("throws validation errors on invalid input", () => {
    expect(() => {
      ZeroTrustMicrosegmentationPolicyAttestor.auditNetworkPolicies("", []);
    }).toThrow("clusterIdentifier cannot be empty");

    expect(() => {
      ZeroTrustMicrosegmentationPolicyAttestor.auditNetworkPolicies("cluster-01", []);
    }).toThrow("rules list cannot be empty");
  });
});
