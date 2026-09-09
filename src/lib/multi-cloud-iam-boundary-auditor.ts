/**
 * QA-143: Automated Multi-Cloud Tenant Isolation & IAM Boundary Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Audits IAM policies across AWS, GCP, and Azure for multi-tenant isolation,
 * flags wildcard permissions on critical resources, and verifies tenant boundary fences.
 */

export interface IamPolicyStatement {
  sid?: string;
  effect: "Allow" | "Deny";
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface TenantBoundaryAuditResult {
  tenantId: string;
  isCompliant: boolean;
  overallStatus: "COMPLIANT" | "WARNING" | "CRITICAL_VIOLATION";
  violations: {
    ruleId: string;
    severity: "HIGH" | "CRITICAL";
    message: string;
    resource: string;
  }[];
}

export class MultiCloudIamBoundaryAuditor {
  private static readonly CRITICAL_ACTIONS = [
    "iam:PassRole",
    "iam:CreateUser",
    "s3:*",
    "kms:*",
    "storage.objects.*",
    "resourcemanager.projects.setIamPolicy"
  ];

  public static auditPolicy(
    tenantId: string,
    statements: IamPolicyStatement[]
  ): TenantBoundaryAuditResult {
    const violations: { ruleId: string; severity: "HIGH" | "CRITICAL"; message: string; resource: string }[] = [];

    for (const stmt of statements) {
      if (stmt.effect !== "Allow") continue;

      // 1. Check for wildcard actions on critical infrastructure
      for (const action of stmt.actions) {
        if (action === "*" || this.CRITICAL_ACTIONS.includes(action)) {
          violations.push({
            ruleId: "IAM-001-WILDCARD-CRITICAL-ACTION",
            severity: "CRITICAL",
            message: `Overly permissive action '${action}' detected. Violates principle of least privilege.`,
            resource: stmt.resources.join(", ")
          });
        }
      }

      // 2. Check for missing tenant prefix on multi-tenant bucket/storage resources
      for (const res of stmt.resources) {
        if (res === "*") {
          violations.push({
            ruleId: "IAM-002-WILDCARD-RESOURCE",
            severity: "CRITICAL",
            message: "Wildcard '*' resource detected in Allow statement.",
            resource: res
          });
        } else if (res.includes("tenant-") && !res.includes(`tenant-${tenantId}`)) {
          violations.push({
            ruleId: "IAM-003-CROSS-TENANT-LEAKAGE",
            severity: "CRITICAL",
            message: `Statement grants access to resource belonging to a different tenant: '${res}'.`,
            resource: res
          });
        }
      }
    }

    const isCompliant = violations.length === 0;
    const overallStatus = isCompliant
      ? "COMPLIANT"
      : violations.some((v) => v.severity === "CRITICAL")
      ? "CRITICAL_VIOLATION"
      : "WARNING";

    return {
      tenantId,
      isCompliant,
      overallStatus,
      violations
    };
  }
}
