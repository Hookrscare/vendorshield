// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  createAuditLogEntry,
  verifyAuditChain,
  GENESIS_HASH,
  AuditLogEntry,
} from "./audit-chain";

describe("audit-chain (QA-115 Multi-Tenant SOC 2 Audit Log Immutable Hash Chain)", () => {
  it("builds a valid hash chain starting with GENESIS_HASH", () => {
    const e1 = createAuditLogEntry(null, {
      id: "evt-001",
      tenantId: "tenant-acme",
      actor: "sarah@acme.example",
      action: "SUB_PROCESSOR_ADDED",
      target: "AWS US-East",
    });

    expect(e1.sequence).toBe(1);
    expect(e1.previousHash).toBe(GENESIS_HASH);
    expect(e1.hash).toMatch(/^[0-9a-f]{64}$/);

    const e2 = createAuditLogEntry(e1, {
      id: "evt-002",
      tenantId: "tenant-acme",
      actor: "dpo@acme.example",
      action: "DPA_STATUS_CHANGED",
      target: "AWS US-East",
      details: { newStatus: "Signed" },
    });

    expect(e2.sequence).toBe(2);
    expect(e2.previousHash).toBe(e1.hash);

    const e3 = createAuditLogEntry(e2, {
      id: "evt-003",
      tenantId: "tenant-acme",
      actor: "ciso@acme.example",
      action: "WATERMARK_REPORT_GENERATED",
      target: "Palo Alto Networks",
    });

    const chain: AuditLogEntry[] = [e1, e2, e3];
    const verification = verifyAuditChain(chain);

    expect(verification.isValid).toBe(true);
    expect(verification.totalEntries).toBe(3);
  });

  it("detects malicious data tampering in a chained block", () => {
    const e1 = createAuditLogEntry(null, {
      id: "evt-101",
      tenantId: "tenant-acme",
      actor: "auditor@big4.example",
      action: "AUDIT_EXPORT",
      target: "Report-2026.pdf",
    });

    const e2 = createAuditLogEntry(e1, {
      id: "evt-102",
      tenantId: "tenant-acme",
      actor: "admin@acme.example",
      action: "ROLE_CHANGED",
      target: "user-42",
      details: { role: "admin" },
    });

    // Malicious actor modifies payload of e2 without recomputing hash
    const tamperedE2: AuditLogEntry = {
      ...e2,
      actor: "hacker@evil.example", // Tampered!
    };

    const verification = verifyAuditChain([e1, tamperedE2]);

    expect(verification.isValid).toBe(false);
    expect(verification.brokenSequence).toBe(2);
    expect(verification.error).toContain("Hash integrity corrupted");
  });

  it("detects deleted entry or broken sequence", () => {
    const e1 = createAuditLogEntry(null, {
      id: "evt-201",
      tenantId: "tenant-acme",
      actor: "admin",
      action: "LOGIN",
      target: "console",
    });

    const e2 = createAuditLogEntry(e1, {
      id: "evt-202",
      tenantId: "tenant-acme",
      actor: "admin",
      action: "DELETE_VENDOR",
      target: "vendor-x",
    });

    const e3 = createAuditLogEntry(e2, {
      id: "evt-203",
      tenantId: "tenant-acme",
      actor: "admin",
      action: "LOGOUT",
      target: "console",
    });

    // An attacker removes e2 from the audit log
    const corruptedChain = [e1, e3];
    const verification = verifyAuditChain(corruptedChain);

    expect(verification.isValid).toBe(false);
    expect(verification.brokenSequence).toBe(3);
    expect(verification.error).toContain("Sequence mismatch");
  });
});
