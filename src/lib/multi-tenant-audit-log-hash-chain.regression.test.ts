import { describe, it, expect } from "vitest";
import {
  MultiTenantAuditLogHashChain,
  AuditLogEntry
} from "./multi-tenant-audit-log-hash-chain";

describe("MultiTenantAuditLogHashChain (QA-115)", () => {
  const secretKey = "enterprise_soc2_audit_chain_hmac_secret_2026";
  const tenantId = "TENANT-ACME-CORP";

  it("should append sequential entries and verify an unbroken hash chain", () => {
    let lastEntry: AuditLogEntry | null = null;
    const chain: AuditLogEntry[] = [];

    const actions = [
      { actor: "usr_alice", action: "SUB_PROCESSOR_ADD", res: "sp_aws_s3" },
      { actor: "usr_bob", action: "DPA_POLICY_UPDATE", res: "dpa_gdpr_v4" },
      { actor: "usr_charlie", action: "ENCRYPTION_KEY_ROTATE", res: "kms_us_east" }
    ];

    for (const a of actions) {
      const entry = MultiTenantAuditLogHashChain.appendEntry(
        tenantId,
        a.actor,
        a.action,
        a.res,
        lastEntry,
        secretKey,
        { ip: "192.0.2.1" }
      );
      chain.push(entry);
      lastEntry = entry;
    }

    expect(chain).toHaveLength(3);
    expect(chain[0].sequenceNumber).toBe(0);
    expect(chain[0].previousHash).toBe(MultiTenantAuditLogHashChain.GENESIS_PREVIOUS_HASH);
    expect(chain[1].sequenceNumber).toBe(1);
    expect(chain[1].previousHash).toBe(chain[0].currentHash);
    expect(chain[2].previousHash).toBe(chain[1].currentHash);

    const verification = MultiTenantAuditLogHashChain.verifyChain(tenantId, chain, secretKey);
    expect(verification.isValid).toBe(true);
    expect(verification.totalEntriesVerified).toBe(3);
    expect(verification.latestChainHash).toBe(chain[2].currentHash);
  });

  it("should detect corrupted payload tampering at specific sequence number", () => {
    let lastEntry: AuditLogEntry | null = null;
    const chain: AuditLogEntry[] = [];

    for (let i = 0; i < 4; i++) {
      const entry = MultiTenantAuditLogHashChain.appendEntry(
        tenantId,
        `usr_${i}`,
        "VENDOR_EVALUATE",
        `vnd_${i}`,
        lastEntry,
        secretKey
      );
      chain.push(entry);
      lastEntry = entry;
    }

    // Tamper with payload of entry 2
    chain[2].action = "MALICIOUS_UNAUTHORIZED_OVERWRITE";

    const verification = MultiTenantAuditLogHashChain.verifyChain(tenantId, chain, secretKey);
    expect(verification.isValid).toBe(false);
    expect(verification.corruptedSequenceNumber).toBe(2);
    expect(verification.failureReason).toContain("Payload mutation");
  });

  it("should detect deleted or reordered records in the chain", () => {
    let lastEntry: AuditLogEntry | null = null;
    const chain: AuditLogEntry[] = [];

    for (let i = 0; i < 4; i++) {
      const entry = MultiTenantAuditLogHashChain.appendEntry(
        tenantId,
        `usr_${i}`,
        "ACCESS_GRANT",
        `res_${i}`,
        lastEntry,
        secretKey
      );
      chain.push(entry);
      lastEntry = entry;
    }

    // Delete record at index 1 (adversary attempting to hide audit record)
    const truncatedChain = [chain[0], chain[2], chain[3]];

    const verification = MultiTenantAuditLogHashChain.verifyChain(tenantId, truncatedChain, secretKey);
    expect(verification.isValid).toBe(false);
    expect(verification.corruptedSequenceNumber).toBe(2);
    expect(verification.failureReason).toContain("Sequence break");
  });
});
