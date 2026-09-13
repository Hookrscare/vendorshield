import { describe, it, expect } from "vitest";
import {
  Soc2MultiCloudIamLeastPrivilegeVerifier,
  IamRoleDelegationPolicy,
} from "./soc2-multicloud-iam-least-privilege-verifier";

describe("Soc2MultiCloudIamLeastPrivilegeVerifier (QA-186)", () => {
  const verifier = new Soc2MultiCloudIamLeastPrivilegeVerifier();

  it("approves fully compliant least-privilege role policy", () => {
    const policy: IamRoleDelegationPolicy = {
      roleId: "ROLE-VENDOR-01",
      roleArn: "arn:aws:iam::123456789012:role/VendorAuditorRole",
      provider: "AWS",
      trustPrincipal: "arn:aws:iam::987654321098:root",
      maxSessionDurationSeconds: 3600,
      requireMfa: true,
      externalIdRequired: true,
      statements: [
        {
          effect: "Allow",
          actions: ["s3:GetObject", "s3:ListBucket"],
          resources: ["arn:aws:s3:::vendor-audit-bucket/*", "arn:aws:s3:::vendor-audit-bucket"],
          conditions: {
            Bool: { "aws:MultiFactorAuthPresent": true },
            StringEquals: { "sts:ExternalId": "CORP-CLIENT-UUID-44" },
          },
        },
      ],
    };

    const result = verifier.verifyRolePolicy(policy);

    expect(result.isCompliant).toBe(true);
    expect(result.riskScore).toBe(0);
    expect(result.violations).toHaveLength(0);
    expect(result.soc2ControlsSatisfied).toContain("CC6.1");
    expect(result.soc2ControlsSatisfied).toContain("CC6.2");
    expect(result.soc2ControlsSatisfied).toContain("CC6.3");
    expect(result.evidenceDigest).toHaveLength(64);
  });

  it("detects critical wildcard action, unconstrained resource, and public trust", () => {
    const dangerousPolicy: IamRoleDelegationPolicy = {
      roleId: "ROLE-DANGEROUS-02",
      roleArn: "arn:aws:iam::123456789012:role/SuperAdminWildcard",
      provider: "AWS",
      trustPrincipal: "*",
      maxSessionDurationSeconds: 43200, // 12 hours
      requireMfa: true,
      statements: [
        {
          effect: "Allow",
          actions: ["*"],
          resources: ["*"],
        },
      ],
    };

    const result = verifier.verifyRolePolicy(dangerousPolicy);

    expect(result.isCompliant).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.violations.some(v => v.code === "PUBLIC_TRUST_PRINCIPAL")).toBe(true);
    expect(result.violations.some(v => v.code === "WILDCARD_ACTION_GRANT")).toBe(true);
    expect(result.violations.some(v => v.code === "EXCESSIVE_SESSION_DURATION")).toBe(true);
    expect(result.violations.some(v => v.code === "MISSING_MFA_ENFORCEMENT")).toBe(true);
  });

  it("throws error when role identifier is missing", () => {
    expect(() => {
      verifier.verifyRolePolicy({
        roleId: "",
        roleArn: "",
        provider: "AWS",
        trustPrincipal: "arn:aws:iam::111:root",
        maxSessionDurationSeconds: 3600,
        statements: [],
      });
    }).toThrow("roleId and roleArn must be specified.");
  });
});
