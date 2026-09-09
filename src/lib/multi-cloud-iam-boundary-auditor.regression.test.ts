import { describe, it, expect } from "vitest";
import { MultiCloudIamBoundaryAuditor, IamPolicyStatement } from "./multi-cloud-iam-boundary-auditor";

describe("QA-143: MultiCloudIamBoundaryAuditor Vitest Regression Suite", () => {
  it("approves properly scoped least-privilege tenant policy", () => {
    const stmts: IamPolicyStatement[] = [
      {
        effect: "Allow",
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: ["arn:aws:s3:::production-data/tenant-acme-corp/*"]
      }
    ];

    const res = MultiCloudIamBoundaryAuditor.auditPolicy("acme-corp", stmts);
    expect(res.isCompliant).toBe(true);
    expect(res.overallStatus).toBe("COMPLIANT");
    expect(res.violations.length).toBe(0);
  });

  it("flags wildcard critical action and cross-tenant leakage", () => {
    const stmts: IamPolicyStatement[] = [
      {
        effect: "Allow",
        actions: ["s3:*"],
        resources: ["arn:aws:s3:::production-data/tenant-other-corp/*"]
      }
    ];

    const res = MultiCloudIamBoundaryAuditor.auditPolicy("acme-corp", stmts);
    expect(res.isCompliant).toBe(false);
    expect(res.overallStatus).toBe("CRITICAL_VIOLATION");
    expect(res.violations.length).toBe(2);
    expect(res.violations.some((v) => v.ruleId === "IAM-001-WILDCARD-CRITICAL-ACTION")).toBe(true);
    expect(res.violations.some((v) => v.ruleId === "IAM-003-CROSS-TENANT-LEAKAGE")).toBe(true);
  });
});
