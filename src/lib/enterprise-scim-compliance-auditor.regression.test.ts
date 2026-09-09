import { describe, it, expect } from "vitest";
import {
  EnterpriseSCIMComplianceAuditor,
  SCIMUserRecord
} from "./enterprise-scim-compliance-auditor";

describe("QA-141: Enterprise SCIM Compliance Auditor", () => {
  const auditor = new EnterpriseSCIMComplianceAuditor({ maxDeprovisioningLatencyHours: 4 });
  const now = Date.now();

  it("identifies synchronized active enterprise users", () => {
    const user: SCIMUserRecord = {
      id: "usr_okta_01",
      userName: "alice.ciso",
      email: "alice@acme-corp.com",
      roles: ["SECURITY_ADMIN"],
      suspendedInIdP: false,
      activeInSaaS: true,
    };

    const evalResult = auditor.evaluateUserSync(user, now);
    expect(evalResult.state).toBe("ACTIVE_MATCHED");
    expect(evalResult.alert).toBeUndefined();
  });

  it("detects deprovisioning SLA breach when revoked in IdP but remains active after 4h", () => {
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const user: SCIMUserRecord = {
      id: "usr_okta_02",
      userName: "bob.contractor",
      email: "bob@acme-corp.com",
      roles: ["VIEWER"],
      suspendedInIdP: true,
      suspendedAtTimestamp: sixHoursAgo,
      activeInSaaS: true, // Still active in SaaS sub-processor
    };

    const evalResult = auditor.evaluateUserSync(user, now);
    expect(evalResult.state).toBe("DEPROVISION_SLA_BREACHED");
    expect(evalResult.alert).toBeDefined();
    expect(evalResult.alert?.severity).toBe("CRITICAL");
  });

  it("generates comprehensive compliance report with audit hash", () => {
    const users: SCIMUserRecord[] = [
      {
        id: "u1",
        userName: "carol",
        email: "carol@acme.com",
        roles: ["USER"],
        suspendedInIdP: false,
        activeInSaaS: true,
      },
      {
        id: "u2",
        userName: "david",
        email: "invalid-email",
        roles: ["ADMIN"],
        suspendedInIdP: false,
        activeInSaaS: true,
      }
    ];

    const report = auditor.auditSubprocessorDirectory(
      "tenant_enterprise_99",
      "vendor_hubspot",
      "OKTA",
      users,
      now
    );

    expect(report.totalEvaluatedUsers).toBe(2);
    expect(report.rogueAccountsCount).toBe(1);
    expect(report.isSoc2Compliant).toBe(false);
    expect(report.auditHash).toContain("AUDIT-SCIM-");
  });
});
