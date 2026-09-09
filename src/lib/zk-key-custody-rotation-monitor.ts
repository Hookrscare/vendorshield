/**
 * QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Provides enterprise-wide monitoring of cryptographic key custody and rotation:
 * - Multi-tenant Key Custody Auditing across AWS KMS, GCP KMS, Azure Key Vault, and Vault HSMs.
 * - Enforces NIST SP 800-57, SOC 2 CC6.1/CC6.6, and PCI-DSS 3.6 key lifecycle constraints.
 * - Tracks rotation countdowns: Warning (<= 30 days), Urgent (<= 7 days), Expired (> 90 days).
 * - Validates M-of-N Split Knowledge & Dual-Control Custody Quorum policies.
 * - Produces CISO-ready Key Custody Compliance Scorecards and immutably hashed audit reports.
 */

import { createHash } from "crypto";

export type HSMProvider = "AWS_KMS" | "GCP_CLOUD_KMS" | "AZURE_KEY_VAULT" | "HASHICORP_VAULT_HSM";
export type KeyCustodyStatus = "COMPLIANT" | "ROTATION_DUE_SOON" | "OVERDUE_CRITICAL" | "COMPROMISED" | "QUORUM_DEFICIENT";

export interface MonitoredKeyRecord {
  keyId: string;
  tenantId: string;
  hsmProvider: HSMProvider;
  algorithm: "AES-256-GCM" | "RSA-4096" | "ECDSA-P384";
  keyType: "KEK" | "DEK" | "HMAC_SECRET";
  createdAtIso: string;
  lastRotatedIso: string;
  rotationPolicyDays: number;
  encryptionCount: number;
  maxEncryptionThreshold: number;
  custodiansAssigned: string[];
  minimumQuorumRequired: number;
  hsmAttestationVerified: boolean;
  status: "ACTIVE" | "RETIRED" | "REVOKED";
}

export interface KeyAuditEvaluation {
  keyId: string;
  tenantId: string;
  ageDays: number;
  daysRemainingUntilRotation: number;
  custodyStatus: KeyCustodyStatus;
  isExpired: boolean;
  isOverCapacity: boolean;
  isQuorumSatisfied: boolean;
  violations: string[];
  remediationAction: string;
}

export interface CustodyAuditSummary {
  auditId: string;
  timestampIso: string;
  totalKeysMonitored: number;
  compliantCount: number;
  rotationDueSoonCount: number;
  criticalOverdueCount: number;
  quorumDeficientCount: number;
  complianceScorePercent: number;
  isCisoSignoffRequired: boolean;
  auditSignatureSha256: string;
  evaluations: KeyAuditEvaluation[];
}

export class ZKKeyCustodyRotationMonitor {
  private warningWindowDays: number;
  private criticalWindowDays: number;

  constructor(warningWindowDays: number = 30, criticalWindowDays: number = 7) {
    this.warningWindowDays = warningWindowDays;
    this.criticalWindowDays = criticalWindowDays;
  }

  /**
   * Evaluates an individual key record against rotation and custody policies.
   */
  public evaluateKey(key: MonitoredKeyRecord, referenceTimeIso?: string): KeyAuditEvaluation {
    const now = referenceTimeIso ? new Date(referenceTimeIso) : new Date();
    const lastRotated = new Date(key.lastRotatedIso);
    const ageMs = now.getTime() - lastRotated.getTime();
    const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = key.rotationPolicyDays - ageDays;

    const isExpired = daysRemaining < 0;
    const isOverCapacity = key.encryptionCount >= key.maxEncryptionThreshold;
    const isQuorumSatisfied = (
      key.hsmAttestationVerified &&
      key.custodiansAssigned.length >= key.minimumQuorumRequired &&
      key.minimumQuorumRequired >= 2
    );

    const violations: string[] = [];
    let custodyStatus: KeyCustodyStatus = "COMPLIANT";
    let remediationAction = "No action required. Key is within certified rotation and custody bounds.";

    if (key.status === "REVOKED") {
      custodyStatus = "COMPROMISED";
      violations.push("Key has been flagged as REVOKED or COMPROMISED.");
      remediationAction = "Perform emergency cryptographic re-encryption and revoke all dependent sessions immediately.";
    } else if (!isQuorumSatisfied) {
      custodyStatus = "QUORUM_DEFICIENT";
      violations.push("M-of-N dual control split custody requirement not met or HSM attestation missing.");
      remediationAction = "Re-provision custodian key-shares and verify cryptographic HSM attestation.";
    } else if (isExpired || isOverCapacity) {
      custodyStatus = "OVERDUE_CRITICAL";
      if (isExpired) {
        violations.push(`Key age (${ageDays} days) exceeds maximum rotation policy threshold (${key.rotationPolicyDays} days).`);
      }
      if (isOverCapacity) {
        violations.push(`Key encryption count (${key.encryptionCount}) exceeds volume limit (${key.maxEncryptionThreshold}).`);
      }
      remediationAction = "Trigger immediate zero-knowledge key rotation and data re-encryption.";
    } else if (daysRemaining <= this.criticalWindowDays) {
      custodyStatus = "OVERDUE_CRITICAL";
      violations.push(`Key rotation due in ${daysRemaining} days (critical SLA window).`);
      remediationAction = "Schedule urgent automated rotation within 24 hours.";
    } else if (daysRemaining <= this.warningWindowDays) {
      custodyStatus = "ROTATION_DUE_SOON";
      violations.push(`Key rotation window approaching (${daysRemaining} days remaining).`);
      remediationAction = "Queue scheduled rotation in the next maintenance window.";
    }

    return {
      keyId: key.keyId,
      tenantId: key.tenantId,
      ageDays,
      daysRemainingUntilRotation: daysRemaining,
      custodyStatus,
      isExpired,
      isOverCapacity,
      isQuorumSatisfied,
      violations,
      remediationAction
    };
  }

  /**
   * Conducts a comprehensive audit across all monitored keys in the fleet.
   */
  public auditKeyFleet(keys: MonitoredKeyRecord[], referenceTimeIso?: string): CustodyAuditSummary {
    const timestampIso = referenceTimeIso || new Date().toISOString();
    const evaluations = keys.map(k => this.evaluateKey(k, timestampIso));

    let compliantCount = 0;
    let rotationDueSoonCount = 0;
    let criticalOverdueCount = 0;
    let quorumDeficientCount = 0;

    for (const ev of evaluations) {
      if (ev.custodyStatus === "COMPLIANT") compliantCount++;
      else if (ev.custodyStatus === "ROTATION_DUE_SOON") rotationDueSoonCount++;
      else if (ev.custodyStatus === "OVERDUE_CRITICAL" || ev.custodyStatus === "COMPROMISED") criticalOverdueCount++;
      else if (ev.custodyStatus === "QUORUM_DEFICIENT") quorumDeficientCount++;
    }

    const total = keys.length;
    const complianceScorePercent = total > 0
      ? Math.round(((compliantCount + rotationDueSoonCount * 0.5) / total) * 100)
      : 100;

    const isCisoSignoffRequired = criticalOverdueCount > 0 || quorumDeficientCount > 0 || complianceScorePercent < 90;

    const auditId = `CUSTODY-AUDIT-${createHash("sha256").update(timestampIso + total).digest("hex").slice(0, 12).toUpperCase()}`;
    const auditSignatureSha256 = createHash("sha256")
      .update(JSON.stringify({ auditId, timestampIso, total, complianceScorePercent, isCisoSignoffRequired }))
      .digest("hex");

    return {
      auditId,
      timestampIso,
      totalKeysMonitored: total,
      compliantCount,
      rotationDueSoonCount,
      criticalOverdueCount,
      quorumDeficientCount,
      complianceScorePercent,
      isCisoSignoffRequired,
      auditSignatureSha256,
      evaluations
    };
  }
}
