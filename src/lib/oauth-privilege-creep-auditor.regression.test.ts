/**
 * Regression test suite for QA-148: Continuous Third-Party SaaS OAuth Token Scope & Privilege Creep Auditor.
 */

import { describe, it, expect } from "vitest";
import {
  OAuthPrivilegeCreepAuditor,
  OAuthTokenGrant
} from "./oauth-privilege-creep-auditor";

describe("QA-148: OAuthPrivilegeCreepAuditor Regression Suite", () => {
  it("approves tightly scoped and actively utilized token grants", () => {
    const grant: OAuthTokenGrant = {
      grantId: "grant_ok_1",
      vendorName: "Slack Notifications",
      appClientId: "client_slack_99",
      grantedScopes: ["chat:write", "users:read"],
      utilizedScopes: ["chat:write", "users:read"],
      daysSinceLastActivity: 2,
      grantAgeDays: 45,
      isExternalThirdParty: false
    };

    const res = OAuthPrivilegeCreepAuditor.auditGrant(grant);
    expect(res.recommendedAction).toBe("MAINTAIN");
    expect(res.creepFlags).toHaveLength(0);
  });

  it("flags dormant tokens for revocation", () => {
    const grant: OAuthTokenGrant = {
      grantId: "grant_dormant_1",
      vendorName: "Legacy CI Bot",
      appClientId: "client_ci_old",
      grantedScopes: ["repo", "workflow"],
      utilizedScopes: ["repo"],
      daysSinceLastActivity: 92,
      grantAgeDays: 200,
      isExternalThirdParty: true
    };

    const res = OAuthPrivilegeCreepAuditor.auditGrant(grant);
    expect(res.recommendedAction).toBe("REVOKE_TOKEN");
    expect(res.creepFlags.some(f => f.includes("DORMANT_TOKEN"))).toBe(true);
  });

  it("recommends downgrading scopes when write permissions are never utilized", () => {
    const grant: OAuthTokenGrant = {
      grantId: "grant_overprivileged_1",
      vendorName: "Data Analytics Exporter",
      appClientId: "client_analytics_22",
      grantedScopes: ["admin:org", "repo", "user:email"],
      utilizedScopes: ["user:email"],
      daysSinceLastActivity: 5,
      grantAgeDays: 30,
      isExternalThirdParty: true
    };

    const res = OAuthPrivilegeCreepAuditor.auditGrant(grant);
    expect(res.recommendedAction).toBe("DOWNGRADE_SCOPES");
    expect(res.creepFlags.some(f => f.includes("UNUSED_ELEVATED_SCOPES"))).toBe(true);
  });

  it("computes portfolio least privilege score and generates SHA-256 digest", () => {
    const grants: OAuthTokenGrant[] = [
      {
        grantId: "g1",
        vendorName: "Active Tool",
        appClientId: "c1",
        grantedScopes: ["user:read"],
        utilizedScopes: ["user:read"],
        daysSinceLastActivity: 1,
        grantAgeDays: 10,
        isExternalThirdParty: false
      },
      {
        grantId: "g2",
        vendorName: "Overprivileged App",
        appClientId: "c2",
        grantedScopes: ["cloud-platform", "user:read"],
        utilizedScopes: ["user:read"],
        daysSinceLastActivity: 2,
        grantAgeDays: 20,
        isExternalThirdParty: true
      }
    ];

    const report = OAuthPrivilegeCreepAuditor.auditPortfolio(grants);
    expect(report.totalGrantsAudited).toBe(2);
    expect(report.leastPrivilegeScore).toBeLessThan(100);
    expect(report.auditDigestSha256).toHaveLength(64);
  });
});
