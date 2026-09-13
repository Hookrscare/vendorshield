/**
 * QA-158: Continuous Automated Third-Party SaaS OAuth Token Scope & Permissions Escalation Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Continuously monitors OAuth grant lifecycle events, detects stealth permission expansions,
 * audits cross-tenant boundary isolation, and issues automated revocations for critical escalations.
 */

import { createHash } from "crypto";

export type EscalationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN";

export interface ScopeProfile {
  tenantId: string;
  vendorId: string;
  clientId: string;
  previousScopes: string[];
  requestedScopes: string[];
  authorizedRoles: string[];
  isCISOSignedOff?: boolean;
}

export interface EscalationViolation {
  scope: string;
  severity: EscalationSeverity;
  reason: string;
}

export interface EscalationAuditResult {
  tenantId: string;
  vendorId: string;
  clientId: string;
  addedScopes: string[];
  removedScopes: string[];
  unalteredScopes: string[];
  violations: EscalationViolation[];
  highestSeverity: EscalationSeverity;
  decision: "PERMITTED" | "ESCALATION_FLAGGED" | "AUTO_REVOKED";
  isolationBoundaryMaintained: boolean;
  attestationDigest: string;
  timestamp: string;
}

export class OAuthTokenScopeEscalationAuditor {
  private static readonly RESTRICTED_ESCALATION_SCOPES: Record<string, { severity: EscalationSeverity; reason: string }> = {
    "admin:all": { severity: "CRITICAL", reason: "Unrestricted administrative tenant access" },
    "org:impersonate": { severity: "CRITICAL", reason: "Cross-user identity impersonation grant" },
    "data:export:bulk": { severity: "CRITICAL", reason: "Unauthenticated bulk tenant data exfiltration risk" },
    "kms:decrypt:raw": { severity: "CRITICAL", reason: "Direct unsealed KMS master key decryption" },
    "security:audit:delete": { severity: "CRITICAL", reason: "Tampering with immutable audit chain logs" },
    "billing:write": { severity: "HIGH", reason: "Unauthorized payment and subscription modification" },
    "members:write": { severity: "HIGH", reason: "Privilege to add arbitrary collaborators" },
    "webhooks:admin": { severity: "HIGH", reason: "Arbitrary webhook endpoint injection" },
    "read:pii:unmasked": { severity: "HIGH", reason: "Direct unmasked GDPR Article 9 data access" },
  };

  /**
   * Scans scope transition deltas between baseline and requested authorization grants.
   */
  public static auditScopeEscalation(profile: ScopeProfile): EscalationAuditResult {
    const prevSet = new Set(profile.previousScopes.map(s => s.toLowerCase().trim()));
    const reqSet = new Set(profile.requestedScopes.map(s => s.toLowerCase().trim()));

    const addedScopes: string[] = [];
    const removedScopes: string[] = [];
    const unalteredScopes: string[] = [];

    for (const scope of reqSet) {
      if (!prevSet.has(scope)) {
        addedScopes.push(scope);
      } else {
        unalteredScopes.push(scope);
      }
    }

    for (const scope of prevSet) {
      if (!reqSet.has(scope)) {
        removedScopes.push(scope);
      }
    }

    const violations: EscalationViolation[] = [];

    for (const scope of addedScopes) {
      const knownViolation = this.RESTRICTED_ESCALATION_SCOPES[scope];
      if (knownViolation) {
        violations.push({
          scope,
          severity: knownViolation.severity,
          reason: knownViolation.reason,
        });
      } else if (scope.includes("admin") || scope.includes("root") || scope.includes("write")) {
        violations.push({
          scope,
          severity: "MEDIUM",
          reason: "Potentially elevated administrative mutation scope added",
        });
      }
    }

    // Determine highest severity
    let highestSeverity: EscalationSeverity = "CLEAN";
    if (violations.some(v => v.severity === "CRITICAL")) {
      highestSeverity = "CRITICAL";
    } else if (violations.some(v => v.severity === "HIGH")) {
      highestSeverity = "HIGH";
    } else if (violations.some(v => v.severity === "MEDIUM")) {
      highestSeverity = "MEDIUM";
    } else if (addedScopes.length > 0) {
      highestSeverity = "LOW";
    }

    // Tenant isolation verification
    const isolationBoundaryMaintained = !addedScopes.some(s => s.includes("cross-tenant") || s.includes("global"));

    // Decision enforcement
    let decision: "PERMITTED" | "ESCALATION_FLAGGED" | "AUTO_REVOKED" = "PERMITTED";
    if (!isolationBoundaryMaintained || (highestSeverity === "CRITICAL" && !profile.isCISOSignedOff)) {
      decision = "AUTO_REVOKED";
    } else if (highestSeverity === "HIGH" || (highestSeverity === "CRITICAL" && profile.isCISOSignedOff)) {
      decision = "ESCALATION_FLAGGED";
    }

    const timestamp = new Date().toISOString();
    const digestPayload = JSON.stringify({
      tenantId: profile.tenantId,
      vendorId: profile.vendorId,
      clientId: profile.clientId,
      addedScopes,
      decision,
      timestamp,
    });
    const attestationDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      tenantId: profile.tenantId,
      vendorId: profile.vendorId,
      clientId: profile.clientId,
      addedScopes,
      removedScopes,
      unalteredScopes,
      violations,
      highestSeverity,
      decision,
      isolationBoundaryMaintained,
      attestationDigest,
      timestamp,
    };
  }

  /**
   * Batch evaluates multiple active OAuth credentials across connected vendors.
   */
  public static auditPortfolioCredentials(profiles: ScopeProfile[]): {
    totalAudited: number;
    autoRevokedCount: number;
    flaggedCount: number;
    permittedCount: number;
    results: EscalationAuditResult[];
  } {
    const results = profiles.map(p => this.auditScopeEscalation(p));
    return {
      totalAudited: results.length,
      autoRevokedCount: results.filter(r => r.decision === "AUTO_REVOKED").length,
      flaggedCount: results.filter(r => r.decision === "ESCALATION_FLAGGED").length,
      permittedCount: results.filter(r => r.decision === "PERMITTED").length,
      results,
    };
  }
}
