import { describe, it, expect } from "vitest";
import {
  ZKKeyCustodyRotationMonitor,
  MonitoredKeyRecord
} from "./zk-key-custody-rotation-monitor";

describe("QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor", () => {
  const monitor = new ZKKeyCustodyRotationMonitor(30, 7);
  const fixedNowIso = "2026-09-09T00:00:00.000Z";

  it("identifies compliant keys with active quorum and valid age", () => {
    const freshKey: MonitoredKeyRecord = {
      keyId: "key-tenant-fresh-01",
      tenantId: "tenant_acme_corp",
      hsmProvider: "AWS_KMS",
      algorithm: "AES-256-GCM",
      keyType: "KEK",
      createdAtIso: "2026-08-15T00:00:00.000Z",
      lastRotatedIso: "2026-08-15T00:00:00.000Z", // 25 days old
      rotationPolicyDays: 90,
      encryptionCount: 15000,
      maxEncryptionThreshold: 1000000,
      custodiansAssigned: ["sec-ops-1@acme.com", "ciso@acme.com"],
      minimumQuorumRequired: 2,
      hsmAttestationVerified: true,
      status: "ACTIVE"
    };

    const res = monitor.evaluateKey(freshKey, fixedNowIso);
    expect(res.custodyStatus).toBe("COMPLIANT");
    expect(res.isExpired).toBe(false);
    expect(res.isQuorumSatisfied).toBe(true);
    expect(res.daysRemainingUntilRotation).toBe(65);
    expect(res.violations).toHaveLength(0);
  });

  it("flags warning when key enters the 30-day rotation window", () => {
    const warningKey: MonitoredKeyRecord = {
      keyId: "key-tenant-warning-02",
      tenantId: "tenant_fintech_global",
      hsmProvider: "GCP_CLOUD_KMS",
      algorithm: "AES-256-GCM",
      keyType: "DEK",
      createdAtIso: "2026-06-25T00:00:00.000Z",
      lastRotatedIso: "2026-06-25T00:00:00.000Z", // 76 days old (14 days remaining <= 30)
      rotationPolicyDays: 90,
      encryptionCount: 200000,
      maxEncryptionThreshold: 500000,
      custodiansAssigned: ["custodian1@fintech.io", "custodian2@fintech.io", "custodian3@fintech.io"],
      minimumQuorumRequired: 2,
      hsmAttestationVerified: true,
      status: "ACTIVE"
    };

    const res = monitor.evaluateKey(warningKey, fixedNowIso);
    expect(res.custodyStatus).toBe("ROTATION_DUE_SOON");
    expect(res.isExpired).toBe(false);
    expect(res.daysRemainingUntilRotation).toBe(14);
  });

  it("detects overdue expired keys and flags critical violation", () => {
    const overdueKey: MonitoredKeyRecord = {
      keyId: "key-tenant-overdue-03",
      tenantId: "tenant_legacy_inc",
      hsmProvider: "HASHICORP_VAULT_HSM",
      algorithm: "RSA-4096",
      keyType: "KEK",
      createdAtIso: "2026-05-01T00:00:00.000Z",
      lastRotatedIso: "2026-05-01T00:00:00.000Z", // 131 days old (past 90-day policy)
      rotationPolicyDays: 90,
      encryptionCount: 50000,
      maxEncryptionThreshold: 500000,
      custodiansAssigned: ["admin@legacy.com", "ops@legacy.com"],
      minimumQuorumRequired: 2,
      hsmAttestationVerified: true,
      status: "ACTIVE"
    };

    const res = monitor.evaluateKey(overdueKey, fixedNowIso);
    expect(res.custodyStatus).toBe("OVERDUE_CRITICAL");
    expect(res.isExpired).toBe(true);
    expect(res.violations.some(v => v.includes("exceeds maximum rotation"))).toBe(true);
  });

  it("detects quorum deficiency when split-custody constraints fail", () => {
    const deficientKey: MonitoredKeyRecord = {
      keyId: "key-tenant-deficient-04",
      tenantId: "tenant_unsecured",
      hsmProvider: "AZURE_KEY_VAULT",
      algorithm: "AES-256-GCM",
      keyType: "KEK",
      createdAtIso: "2026-08-30T00:00:00.000Z",
      lastRotatedIso: "2026-08-30T00:00:00.000Z",
      rotationPolicyDays: 90,
      encryptionCount: 100,
      maxEncryptionThreshold: 500000,
      custodiansAssigned: ["lone-admin@unsecured.com"], // only 1 custodian, minimumQuorum is 2
      minimumQuorumRequired: 2,
      hsmAttestationVerified: true,
      status: "ACTIVE"
    };

    const res = monitor.evaluateKey(deficientKey, fixedNowIso);
    expect(res.custodyStatus).toBe("QUORUM_DEFICIENT");
    expect(res.isQuorumSatisfied).toBe(false);
  });

  it("runs full fleet audit and generates CISO signoff status and cryptographic signature", () => {
    const keys: MonitoredKeyRecord[] = [
      {
        keyId: "k1",
        tenantId: "t1",
        hsmProvider: "AWS_KMS",
        algorithm: "AES-256-GCM",
        keyType: "DEK",
        createdAtIso: "2026-08-20T00:00:00.000Z",
        lastRotatedIso: "2026-08-20T00:00:00.000Z",
        rotationPolicyDays: 90,
        encryptionCount: 100,
        maxEncryptionThreshold: 100000,
        custodiansAssigned: ["a", "b"],
        minimumQuorumRequired: 2,
        hsmAttestationVerified: true,
        status: "ACTIVE"
      },
      {
        keyId: "k2",
        tenantId: "t2",
        hsmProvider: "AWS_KMS",
        algorithm: "AES-256-GCM",
        keyType: "DEK",
        createdAtIso: "2026-05-01T00:00:00.000Z",
        lastRotatedIso: "2026-05-01T00:00:00.000Z",
        rotationPolicyDays: 90,
        encryptionCount: 100,
        maxEncryptionThreshold: 100000,
        custodiansAssigned: ["a", "b"],
        minimumQuorumRequired: 2,
        hsmAttestationVerified: true,
        status: "ACTIVE"
      }
    ];

    const audit = monitor.auditKeyFleet(keys, fixedNowIso);
    expect(audit.totalKeysMonitored).toBe(2);
    expect(audit.compliantCount).toBe(1);
    expect(audit.criticalOverdueCount).toBe(1);
    expect(audit.isCisoSignoffRequired).toBe(true);
    expect(audit.auditSignatureSha256).toHaveLength(64);
  });
});
