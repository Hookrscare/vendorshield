/**
 * Regression tests for QA-146: Multi-Cloud Sub-Processor Zero-Trust Data Flow & Microsegmentation Validator.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ZeroTrustDataFlowValidator, DataFlowRoute } from "./zero-trust-flow-validator";

describe("QA-146: ZeroTrustDataFlowValidator", () => {
  let validator: ZeroTrustDataFlowValidator;

  beforeEach(() => {
    validator = new ZeroTrustDataFlowValidator();
  });

  it("passes compliant route with HTTPS, mTLS, gateway proxy, and allowed classification", () => {
    const route: DataFlowRoute = {
      sourceService: "payment-service",
      destinationVendor: "stripe-api",
      destinationPort: 443,
      protocol: "HTTPS",
      enforcesMtls: true,
      dataClassificationTransferred: "RESTRICTED_PII_PCI",
      allowedClassifications: ["RESTRICTED_PII_PCI", "CONFIDENTIAL"],
      isProxiedThroughGateway: true,
    };

    const res = validator.validateDataFlow(route);
    expect(res.isCompliant).toBe(true);
    expect(res.complianceScore).toBe(100);
    expect(res.violations).toHaveLength(0);
    expect(res.auditDigestSha256).toHaveLength(64);
  });

  it("flags unencrypted plaintext egress and direct database access violations", () => {
    const route: DataFlowRoute = {
      sourceService: "legacy-worker",
      destinationVendor: "external-analytics",
      destinationPort: 5432,
      protocol: "HTTP",
      enforcesMtls: false,
      dataClassificationTransferred: "CONFIDENTIAL",
      allowedClassifications: ["CONFIDENTIAL"],
      isProxiedThroughGateway: false,
    };

    const res = validator.validateDataFlow(route);
    expect(res.isCompliant).toBe(false);
    expect(res.violations).toContain("UNENCRYPTED_PLAINTEXT_EGRESS");
    expect(res.violations).toContain("UNAUTHORIZED_DIRECT_DATABASE_ACCESS");
    expect(res.violations).toContain("BYPASSED_API_GATEWAY_PROXY");
    expect(res.complianceScore).toBeLessThan(50);
  });

  it("flags classification elevation when restricted data is sent to a vendor only cleared for public data", () => {
    const route: DataFlowRoute = {
      sourceService: "customer-support-app",
      destinationVendor: "public-helpdesk-bot",
      destinationPort: 443,
      protocol: "HTTPS",
      enforcesMtls: false,
      dataClassificationTransferred: "RESTRICTED_PII_PCI",
      allowedClassifications: ["PUBLIC"],
      isProxiedThroughGateway: true,
    };

    const res = validator.validateDataFlow(route);
    expect(res.isCompliant).toBe(false);
    expect(res.violations).toContain("DATA_CLASSIFICATION_EXCEEDED");
    expect(res.violations).toContain("MISSING_MUTUAL_TLS_FOR_RESTRICTED_DATA");
  });

  it("validates multi-route batch configurations correctly", () => {
    const routes: DataFlowRoute[] = [
      {
        sourceService: "auth-svc",
        destinationVendor: "auth0",
        destinationPort: 443,
        protocol: "HTTPS",
        enforcesMtls: true,
        dataClassificationTransferred: "CONFIDENTIAL",
        allowedClassifications: ["CONFIDENTIAL"],
        isProxiedThroughGateway: true,
      },
      {
        sourceService: "crawler-svc",
        destinationVendor: "untrusted-proxy",
        destinationPort: 80,
        protocol: "HTTP",
        enforcesMtls: false,
        dataClassificationTransferred: "INTERNAL",
        allowedClassifications: ["INTERNAL"],
        isProxiedThroughGateway: false,
      },
    ];

    const batch = validator.validateBatch(routes);
    expect(batch.overallCompliant).toBe(false);
    expect(batch.results).toHaveLength(2);
    expect(batch.results[0].isCompliant).toBe(true);
    expect(batch.results[1].isCompliant).toBe(false);
  });
});
