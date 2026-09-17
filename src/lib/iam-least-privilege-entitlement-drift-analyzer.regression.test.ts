/**
 * src/lib/iam-least-privilege-entitlement-drift-analyzer.regression.test.ts
 * Regression tests for QA-204: Automated IAM Least-Privilege Entitlement Drift Analyzer.
 * Part of VendorShield Multi-Cloud Third-Party Risk & Compliance Architecture.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  IamLeastPrivilegeEntitlementDriftAnalyzer,
  RoleEntitlementRecord
} from "./iam-least-privilege-entitlement-drift-analyzer";

describe("IamLeastPrivilegeEntitlementDriftAnalyzer", () => {
  let analyzer: IamLeastPrivilegeEntitlementDriftAnalyzer;
  const now = 1757800000;

  beforeEach(() => {
    analyzer = new IamLeastPrivilegeEntitlementDriftAnalyzer();
  });

  it("should accurately compute utilization ratio and detect dormant roles", () => {
    const dormantRecord: RoleEntitlementRecord = {
      roleId: "role-legacy-worker",
      roleArn: "arn:aws:iam::112233445566:role/LegacyWorker",
      platform: "AWS",
      assignedPrincipal: "arn:aws:iam::112233445566:user/ci-agent",
      grantedPermissions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket", "sqs:ReceiveMessage"],
      exercisedPermissions: ["s3:GetObject"],
      lastActiveTimestampSeconds: now - (95 * 24 * 3600), // 95 days ago -> dormant
      isJitEligible: true,
      mfaEnforced: true
    };

    const analysis = analyzer.analyzeEntitlementDrift(dormantRecord, now);
    expect(analysis.isDormant).toBe(true);
    expect(analysis.utilizationRatio).toBe(0.25);
    expect(analysis.recommendation).toBe("REVOKE_IMMEDIATELY");
    expect(analysis.unusedPermissions).toEqual(["s3:ListBucket", "s3:PutObject", "sqs:ReceiveMessage"]);
    expect(analysis.attestationHash).toHaveLength(64);
  });

  it("should flag critical privilege escalation vectors and recommend immediate revocation", () => {
    const escalationRecord: RoleEntitlementRecord = {
      roleId: "role-dev-engineer",
      roleArn: "arn:aws:iam::112233445566:role/DevEngineer",
      platform: "AWS",
      assignedPrincipal: "arn:aws:iam::112233445566:user/dev1",
      grantedPermissions: ["s3:GetObject", "iam:PassRole", "iam:AttachUserPolicy"],
      exercisedPermissions: ["s3:GetObject"],
      lastActiveTimestampSeconds: now - (10 * 24 * 3600),
      isJitEligible: true,
      mfaEnforced: false
    };

    const analysis = analyzer.analyzeEntitlementDrift(escalationRecord, now);
    expect(analysis.isDormant).toBe(false);
    expect(analysis.escalationRisks.length).toBe(2);
    expect(analysis.escalationRisks.some(r => r.permission === "iam:PassRole")).toBe(true);
    expect(analysis.escalationRisks.some(r => r.permission === "iam:AttachUserPolicy")).toBe(true);
    expect(analysis.recommendation).toBe("REVOKE_IMMEDIATELY");
  });

  it("should recommend downsizing permissions when utilization is below threshold", () => {
    const overPrivilegedRecord: RoleEntitlementRecord = {
      roleId: "role-analytics-reader",
      roleArn: "arn:aws:iam::112233445566:role/AnalyticsReader",
      platform: "AWS",
      assignedPrincipal: "arn:aws:iam::112233445566:user/analyst",
      grantedPermissions: ["s3:GetObject", "s3:ListBucket", "athena:StartQueryExecution", "glue:GetTable"],
      exercisedPermissions: ["s3:GetObject"],
      lastActiveTimestampSeconds: now - (5 * 24 * 3600),
      isJitEligible: true,
      mfaEnforced: true
    };

    const analysis = analyzer.analyzeEntitlementDrift(overPrivilegedRecord, now);
    expect(analysis.recommendation).toBe("DOWNSIZE_PERMISSIONS");
    expect(analysis.utilizationRatio).toBe(0.25);

    const downsized = analyzer.generateDownsizingPolicy(overPrivilegedRecord);
    expect(downsized.allowedActions).toEqual(["s3:GetObject"]);
    expect(downsized.policyName).toBe("VendorShield-LeastPrivilege-role-analytics-reader");
    expect(downsized.boundaryDigest).toHaveLength(64);
  });
});
