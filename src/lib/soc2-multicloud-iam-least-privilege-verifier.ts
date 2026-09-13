/**
 * src/lib/soc2-multicloud-iam-least-privilege-verifier.ts
 * QA-186: SOC 2 Type II Multi-Cloud IAM Role Delegation & Least-Privilege Entitlement Verifier.
 * Part of VendorShield Multi-Cloud Third-Party Risk & Compliance Architecture.
 *
 * Evaluates cross-account role delegation policies across AWS, GCP, and Azure.
 * Enforces least-privilege scoping, eliminates wildcard permission creep, verifies external ID
 * and MFA conditions, and generates SOC 2 Trust Services Criteria (CC6.1, CC6.2, CC6.3) audit evidence.
 */

import { createHash } from "crypto";

export type CloudProvider = "AWS" | "GCP" | "AZURE";

export interface IamStatement {
  sid?: string;
  effect: "Allow" | "Deny";
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface IamRoleDelegationPolicy {
  roleId: string;
  roleArn: string;
  provider: CloudProvider;
  trustPrincipal: string; // e.g. "arn:aws:iam::123456789012:root" or "user@domain.com"
  trustedAccountIds?: string[];
  maxSessionDurationSeconds: number;
  statements: IamStatement[];
  requireMfa?: boolean;
  externalIdRequired?: boolean;
}

export interface IamViolation {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  statementIndex?: number;
}

export interface Soc2IamVerificationResult {
  roleId: string;
  provider: CloudProvider;
  isCompliant: boolean;
  soc2ControlsSatisfied: ("CC6.1" | "CC6.2" | "CC6.3")[];
  violations: IamViolation[];
  riskScore: number; // 0 to 100
  evidenceDigest: string;
}

export class Soc2MultiCloudIamLeastPrivilegeVerifier {
  public static readonly MAX_SAFE_ADMIN_SESSION_SEC = 3600; // 1 hour for elevated roles

  public verifyRolePolicy(
    policy: IamRoleDelegationPolicy,
    approvedAccountIds: string[] = []
  ): Soc2IamVerificationResult {
    if (!policy.roleId || !policy.roleArn) {
      throw new Error("roleId and roleArn must be specified.");
    }

    const violations: IamViolation[] = [];
    let riskPenalty = 0;

    // 1. Trust Principal Scoping Check
    if (policy.trustPrincipal === "*" || policy.trustPrincipal.includes(":root") && approvedAccountIds.length > 0) {
      if (policy.trustPrincipal === "*") {
        violations.push({
          code: "PUBLIC_TRUST_PRINCIPAL",
          severity: "CRITICAL",
          message: "Role trust policy allows public or unauthenticated principal wildcard (*).",
        });
        riskPenalty += 50;
      }
    }

    if (policy.provider === "AWS" && policy.externalIdRequired && !policy.statements.some(s => s.conditions?.["StringEquals"]?.["sts:ExternalId"])) {
      violations.push({
        code: "MISSING_EXTERNAL_ID_CONDITION",
        severity: "HIGH",
        message: "Cross-account delegation does not enforce sts:ExternalId condition against confused deputy attacks.",
      });
      riskPenalty += 25;
    }

    // 2. Session Duration Check
    if (policy.maxSessionDurationSeconds > Soc2MultiCloudIamLeastPrivilegeVerifier.MAX_SAFE_ADMIN_SESSION_SEC) {
      violations.push({
        code: "EXCESSIVE_SESSION_DURATION",
        severity: "MEDIUM",
        message: `Session duration (${policy.maxSessionDurationSeconds}s) exceeds maximum safe admin duration (3600s).`,
      });
      riskPenalty += 15;
    }

    // 3. MFA Enforcement Check
    if (policy.requireMfa) {
      const hasMfaCondition = policy.statements.some(s =>
        s.conditions?.["Bool"]?.["aws:MultiFactorAuthPresent"] === "true" ||
        s.conditions?.["Bool"]?.["aws:MultiFactorAuthPresent"] === true
      );
      if (!hasMfaCondition) {
        violations.push({
          code: "MISSING_MFA_ENFORCEMENT",
          severity: "HIGH",
          message: "Role requires MFA but no policy statement enforces MultiFactorAuthPresent constraint.",
        });
        riskPenalty += 25;
      }
    }

    // 4. Statement-level Wildcard & Least-Privilege Check
    policy.statements.forEach((stmt, idx) => {
      if (stmt.effect === "Allow") {
        // Action wildcards
        const hasFullActionWildcard = stmt.actions.includes("*");
        const hasBroadWildcards = stmt.actions.some(a => a.endsWith(":*") || a === "iam:*");

        if (hasFullActionWildcard) {
          violations.push({
            code: "WILDCARD_ACTION_GRANT",
            severity: "CRITICAL",
            message: `Statement ${idx} permits full wildcard action (*).`,
            statementIndex: idx,
          });
          riskPenalty += 40;
        } else if (hasBroadWildcards) {
          violations.push({
            code: "BROAD_SERVICE_WILDCARD",
            severity: "HIGH",
            message: `Statement ${idx} contains broad administrative service wildcards (e.g. * or iam:*).`,
            statementIndex: idx,
          });
          riskPenalty += 20;
        }

        // Resource wildcards
        const hasWildcardResource = stmt.resources.includes("*");
        if (hasWildcardResource && (hasFullActionWildcard || hasBroadWildcards)) {
          violations.push({
            code: "UNCONSTRAINED_WILDCARD_RESOURCE",
            severity: "CRITICAL",
            message: `Statement ${idx} combines wildcard actions with unconstrained wildcard resource (*).`,
            statementIndex: idx,
          });
          riskPenalty += 30;
        }
      }
    });

    const isCompliant = violations.length === 0;
    const finalRiskScore = Math.min(100, riskPenalty);

    const satisfiedControls: ("CC6.1" | "CC6.2" | "CC6.3")[] = [];
    if (!violations.some(v => v.code === "PUBLIC_TRUST_PRINCIPAL" || v.code === "MISSING_MFA_ENFORCEMENT")) {
      satisfiedControls.push("CC6.1"); // Logical access security
    }
    if (!violations.some(v => v.code === "WILDCARD_ACTION_GRANT" || v.code === "UNCONSTRAINED_WILDCARD_RESOURCE")) {
      satisfiedControls.push("CC6.2"); // Least privilege & user registration
    }
    if (!violations.some(v => v.code === "EXCESSIVE_SESSION_DURATION")) {
      satisfiedControls.push("CC6.3"); // Role revocation & ephemeral authorization
    }

    const digestRaw = `${policy.roleId}:${policy.provider}:${isCompliant}:${finalRiskScore}:${violations.length}`;
    const digest = createHash("sha256").update(digestRaw).digest("hex");

    return {
      roleId: policy.roleId,
      provider: policy.provider,
      isCompliant,
      soc2ControlsSatisfied: satisfiedControls,
      violations,
      riskScore: finalRiskScore,
      evidenceDigest: digest,
    };
  }
}
