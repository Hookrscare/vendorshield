/**
 * QA-146: Multi-Cloud Sub-Processor Zero-Trust Data Flow & Microsegmentation Validator.
 * VendorShield B2B SOC 2 & GDPR Trust Hub.
 *
 * Implements NIST SP 800-207 Zero-Trust Architecture and SOC 2 CC6.6/CC6.7
 * logical boundary inspection for vendor egress microsegmentation and data classification.
 */

import { createHash } from "crypto";

export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED_PII_PCI";

export interface DataFlowRoute {
  sourceService: string;
  destinationVendor: string;
  destinationPort: number;
  protocol: "HTTPS" | "HTTP" | "GRPC_TLS" | "DIRECT_DB" | "SSH";
  enforcesMtls: boolean;
  dataClassificationTransferred: DataClassification;
  allowedClassifications: DataClassification[];
  isProxiedThroughGateway: boolean;
}

export type BoundaryViolationType =
  | "UNENCRYPTED_PLAINTEXT_EGRESS"
  | "UNAUTHORIZED_DIRECT_DATABASE_ACCESS"
  | "DATA_CLASSIFICATION_EXCEEDED"
  | "MISSING_MUTUAL_TLS_FOR_RESTRICTED_DATA"
  | "BYPASSED_API_GATEWAY_PROXY";

export interface FlowValidationResult {
  routeId: string;
  sourceService: string;
  destinationVendor: string;
  isCompliant: boolean;
  violations: BoundaryViolationType[];
  complianceScore: number;
  auditDigestSha256: string;
}

export class ZeroTrustDataFlowValidator {
  private classificationHierarchy: Record<DataClassification, number> = {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3,
    RESTRICTED_PII_PCI: 4,
  };

  public validateDataFlow(route: DataFlowRoute): FlowValidationResult {
    const violations: BoundaryViolationType[] = [];

    // 1. Encryption-in-transit check
    if (route.protocol === "HTTP") {
      violations.push("UNENCRYPTED_PLAINTEXT_EGRESS");
    }

    // 2. Direct database egress check (DB should never egress directly to 3rd party vendors)
    if (route.protocol === "DIRECT_DB" || [5432, 3306, 27017, 6379].includes(route.destinationPort)) {
      violations.push("UNAUTHORIZED_DIRECT_DATABASE_ACCESS");
    }

    // 3. API Gateway boundary traversal check
    if (!route.isProxiedThroughGateway && route.dataClassificationTransferred !== "PUBLIC") {
      violations.push("BYPASSED_API_GATEWAY_PROXY");
    }

    // 4. Data classification allowance check
    const transferredLevel = this.classificationHierarchy[route.dataClassificationTransferred];
    const maxAllowedLevel = Math.max(
      ...route.allowedClassifications.map((c) => this.classificationHierarchy[c] || 0)
    );

    if (transferredLevel > maxAllowedLevel) {
      violations.push("DATA_CLASSIFICATION_EXCEEDED");
    }

    // 5. mTLS check for highest sensitivity data (RESTRICTED_PII_PCI)
    if (route.dataClassificationTransferred === "RESTRICTED_PII_PCI" && !route.enforcesMtls) {
      violations.push("MISSING_MUTUAL_TLS_FOR_RESTRICTED_DATA");
    }

    const maxViolations = 5;
    const score = Math.max(0, Math.round(((maxViolations - violations.length) / maxViolations) * 100));
    const isCompliant = violations.length === 0;

    const routeId = `${route.sourceService}->${route.destinationVendor}:${route.destinationPort}`;
    const auditDigestSha256 = createHash("sha256")
      .update(`${routeId}:${score}:${isCompliant}:${violations.sort().join(",")}`)
      .digest("hex");

    return {
      routeId,
      sourceService: route.sourceService,
      destinationVendor: route.destinationVendor,
      isCompliant,
      violations,
      complianceScore: score,
      auditDigestSha256,
    };
  }

  public validateBatch(routes: DataFlowRoute[]): {
    overallCompliant: boolean;
    averageScore: number;
    results: FlowValidationResult[];
  } {
    const results = routes.map((r) => this.validateDataFlow(r));
    const overallCompliant = results.every((r) => r.isCompliant);
    const averageScore = Math.round(
      results.reduce((acc, r) => acc + r.complianceScore, 0) / Math.max(1, results.length)
    );

    return {
      overallCompliant,
      averageScore,
      results,
    };
  }
}
