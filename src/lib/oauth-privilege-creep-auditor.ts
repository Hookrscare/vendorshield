/**
 * QA-148: Continuous Third-Party SaaS OAuth Token Scope & Privilege Creep Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Scrutinizes third-party SaaS OAuth authorizations, detecting overprivileged tokens,
 * dormant service principals, and privilege creep to maintain SOC 2 CC6.1/CC6.3 compliance.
 */

import { createHash } from "crypto";

export type ScopeRiskTier = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface OAuthTokenGrant {
  grantId: string;
  vendorName: string;
  appClientId: string;
  grantedScopes: string[];
  utilizedScopes: string[];
  daysSinceLastActivity: number;
  grantAgeDays: number;
  isExternalThirdParty: boolean;
}

export interface PrivilegeAuditFinding {
  grantId: string;
  vendorName: string;
  riskTier: ScopeRiskTier;
  creepFlags: string[];
  recommendedAction: "REVOKE_TOKEN" | "DOWNGRADE_SCOPES" | "REAUTHORIZE" | "MAINTAIN";
  remediationDetails: string;
}

export interface OAuthAuditReport {
  totalGrantsAudited: number;
  criticalRiskGrants: number;
  dormantGrants: number;
  leastPrivilegeScore: number; // 0 - 100
  overallStatus: "COMPLIANT" | "ELEVATED_RISK" | "NON_COMPLIANT";
  findings: PrivilegeAuditFinding[];
  auditDigestSha256: string;
}

export class OAuthPrivilegeCreepAuditor {
  private static readonly CRITICAL_SCOPES = new Set([
    "admin:*", "admin:org", "repo", "write:packages", "cloud-platform",
    "directory.accessasuser.all", "files.readwrite.all", "user.impersonation"
  ]);

  private static readonly HIGH_RISK_SCOPES = new Set([
    "mail.read", "contacts.read", "drive.readonly", "repo:status",
    "audit:read", "user:email", "chat:read"
  ]);

  /**
   * Assesses risk tier for a given set of OAuth scopes.
   */
  public static evaluateScopeRisk(scopes: string[]): ScopeRiskTier {
    for (const s of scopes) {
      if (this.CRITICAL_SCOPES.has(s.toLowerCase()) || s.toLowerCase().includes("admin") || s.toLowerCase().includes("write")) {
        return "CRITICAL";
      }
    }
    for (const s of scopes) {
      if (this.HIGH_RISK_SCOPES.has(s.toLowerCase()) || s.toLowerCase().includes("read")) {
        return "HIGH";
      }
    }
    return "MODERATE";
  }

  /**
   * Evaluates a single OAuth token grant for scope creep and dormancy.
   */
  public static auditGrant(grant: OAuthTokenGrant): PrivilegeAuditFinding {
    const riskTier = this.evaluateScopeRisk(grant.grantedScopes);
    const creepFlags: string[] = [];
    let action: "REVOKE_TOKEN" | "DOWNGRADE_SCOPES" | "REAUTHORIZE" | "MAINTAIN" = "MAINTAIN";

    // Check dormancy
    if (grant.daysSinceLastActivity >= 60) {
      creepFlags.push(`DORMANT_TOKEN_${grant.daysSinceLastActivity}_DAYS_INACTIVE`);
      action = "REVOKE_TOKEN";
    }

    // Check unused granted scopes (least privilege violation)
    const unusedScopes = grant.grantedScopes.filter(s => !grant.utilizedScopes.includes(s));
    const hasUnusedElevatedScope = unusedScopes.some(s =>
      this.CRITICAL_SCOPES.has(s.toLowerCase()) || s.toLowerCase().includes("write")
    );

    if (hasUnusedElevatedScope) {
      creepFlags.push(`UNUSED_ELEVATED_SCOPES: [${unusedScopes.join(", ")}]`);
      if (action !== "REVOKE_TOKEN") {
        action = "DOWNGRADE_SCOPES";
      }
    }

    // Check external third party with critical permissions
    if (grant.isExternalThirdParty && riskTier === "CRITICAL") {
      creepFlags.push("EXTERNAL_VENDOR_HOLDS_CRITICAL_ADMIN_PRIVILEGES");
      if (grant.grantAgeDays > 180) {
        creepFlags.push("TOKEN_EXCEEDS_180_DAY_REAUTHORIZATION_LIMIT");
        if (action === "MAINTAIN") action = "REAUTHORIZE";
      }
    }

    const remediationDetails = creepFlags.length > 0
      ? `Flagged ${creepFlags.length} security concern(s). Recommended action: ${action}.`
      : "OAuth token conforms to SOC 2 least privilege baseline.";

    return {
      grantId: grant.grantId,
      vendorName: grant.vendorName,
      riskTier,
      creepFlags,
      recommendedAction: action,
      remediationDetails
    };
  }

  /**
   * Audits full portfolio of connected OAuth grants and computes compliance report.
   */
  public static auditPortfolio(grants: OAuthTokenGrant[]): OAuthAuditReport {
    const findings = grants.map(g => this.auditGrant(g));
    const criticalCount = findings.filter(f => f.riskTier === "CRITICAL").length;
    const dormantCount = findings.filter(f => f.creepFlags.some(c => c.startsWith("DORMANT_TOKEN"))).length;
    const violationsCount = findings.filter(f => f.recommendedAction !== "MAINTAIN").length;

    const penalty = (violationsCount / (grants.length || 1)) * 50 + (criticalCount > 2 ? 20 : 0);
    const leastPrivilegeScore = Math.max(0, Math.round(100 - penalty));

    let overallStatus: "COMPLIANT" | "ELEVATED_RISK" | "NON_COMPLIANT";
    if (leastPrivilegeScore >= 85) {
      overallStatus = "COMPLIANT";
    } else if (leastPrivilegeScore >= 60) {
      overallStatus = "ELEVATED_RISK";
    } else {
      overallStatus = "NON_COMPLIANT";
    }

    const digestPayload = `${grants.length}:${criticalCount}:${dormantCount}:${leastPrivilegeScore}:${overallStatus}`;
    const auditDigestSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      totalGrantsAudited: grants.length,
      criticalRiskGrants: criticalCount,
      dormantGrants: dormantCount,
      leastPrivilegeScore,
      overallStatus,
      findings,
      auditDigestSha256
    };
  }
}
