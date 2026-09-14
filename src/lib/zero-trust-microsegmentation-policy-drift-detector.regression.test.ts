/**
 * Regression tests for QA-197: Zero-Trust Microsegmentation Policy Drift Detector.
 */

import { describe, it, expect } from "vitest";
import {
  ZeroTrustMicrosegmentationPolicyDriftDetector,
  MicrosegmentationPolicySnapshot
} from "./zero-trust-microsegmentation-policy-drift-detector";

describe("QA-197: ZeroTrustMicrosegmentationPolicyDriftDetector", () => {
  const basePolicyA: MicrosegmentationPolicySnapshot = {
    policyId: "np-dmz-to-app-01",
    namespace: "prod-edge",
    sourceTier: "DMZ_INGRESS",
    targetTier: "APP_SERVICES",
    allowedPorts: [443, 8443],
    protocol: "TCP",
    isDefaultDeny: true,
    requiresMtls: true,
    allowedCidrs: ["10.0.1.0/24"]
  };

  const basePolicyB: MicrosegmentationPolicySnapshot = {
    policyId: "np-app-to-db-02",
    namespace: "prod-data",
    sourceTier: "APP_SERVICES",
    targetTier: "DATA_TIER",
    allowedPorts: [5432],
    protocol: "TCP",
    isDefaultDeny: true,
    requiresMtls: true,
    allowedCidrs: ["10.0.2.0/24"]
  };

  it("reports 100% compliance when baseline and runtime policies match identically", () => {
    const baseline = [basePolicyA, basePolicyB];
    const runtime = [
      { ...basePolicyA },
      { ...basePolicyB }
    ];

    const attestation = ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift(
      "production-us-east-1",
      baseline,
      runtime
    );

    expect(attestation.complianceIntegrityScorePct).toBe(100);
    expect(attestation.hasCriticalOrHighDrift).toBe(false);
    expect(attestation.totalDriftFindings).toBe(0);
    expect(attestation.attestationDigest).toBeDefined();
    expect(attestation.attestationDigest.length).toBe(64);
  });

  it("detects critical drift when runtime policy widens CIDR to 0.0.0.0/0", () => {
    const baseline = [basePolicyA];
    const runtime = [
      {
        ...basePolicyA,
        allowedCidrs: ["10.0.1.0/24", "0.0.0.0/0"]
      }
    ];

    const attestation = ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift(
      "production-us-east-1",
      baseline,
      runtime
    );

    expect(attestation.hasCriticalOrHighDrift).toBe(true);
    expect(attestation.criticalCount).toBeGreaterThanOrEqual(1);
    expect(attestation.driftFindings[0].severity).toBe("CRITICAL");
    expect(attestation.driftFindings[0].driftType).toBe("RULE_WIDENED");
    expect(attestation.driftFindings[0].description).toContain("0.0.0.0/0");
    expect(attestation.complianceIntegrityScorePct).toBeLessThan(100);
  });

  it("detects critical drift when mTLS or default-deny is disabled in runtime", () => {
    const baseline = [basePolicyA];
    const runtime = [
      {
        ...basePolicyA,
        requiresMtls: false,
        isDefaultDeny: false
      }
    ];

    const attestation = ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift(
      "production-us-east-1",
      baseline,
      runtime
    );

    expect(attestation.criticalCount).toBe(2);
    expect(attestation.hasCriticalOrHighDrift).toBe(true);
    expect(attestation.driftFindings.some(f => f.description.includes("mTLS"))).toBe(true);
    expect(attestation.driftFindings.some(f => f.description.includes("Default-deny"))).toBe(true);
  });

  it("detects unauthorized removal of baseline guardrail policies", () => {
    const baseline = [basePolicyA, basePolicyB];
    const runtime = [basePolicyA]; // basePolicyB dropped

    const attestation = ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift(
      "production-us-east-1",
      baseline,
      runtime
    );

    expect(attestation.totalDriftFindings).toBe(1);
    expect(attestation.driftFindings[0].driftType).toBe("UNAUTHORIZED_REMOVAL");
    expect(attestation.driftFindings[0].policyId).toBe("np-app-to-db-02");
  });

  it("detects undeclared policy addition in runtime", () => {
    const baseline = [basePolicyA];
    const undeclaredPolicy: MicrosegmentationPolicySnapshot = {
      policyId: "np-rogue-rule-99",
      namespace: "prod-edge",
      sourceTier: "DMZ_INGRESS",
      targetTier: "EXTERNAL_VENDOR",
      allowedPorts: [80],
      protocol: "TCP",
      isDefaultDeny: false,
      requiresMtls: false,
      allowedCidrs: ["0.0.0.0/0"]
    };
    const runtime = [basePolicyA, undeclaredPolicy];

    const attestation = ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift(
      "production-us-east-1",
      baseline,
      runtime
    );

    expect(attestation.totalDriftFindings).toBe(1);
    expect(attestation.driftFindings[0].driftType).toBe("UNAUTHORIZED_ADDITION");
    expect(attestation.driftFindings[0].severity).toBe("CRITICAL");
  });

  it("throws error for missing environment or invalid arrays", () => {
    expect(() => {
      ZeroTrustMicrosegmentationPolicyDriftDetector.detectDrift("", [], []);
    }).toThrow("environment is required.");
  });
});
