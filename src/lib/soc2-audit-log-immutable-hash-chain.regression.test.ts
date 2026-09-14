import { describe, it, expect } from "vitest";
import {
  SOC2AuditLogImmutableHashChain,
  AuditLogEntryInput
} from "./soc2-audit-log-immutable-hash-chain";

describe("QA-115: SOC2AuditLogImmutableHashChain", () => {
  const secret = "test_audit_chain_hmac_secret_2026";
  const tenantId = "TENANT-SHIELD-01";

  it("should record append-only audit entries and verify unbroken chain", () => {
    const chainEngine = new SOC2AuditLogImmutableHashChain(secret);

    const input1: AuditLogEntryInput = {
      tenantId,
      eventType: "USER_LOGIN",
      actorId: "usr_admin",
      actorIp: "10.0.0.1",
      resourceId: "portal_session",
      actionDetails: { mfa_type: "TOTP" }
    };

    const entry1 = chainEngine.appendEvent(input1);
    expect(entry1.sequenceNumber).toBe(1);
    expect(entry1.previousHash).toHaveLength(64);
    expect(entry1.currentHash).toHaveLength(64);

    const input2: AuditLogEntryInput = {
      tenantId,
      eventType: "PERMISSION_GRANT",
      actorId: "usr_admin",
      actorIp: "10.0.0.1",
      resourceId: "role_auditor",
      actionDetails: { grantee: "usr_auditor_bob" }
    };

    const entry2 = chainEngine.appendEvent(input2);
    expect(entry2.sequenceNumber).toBe(2);
    expect(entry2.previousHash).toBe(entry1.currentHash);

    const report = chainEngine.verifyTenantChain(tenantId);
    expect(report.isValid).toBe(true);
    expect(report.totalEntries).toBe(2);
    expect(report.tamperedSequenceNumber).toBeNull();
  });

  it("should detect tampering when an audit entry payload is modified", () => {
    const chainEngine = new SOC2AuditLogImmutableHashChain(secret);

    chainEngine.appendEvent({
      tenantId,
      eventType: "KEY_ROTATION",
      actorId: "system_kms",
      actorIp: "127.0.0.1",
      resourceId: "kms_root_v1",
      actionDetails: { status: "SUCCESS" }
    });

    chainEngine.appendEvent({
      tenantId,
      eventType: "POLICY_OVERRIDE",
      actorId: "usr_ciso",
      actorIp: "10.0.0.5",
      resourceId: "policy_firewall_bypass",
      actionDetails: { reason: "EMERGENCY_PROD_DEPLOY" }
    });

    // Directly tamper with raw memory state
    const chain = (chainEngine as any).chainByTenant.get(tenantId);
    chain[1].actorId = "attacker_imposter";

    const report = chainEngine.verifyTenantChain(tenantId);
    expect(report.isValid).toBe(false);
    expect(report.tamperedSequenceNumber).toBe(2);
    expect(report.verificationMessage).toContain("altered");
  });
});
