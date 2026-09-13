import { describe, it, expect } from "vitest";
import {
  MultiCloudEphemeralIamSessionQuorumArbiter,
  EphemeralSessionRequest,
  SecurityOfficerSignature
} from "./multi-cloud-ephemeral-iam-session-quorum-arbiter";

describe("QA-183: MultiCloudEphemeralIamSessionQuorumArbiter Regression Suite", () => {
  const authorizedOfficers = ["sec-officer-alice", "sec-officer-bob", "ciso-carol"];
  const arbiter = new MultiCloudEphemeralIamSessionQuorumArbiter({
    requiredQuorumM: 2,
    authorizedOfficersN: authorizedOfficers,
    maxLeaseMinutes: 120
  });

  const baseRequest: EphemeralSessionRequest = {
    sessionId: "sess-prod-incident-902",
    provider: "AWS",
    targetRoleArn: "arn:aws:iam::123456789012:role/EmergencyBreakGlassAdmin",
    requesterIdentity: "dev-lead@enterprise.com",
    justification: "Critical RDS failover stuck during database split-brain recovery",
    leaseDurationMinutes: 60
  };

  it("authorizes session when M-of-N (2 of 3) quorum is satisfied", () => {
    const signatures: SecurityOfficerSignature[] = [
      { officerId: "sec-officer-alice", signature: "a1b2c3d4e5f67890abcdef1234567890", timestamp: "2026-09-13T16:00:00Z" },
      { officerId: "ciso-carol", signature: "99887766554433221100aabbccddeeff", timestamp: "2026-09-13T16:01:00Z" }
    ];

    const result = arbiter.evaluateAndAuthorizeSession(baseRequest, signatures);
    expect(result.isApproved).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(result.validApprovalsCount).toBe(2);
    expect(result.remainingMinutes).toBe(60);
    expect(result.auditAttestationDigest).toHaveLength(64);
  });

  it("rejects authorization when quorum is not met (1 of 2 required)", () => {
    const insufficientSignatures: SecurityOfficerSignature[] = [
      { officerId: "sec-officer-bob", signature: "1234567890abcdef1234567890abcdef", timestamp: "2026-09-13T16:00:00Z" }
    ];

    const result = arbiter.evaluateAndAuthorizeSession(baseRequest, insufficientSignatures);
    expect(result.isApproved).toBe(false);
    expect(result.status).toBe("QUORUM_NOT_MET");
    expect(result.validApprovalsCount).toBe(1);
    expect(result.remainingMinutes).toBe(0);
  });

  it("supports immediate session revocation and blocks subsequent authorization", () => {
    const revokeDigest = arbiter.revokeSession("sess-prod-incident-902", "ciso-carol", "Incident mitigated");
    expect(revokeDigest).toHaveLength(64);
    expect(arbiter.isSessionRevoked("sess-prod-incident-902")).toBe(true);

    const signatures: SecurityOfficerSignature[] = [
      { officerId: "sec-officer-alice", signature: "a1b2c3d4e5f67890abcdef1234567890", timestamp: "2026-09-13T16:00:00Z" },
      { officerId: "sec-officer-bob", signature: "1234567890abcdef1234567890abcdef", timestamp: "2026-09-13T16:00:00Z" }
    ];

    const result = arbiter.evaluateAndAuthorizeSession(baseRequest, signatures);
    expect(result.isApproved).toBe(false);
    expect(result.status).toBe("REVOKED");
  });

  it("enforces maximum lease duration bounds", () => {
    const excessiveRequest: EphemeralSessionRequest = {
      ...baseRequest,
      sessionId: "sess-excessive-time",
      leaseDurationMinutes: 180 // Max is 120
    };

    expect(() => arbiter.evaluateAndAuthorizeSession(excessiveRequest, [])).toThrow(
      "Lease duration must be between 1 and 120 minutes."
    );
  });
});
