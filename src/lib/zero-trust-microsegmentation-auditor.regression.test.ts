import { describe, it, expect } from "vitest";
import {
  ZeroTrustMicrosegmentationAuditor,
  NetworkPolicyRule
} from "./zero-trust-microsegmentation-auditor";

describe("ZeroTrustMicrosegmentationAuditor", () => {
  it("validates 100% compliant zero-trust multi-tier network configuration", () => {
    const rules: NetworkPolicyRule[] = [
      {
        policyName: "allow-ingress-to-app",
        namespace: "production",
        sourceTier: "DMZ_INGRESS",
        destinationTier: "APPLICATION_SERVICES",
        allowedPort: 8080,
        protocol: "TCP",
        isDefaultDenyEnforced: true,
        isMtlsRequired: true,
        cidrAllowlist: ["10.0.10.0/24"]
      },
      {
        policyName: "allow-app-to-db",
        namespace: "production",
        sourceTier: "APPLICATION_SERVICES",
        destinationTier: "DATABASE_STORAGE",
        allowedPort: 5432,
        protocol: "TCP",
        isDefaultDenyEnforced: true,
        isMtlsRequired: true,
        cidrAllowlist: ["10.0.20.0/24"]
      }
    ];

    const result = ZeroTrustMicrosegmentationAuditor.auditPolicies("k8s-prod-us-east", rules);
    expect(result.complianceScorePct).toBe(100.0);
    expect(result.isZeroTrustCompliant).toBe(true);
    expect(result.criticalViolations).toHaveLength(0);
    expect(result.auditDigest).toHaveLength(64);
  });

  it("flags direct DMZ-to-database access, wildcard CIDR, and missing default deny", () => {
    const rules: NetworkPolicyRule[] = [
      {
        policyName: "flawed-dmz-direct-db",
        namespace: "untrusted",
        sourceTier: "DMZ_INGRESS",
        destinationTier: "DATABASE_STORAGE", // Violation!
        allowedPort: 5432,
        protocol: "TCP",
        isDefaultDenyEnforced: false, // Violation!
        isMtlsRequired: false, // Violation!
        cidrAllowlist: ["0.0.0.0/0"] // Violation!
      }
    ];

    const result = ZeroTrustMicrosegmentationAuditor.auditPolicies("k8s-flawed", rules);
    expect(result.isZeroTrustCompliant).toBe(false);
    expect(result.criticalViolations.length).toBeGreaterThanOrEqual(3);
    expect(result.remediationDirectives.length).toBeGreaterThanOrEqual(3);
  });

  it("validates input boundary requirements", () => {
    expect(() => {
      ZeroTrustMicrosegmentationAuditor.auditPolicies("", []);
    }).toThrow();
  });
});
