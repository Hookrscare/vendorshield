import { describe, it, expect } from "vitest";
import {
  SOC2AuditLogImmutableHashChain,
  AuditLogEntryInput,
} from "./soc2-audit-log-immutable-hash-chain";

describe("QA-115: SOC2AuditLogImmutableHashChain", () => {
  it("initializes an empty tenant chain with valid genesis state", () => {
    const chain = new SOC2AuditLogImmutableHashChain();
    const verification = chain.verifyTenantChain("tenant-alpha");

    expect(verification.isValid).toBe(true);
    expect(verification.totalEntries).toBe(0);
    expect(verification.genesisHash).toHaveLength(64);
    expect(verification.tamperedSequenceNumber).toBeNull();
  });

  it("appends multiple audit events and maintains unbroken cryptographic hash chain", () => {
    const chain = new SOC2AuditLogImmutableHashChain();
    const event1: AuditLogEntryInput = {
      tenantId: "tenant-alpha",
      eventType: "USER_LOGIN",
      actorId: "usr_101",
      actorIp: "192.168.1.50",
      resourceId: "auth_session_01",
      actionDetails: { method: "SAML_SSO", success: true },
    };

    const event2: AuditLogEntryInput = {
      tenantId: "tenant-alpha",
      eventType: "DPA_MODIFIED",
      actorId: "usr_admin",
      actorIp: "10.0.0.1",
      resourceId: "dpa_doc_2026",
      actionDetails: { clause: "subprocessor_notice_period", oldVal: 30, newVal: 60 },
    };

    const sealed1 = chain.appendEvent(event1);
    const sealed2 = chain.appendEvent(event2);

    expect(sealed1.sequenceNumber).toBe(1);
    expect(sealed1.previousHash).toBe(chain.getGenesisHash("tenant-alpha"));
    expect(sealed1.currentHash).toHaveLength(64);

    expect(sealed2.sequenceNumber).toBe(2);
    expect(sealed2.previousHash).toBe(sealed1.currentHash);
    expect(sealed2.currentHash).not.toBe(sealed1.currentHash);

    const report = chain.verifyTenantChain("tenant-alpha");
    expect(report.isValid).toBe(true);
    expect(report.totalEntries).toBe(2);
    expect(report.chainHeadHash).toBe(sealed2.currentHash);
    expect(report.tamperedSequenceNumber).toBeNull();
  });

  it("detects payload tampering and pinpoints the corrupted sequence number", () => {
    const chain = new SOC2AuditLogImmutableHashChain();
    chain.appendEvent({
      tenantId: "tenant-beta",
      eventType: "KEY_ROTATION",
      actorId: "hsm_daemon",
      actorIp: "127.0.0.1",
      resourceId: "key_kms_prod_01",
      actionDetails: { algorithm: "ML-KEM-768" },
    });

    chain.appendEvent({
      tenantId: "tenant-beta",
      eventType: "PERMISSION_GRANT",
      actorId: "sec_officer",
      actorIp: "10.1.2.3",
      resourceId: "role_compliance_auditor",
      actionDetails: { scope: "read_soc2_reports" },
    });

    // Tamper with entry 2
    const trail = chain.getTenantAuditTrail("tenant-beta");
    trail[1].payloadHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const report = chain.verifyTenantChain("tenant-beta");
    expect(report.isValid).toBe(false);
    expect(report.tamperedSequenceNumber).toBe(2);
    expect(report.verificationMessage).toContain("Cryptographic signature mismatch");
  });

  it("enforces tenant isolation between separate tenant ledgers", () => {
    const chain = new SOC2AuditLogImmutableHashChain();
    chain.appendEvent({
      tenantId: "tenant-one",
      eventType: "USER_LOGIN",
      actorId: "usr_1",
      actorIp: "1.1.1.1",
      resourceId: "sess_1",
      actionDetails: {},
    });

    chain.appendEvent({
      tenantId: "tenant-two",
      eventType: "USER_LOGIN",
      actorId: "usr_2",
      actorIp: "2.2.2.2",
      resourceId: "sess_2",
      actionDetails: {},
    });

    const t1Trail = chain.getTenantAuditTrail("tenant-one");
    const t2Trail = chain.getTenantAuditTrail("tenant-two");

    expect(t1Trail.length).toBe(1);
    expect(t2Trail.length).toBe(1);
    expect(t1Trail[0].previousHash).not.toBe(t2Trail[0].previousHash);
  });
});
