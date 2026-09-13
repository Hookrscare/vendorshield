import { describe, it, expect } from "vitest";
import {
  OAuthTokenScopeEscalationAuditor,
  ScopeProfile,
} from "./oauth-token-scope-escalation-auditor";

describe("QA-158: Continuous Automated Third-Party SaaS OAuth Token Scope & Permissions Escalation Auditor", () => {
  it("permits standard non-escalating scope requests", () => {
    const profile: ScopeProfile = {
      tenantId: "tenant-alpha",
      vendorId: "vendor-auth0",
      clientId: "client-123",
      previousScopes: ["read:user", "read:profile"],
      requestedScopes: ["read:user", "read:profile"],
      authorizedRoles: ["compliance_analyst"],
    };

    const res = OAuthTokenScopeEscalationAuditor.auditScopeEscalation(profile);
    expect(res.decision).toBe("PERMITTED");
    expect(res.highestSeverity).toBe("CLEAN");
    expect(res.addedScopes.length).toBe(0);
    expect(res.isolationBoundaryMaintained).toBe(true);
    expect(res.attestationDigest).toHaveLength(64);
  });

  it("auto-revokes stealth critical permission escalation without CISO approval", () => {
    const profile: ScopeProfile = {
      tenantId: "tenant-enterprise",
      vendorId: "vendor-rogue-integration",
      clientId: "client-999",
      previousScopes: ["read:user"],
      requestedScopes: ["read:user", "admin:all", "kms:decrypt:raw"],
      authorizedRoles: ["developer"],
      isCISOSignedOff: false,
    };

    const res = OAuthTokenScopeEscalationAuditor.auditScopeEscalation(profile);
    expect(res.decision).toBe("AUTO_REVOKED");
    expect(res.highestSeverity).toBe("CRITICAL");
    expect(res.violations.length).toBe(2);
    expect(res.addedScopes).toContain("admin:all");
    expect(res.addedScopes).toContain("kms:decrypt:raw");
  });

  it("flags high-severity escalation for review when approved by CISO signoff", () => {
    const profile: ScopeProfile = {
      tenantId: "tenant-enterprise",
      vendorId: "vendor-bi-tool",
      clientId: "client-456",
      previousScopes: ["read:reports"],
      requestedScopes: ["read:reports", "read:pii:unmasked"],
      authorizedRoles: ["ciso"],
      isCISOSignedOff: true,
    };

    const res = OAuthTokenScopeEscalationAuditor.auditScopeEscalation(profile);
    expect(res.decision).toBe("ESCALATION_FLAGGED");
    expect(res.highestSeverity).toBe("HIGH");
    expect(res.isolationBoundaryMaintained).toBe(true);
  });

  it("auto-revokes grants attempting cross-tenant boundary breach", () => {
    const profile: ScopeProfile = {
      tenantId: "tenant-isolated",
      vendorId: "vendor-sync",
      clientId: "client-777",
      previousScopes: ["read:metrics"],
      requestedScopes: ["read:metrics", "cross-tenant:data:read"],
      authorizedRoles: ["admin"],
    };

    const res = OAuthTokenScopeEscalationAuditor.auditScopeEscalation(profile);
    expect(res.decision).toBe("AUTO_REVOKED");
    expect(res.isolationBoundaryMaintained).toBe(false);
  });

  it("executes batch portfolio audits across multiple vendor grants", () => {
    const profiles: ScopeProfile[] = [
      {
        tenantId: "t1",
        vendorId: "v1",
        clientId: "c1",
        previousScopes: ["read:profile"],
        requestedScopes: ["read:profile"],
        authorizedRoles: ["user"],
      },
      {
        tenantId: "t2",
        vendorId: "v2",
        clientId: "c2",
        previousScopes: ["read:user"],
        requestedScopes: ["read:user", "admin:all"],
        authorizedRoles: ["dev"],
        isCISOSignedOff: false,
      },
    ];

    const batch = OAuthTokenScopeEscalationAuditor.auditPortfolioCredentials(profiles);
    expect(batch.totalAudited).toBe(2);
    expect(batch.permittedCount).toBe(1);
    expect(batch.autoRevokedCount).toBe(1);
  });
});
