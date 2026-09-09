import { describe, it, expect } from "vitest";
import {
  VendorSoc2AccessControlEnforcer,
  type VendorAccessConfig,
} from "./vendor-soc2-access-control-enforcer";

describe("QA-145: Vendor SOC 2 CC6.1 - CC6.8 Access Control Policy Enforcer", () => {
  it("should evaluate a fully compliant tier-1 enterprise vendor", () => {
    const validConfig: VendorAccessConfig = {
      vendorId: "vendor-aws-cloud",
      vendorName: "Amazon Web Services",
      mfaEnforcedForAllUsers: true,
      ssoSamlConfigured: true,
      sessionTimeoutMinutes: 15,
      rbacRoleCount: 8,
      unassignedPermissionAccounts: 0,
      deprovisioningSlaHours: 4,
      tlsMinimumVersion: "TLS_1_3",
      wafActive: true,
      edrAgentCoveragePercent: 99.5,
      privilegedAccessReviewCadenceDays: 30,
    };

    const report = VendorSoc2AccessControlEnforcer.evaluateVendor(validConfig);
    expect(report.status).toBe("COMPLIANT");
    expect(report.overallComplianceScore).toBe(100);
    expect(report.criticalViolationsCount).toBe(0);
    expect(report.auditAttestationHash).toHaveLength(64);
  });

  it("should flag critical non-compliance on missing MFA and deprecated TLS", () => {
    const riskyConfig: VendorAccessConfig = {
      vendorId: "vendor-legacy-crm",
      vendorName: "Legacy CRM Systems Inc",
      mfaEnforcedForAllUsers: false, // Violation CC6.1
      ssoSamlConfigured: false,
      sessionTimeoutMinutes: 60, // Violation CC6.1 (>30m)
      rbacRoleCount: 1, // Violation CC6.2
      unassignedPermissionAccounts: 12, // Violation CC6.2
      deprovisioningSlaHours: 72, // Violation CC6.3 (>24h)
      tlsMinimumVersion: "TLS_1_0", // Violation CC6.7
      wafActive: false,
      edrAgentCoveragePercent: 60.0, // Violation CC6.8 (<95%)
      privilegedAccessReviewCadenceDays: 180,
    };

    const report = VendorSoc2AccessControlEnforcer.evaluateVendor(riskyConfig);
    expect(report.status).toBe("NON_COMPLIANT_HIGH_RISK");
    expect(report.criticalViolationsCount).toBeGreaterThanOrEqual(2);
    expect(report.overallComplianceScore).toBeLessThan(50);
  });
});
