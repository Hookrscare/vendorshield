/**
 * QA-145: Continuous Zero-Knowledge Encrypted Key Custody Rotation Monitor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Continuously monitors enterprise tenant key custody, multi-custodian quorum
 * threshold states (Shamir k-of-n), and cryptographic lifecycle compliance
 * conforming to SOC 2 CC6.1, CC6.6, CC6.7 and ISO 27001:2022 A.8.24.
 */

import { createHash } from "crypto";

export type KeyCustodyProvider = "AWS_KMS" | "GCP_KMS" | "AZURE_KEY_VAULT" | "HASHICORP_VAULT";
export type KeyRotationState = "HEALTHY" | "ROTATION_DUE" | "CRITICAL_OVERDUE" | "QUORUM_DEFICIT" | "REVOKED";

export interface CustodianShare {
  custodianId: string;
  custodianRole: "SECURITY_OFFICER" | "COMPLIANCE_LEAD" | "INFRA_ADMIN";
  hasAcknowledged: boolean;
  lastHeartbeatIso: string;
}

export interface TenantKeyCustodyPolicy {
  tenantId: string;
  keyId: string;
  provider: KeyCustodyProvider;
  algorithm: "AES-256-GCM" | "RSA-4096" | "ECDSA-P384";
  createdDateIso: string;
  maxAgeDays: number;
  rotationWarningWindowDays: number;
  quorumThresholdK: number;
  totalCustodiansN: number;
  custodians: CustodianShare[];
}

export interface CustodyEvaluationResult {
  tenantId: string;
  keyId: string;
  provider: KeyCustodyProvider;
  keyAgeDays: number;
  daysRemainingBeforeRotation: number;
  activeCustodiansCount: number;
  quorumSatisfied: boolean;
  rotationState: KeyRotationState;
  recommendedAction: string;
  attestationSha256: string;
}

export class ZkKeyCustodyRotationMonitor {
  /**
   * Evaluates a tenant's cryptographic key custody and rotation compliance.
   */
  public evaluateCustody(
    policy: TenantKeyCustodyPolicy,
    currentDateIso?: string
  ): CustodyEvaluationResult {
    const now = currentDateIso ? new Date(currentDateIso).getTime() : Date.now();
    const createdTime = new Date(policy.createdDateIso).getTime();
    const ageMs = Math.max(0, now - createdTime);
    const keyAgeDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const daysRemaining = policy.maxAgeDays - keyAgeDays;

    // Check custodian quorum acknowledgment
    const activeCustodians = policy.custodians.filter(c => c.hasAcknowledged).length;
    const quorumSatisfied = activeCustodians >= policy.quorumThresholdK;

    let rotationState: KeyRotationState = "HEALTHY";
    let recommendedAction = "KEY_LIFECYCLE_COMPLIANT";

    if (!quorumSatisfied) {
      rotationState = "QUORUM_DEFICIT";
      recommendedAction = `QUORUM_ACTION_REQUIRED: Active custodians (${activeCustodians}) below threshold (${policy.quorumThresholdK}/${policy.totalCustodiansN}).`;
    } else if (daysRemaining < 0) {
      rotationState = "CRITICAL_OVERDUE";
      recommendedAction = `EMERGENCY_ROTATION_REQUIRED: Key age (${keyAgeDays}d) exceeded policy limit (${policy.maxAgeDays}d).`;
    } else if (daysRemaining <= policy.rotationWarningWindowDays) {
      rotationState = "ROTATION_DUE";
      recommendedAction = `SCHEDULE_KEY_ROTATION: Key rotation window active (${daysRemaining}d remaining).`;
    }

    const payload = `${policy.tenantId}:${policy.keyId}:${policy.provider}:${keyAgeDays}:${rotationState}:${quorumSatisfied}`;
    const attestationSha256 = createHash("sha256").update(payload).digest("hex");

    return {
      tenantId: policy.tenantId,
      keyId: policy.keyId,
      provider: policy.provider,
      keyAgeDays,
      daysRemainingBeforeRotation: daysRemaining,
      activeCustodiansCount: activeCustodians,
      quorumSatisfied,
      rotationState,
      recommendedAction,
      attestationSha256
    };
  }

  /**
   * Generates a batch custody summary across all tenant keyrings.
   */
  public evaluateBatch(
    policies: TenantKeyCustodyPolicy[],
    currentDateIso?: string
  ): {
    totalEvaluated: number;
    healthyCount: number;
    atRiskCount: number;
    results: CustodyEvaluationResult[];
  } {
    const results = policies.map(p => this.evaluateCustody(p, currentDateIso));
    const healthyCount = results.filter(r => r.rotationState === "HEALTHY").length;
    const atRiskCount = results.length - healthyCount;

    return {
      totalEvaluated: results.length,
      healthyCount,
      atRiskCount,
      results
    };
  }
}
