/**
 * QA-192: Zero-Trust Microsegmentation WireGuard Overlay Network Mesh Validator
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements ephemeral session key lifespan monitoring, post-quantum pre-shared key (PSK)
 * rotation enforcement, and replay attack anti-counter window validation for WireGuard
 * and Zero-Trust Network Access (ZTNA) overlay fabrics.
 */

import { createHash } from "crypto";

export interface PeerSessionTelemetry {
  peerId: string;
  enclaveTenantId: string;
  sessionAgeSeconds: number;
  totalTransferredBytes: number;
  hasPostQuantumPsk: boolean;
  pskAgeDays: number;
  currentNonceCounter: number;
  highestObservedNonce: number;
}

export interface RekeyActionPlan {
  peerId: string;
  rekeyMandatory: boolean;
  rekeyUrgency: "ROUTINE" | "URGENT" | "CRITICAL_SESSION_EXPIRED";
  reasons: string[];
  postQuantumCompliance: boolean;
  tamperProofAuditSha256: string;
}

export class ZeroTrustPeerCryptographicRekeyOrchestrator {
  private static readonly MAX_SESSION_AGE_SECONDS = 180; // Noise protocol rekey threshold
  private static readonly MAX_TRANSFER_BYTES_BEFORE_REKEY = 1024 * 1024 * 1024; // 1 GiB
  private static readonly MAX_PSK_AGE_DAYS = 30; // SOC 2 / NIST 800-53 PSK rotation schedule

  /**
   * Evaluates peer session telemetry and orchestrates cryptographic rekeying.
   */
  public static evaluateSessionRekeyNeeds(session: PeerSessionTelemetry): RekeyActionPlan {
    if (!session.peerId || !session.peerId.trim()) {
      throw new Error("peerId cannot be empty.");
    }
    if (!session.enclaveTenantId || !session.enclaveTenantId.trim()) {
      throw new Error("enclaveTenantId cannot be empty.");
    }

    const reasons: string[] = [];
    let rekeyUrgency: "ROUTINE" | "URGENT" | "CRITICAL_SESSION_EXPIRED" = "ROUTINE";
    let rekeyMandatory = false;

    // 1. Session age check
    if (session.sessionAgeSeconds >= this.MAX_SESSION_AGE_SECONDS) {
      rekeyMandatory = true;
      rekeyUrgency = "CRITICAL_SESSION_EXPIRED";
      reasons.push(`Session age (${session.sessionAgeSeconds}s) exceeds maximum allowed lifespan (${this.MAX_SESSION_AGE_SECONDS}s).`);
    }

    // 2. Transferred bytes threshold
    if (session.totalTransferredBytes >= this.MAX_TRANSFER_BYTES_BEFORE_REKEY) {
      rekeyMandatory = true;
      if (rekeyUrgency !== "CRITICAL_SESSION_EXPIRED") {
        rekeyUrgency = "URGENT";
      }
      reasons.push(`Data transfer (${(session.totalTransferredBytes / (1024 * 1024)).toFixed(1)} MiB) exceeds 1 GiB safety ceiling.`);
    }

    // 3. Post-Quantum PSK check
    const postQuantumCompliant = session.hasPostQuantumPsk && session.pskAgeDays <= this.MAX_PSK_AGE_DAYS;
    if (!session.hasPostQuantumPsk) {
      reasons.push("Missing post-quantum pre-shared key (PQ-PSK). Vulnerable to harvest-now-decrypt-later attacks.");
    } else if (session.pskAgeDays > this.MAX_PSK_AGE_DAYS) {
      rekeyMandatory = true;
      if (rekeyUrgency === "ROUTINE") {
        rekeyUrgency = "URGENT";
      }
      reasons.push(`PQ-PSK age (${session.pskAgeDays} days) exceeds 30-day rotation mandate.`);
    }

    // 4. Anti-replay counter sanity
    if (session.currentNonceCounter < session.highestObservedNonce - 2000) {
      rekeyMandatory = true;
      rekeyUrgency = "CRITICAL_SESSION_EXPIRED";
      reasons.push("Potential packet replay anomaly detected outside sliding window.");
    }

    const auditHash = createHash("sha256")
      .update(`${session.peerId}:${session.enclaveTenantId}:${rekeyMandatory}:${rekeyUrgency}:${postQuantumCompliant}`)
      .digest("hex");

    return {
      peerId: session.peerId,
      rekeyMandatory,
      rekeyUrgency,
      reasons,
      postQuantumCompliance: postQuantumCompliant,
      tamperProofAuditSha256: auditHash
    };
  }
}
