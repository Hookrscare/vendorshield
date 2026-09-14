import { describe, it, expect } from "vitest";
import {
  MultiTenantAuditLogRfc6962Witness,
  MerkleInclusionProof
} from "./multi-tenant-audit-log-rfc6962-transparency-witness";

describe("QA-115: MultiTenantAuditLogRfc6962Witness", () => {
  it("verifies valid RFC 6962 leaf inclusion proof", () => {
    const leaf0 = MultiTenantAuditLogRfc6962Witness.computeLeafHash("LOG_ENTRY_0:USER_LOGIN");
    const leaf1 = MultiTenantAuditLogRfc6962Witness.computeLeafHash("LOG_ENTRY_1:KEY_ROTATION");
    const root = MultiTenantAuditLogRfc6962Witness.computeNodeHash(leaf0, leaf1);

    const proof: MerkleInclusionProof = {
      leafIndex: 0,
      treeSize: 2,
      leafHash: leaf0,
      rootHash: root,
      auditPath: [{ position: "RIGHT", hash: leaf1 }]
    };

    expect(MultiTenantAuditLogRfc6962Witness.verifyInclusionProof(proof)).toBe(true);
  });

  it("detects tampered leaf data or forged audit path", () => {
    const leaf0 = MultiTenantAuditLogRfc6962Witness.computeLeafHash("LOG_ENTRY_0:USER_LOGIN");
    const leaf1 = MultiTenantAuditLogRfc6962Witness.computeLeafHash("LOG_ENTRY_1:KEY_ROTATION");
    const root = MultiTenantAuditLogRfc6962Witness.computeNodeHash(leaf0, leaf1);

    const forgedProof: MerkleInclusionProof = {
      leafIndex: 0,
      treeSize: 2,
      leafHash: MultiTenantAuditLogRfc6962Witness.computeLeafHash("TAMPERED_LOG_ENTRY"),
      rootHash: root,
      auditPath: [{ position: "RIGHT", hash: leaf1 }]
    };

    expect(MultiTenantAuditLogRfc6962Witness.verifyInclusionProof(forgedProof)).toBe(false);
  });

  it("generates signed tree head witness attestation", () => {
    const att = MultiTenantAuditLogRfc6962Witness.generateWitnessAttestation(
      "tenant-enterprise-bank",
      1500,
      "a".repeat(64),
      "kms-witness-key-01"
    );

    expect(att.attestationToken.startsWith("sth_wit_")).toBe(true);
    expect(att.timestampIso).toBeDefined();
  });

  it("validates empty tenant id", () => {
    expect(() =>
      MultiTenantAuditLogRfc6962Witness.generateWitnessAttestation("", 10, "abc", "key")
    ).toThrow("tenantId cannot be empty.");
  });
});
