import { describe, it, expect } from "vitest";
import {
  ZeroTrustPeerCryptographicRekeyOrchestrator,
  PeerSessionTelemetry
} from "./zero-trust-peer-cryptographic-rekey-orchestrator";

describe("QA-192: ZeroTrustPeerCryptographicRekeyOrchestrator", () => {
  it("evaluates healthy active peer session requiring no rekey", () => {
    const session: PeerSessionTelemetry = {
      peerId: "peer-worker-01",
      enclaveTenantId: "tenant-fintech-prod",
      sessionAgeSeconds: 45,
      totalTransferredBytes: 50 * 1024 * 1024,
      hasPostQuantumPsk: true,
      pskAgeDays: 5,
      currentNonceCounter: 1500,
      highestObservedNonce: 1500
    };

    const plan = ZeroTrustPeerCryptographicRekeyOrchestrator.evaluateSessionRekeyNeeds(session);
    expect(plan.rekeyMandatory).toBe(false);
    expect(plan.rekeyUrgency).toBe("ROUTINE");
    expect(plan.postQuantumCompliance).toBe(true);
    expect(plan.tamperProofAuditSha256).toHaveLength(64);
  });

  it("triggers CRITICAL_SESSION_EXPIRED when Noise handshake age exceeds 180s", () => {
    const session: PeerSessionTelemetry = {
      peerId: "peer-stale-02",
      enclaveTenantId: "tenant-healthcare-phi",
      sessionAgeSeconds: 210,
      totalTransferredBytes: 10 * 1024 * 1024,
      hasPostQuantumPsk: true,
      pskAgeDays: 10,
      currentNonceCounter: 500,
      highestObservedNonce: 500
    };

    const plan = ZeroTrustPeerCryptographicRekeyOrchestrator.evaluateSessionRekeyNeeds(session);
    expect(plan.rekeyMandatory).toBe(true);
    expect(plan.rekeyUrgency).toBe("CRITICAL_SESSION_EXPIRED");
    expect(plan.reasons[0]).toContain("exceeds maximum allowed lifespan");
  });

  it("detects expired PQ-PSK needing rotation", () => {
    const session: PeerSessionTelemetry = {
      peerId: "peer-legacy-psk-03",
      enclaveTenantId: "tenant-analytics",
      sessionAgeSeconds: 60,
      totalTransferredBytes: 10 * 1024,
      hasPostQuantumPsk: true,
      pskAgeDays: 45, // > 30 days
      currentNonceCounter: 100,
      highestObservedNonce: 100
    };

    const plan = ZeroTrustPeerCryptographicRekeyOrchestrator.evaluateSessionRekeyNeeds(session);
    expect(plan.rekeyMandatory).toBe(true);
    expect(plan.postQuantumCompliance).toBe(false);
    expect(plan.rekeyUrgency).toBe("URGENT");
  });

  it("validates empty IDs", () => {
    const invalid: PeerSessionTelemetry = {
      peerId: "",
      enclaveTenantId: "t1",
      sessionAgeSeconds: 10,
      totalTransferredBytes: 0,
      hasPostQuantumPsk: true,
      pskAgeDays: 1,
      currentNonceCounter: 1,
      highestObservedNonce: 1
    };

    expect(() =>
      ZeroTrustPeerCryptographicRekeyOrchestrator.evaluateSessionRekeyNeeds(invalid)
    ).toThrow("peerId cannot be empty.");
  });
});
