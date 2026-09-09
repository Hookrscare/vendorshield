/**
 * Regression tests for QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor.
 */

import { describe, it, expect } from "vitest";
import {
  ZkKeyCustodyRotationMonitor,
  TenantKeyCustodyPolicy
} from "./zk-key-custody-rotation-monitor";

describe("ZkKeyCustodyRotationMonitor", () => {
  const monitor = new ZkKeyCustodyRotationMonitor();

  it("evaluates healthy key custody with satisfied quorum and valid age", () => {
    const policy: TenantKeyCustodyPolicy = {
      tenantId: "tenant-acme-corp",
      keyId: "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123",
      provider: "AWS_KMS",
      algorithm: "AES-256-GCM",
      createdDateIso: "2026-08-01T00:00:00Z",
      maxAgeDays: 90,
      rotationWarningWindowDays: 14,
      quorumThresholdK: 2,
      totalCustodiansN: 3,
      custodians: [
        { custodianId: "sec-01", custodianRole: "SECURITY_OFFICER", hasAcknowledged: true, lastHeartbeatIso: "2026-09-01T00:00:00Z" },
        { custodianId: "comp-01", custodianRole: "COMPLIANCE_LEAD", hasAcknowledged: true, lastHeartbeatIso: "2026-09-01T00:00:00Z" },
        { custodianId: "infra-01", custodianRole: "INFRA_ADMIN", hasAcknowledged: false, lastHeartbeatIso: "2026-08-15T00:00:00Z" }
      ]
    };

    const res = monitor.evaluateCustody(policy, "2026-09-09T00:00:00Z");
    expect(res.rotationState).toBe("HEALTHY");
    expect(res.quorumSatisfied).toBe(true);
    expect(res.activeCustodiansCount).toBe(2);
    expect(res.keyAgeDays).toBe(39);
    expect(res.daysRemainingBeforeRotation).toBe(51);
    expect(res.attestationSha256).toHaveLength(64);
  });

  it("detects quorum deficit when custodian acknowledgments fall below threshold", () => {
    const policy: TenantKeyCustodyPolicy = {
      tenantId: "tenant-fintech-bank",
      keyId: "gcp-projects/fintech/locations/us/keyRings/hsm/cryptoKeys/kek",
      provider: "GCP_KMS",
      algorithm: "AES-256-GCM",
      createdDateIso: "2026-08-20T00:00:00Z",
      maxAgeDays: 90,
      rotationWarningWindowDays: 14,
      quorumThresholdK: 3,
      totalCustodiansN: 3,
      custodians: [
        { custodianId: "sec-01", custodianRole: "SECURITY_OFFICER", hasAcknowledged: true, lastHeartbeatIso: "2026-09-01T00:00:00Z" },
        { custodianId: "comp-01", custodianRole: "COMPLIANCE_LEAD", hasAcknowledged: false, lastHeartbeatIso: "2026-08-15T00:00:00Z" },
        { custodianId: "infra-01", custodianRole: "INFRA_ADMIN", hasAcknowledged: false, lastHeartbeatIso: "2026-08-15T00:00:00Z" }
      ]
    };

    const res = monitor.evaluateCustody(policy, "2026-09-09T00:00:00Z");
    expect(res.rotationState).toBe("QUORUM_DEFICIT");
    expect(res.quorumSatisfied).toBe(false);
    expect(res.recommendedAction).toContain("QUORUM_ACTION_REQUIRED");
  });

  it("detects overdue key rotation and flags emergency status", () => {
    const policy: TenantKeyCustodyPolicy = {
      tenantId: "tenant-health-corp",
      keyId: "azure-kv-vault-health/keys/hipaa-master",
      provider: "AZURE_KEY_VAULT",
      algorithm: "AES-256-GCM",
      createdDateIso: "2026-05-01T00:00:00Z",
      maxAgeDays: 90,
      rotationWarningWindowDays: 14,
      quorumThresholdK: 1,
      totalCustodiansN: 2,
      custodians: [
        { custodianId: "sec-01", custodianRole: "SECURITY_OFFICER", hasAcknowledged: true, lastHeartbeatIso: "2026-09-01T00:00:00Z" }
      ]
    };

    const res = monitor.evaluateCustody(policy, "2026-09-09T00:00:00Z"); // > 130 days
    expect(res.rotationState).toBe("CRITICAL_OVERDUE");
    expect(res.daysRemainingBeforeRotation).toBeLessThan(0);
    expect(res.recommendedAction).toContain("EMERGENCY_ROTATION_REQUIRED");
  });
});
