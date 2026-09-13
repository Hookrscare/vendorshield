import { describe, it, expect } from 'vitest';
import {
  Soc2EvidenceTimestampingAttestationDaemon,
  EvidencePayload,
} from './soc2-evidence-timestamping-attestation-daemon';

describe('QA-170: Soc2EvidenceTimestampingAttestationDaemon Regression Tests', () => {
  const daemon = new Soc2EvidenceTimestampingAttestationDaemon('enterprise-test-secret-key-xyz');

  const sampleEvidence: EvidencePayload = {
    evidenceId: 'EV-2026-CC6.1-009',
    controlId: 'CC6.1',
    collectedBy: 'automated-scim-audit-collector',
    collectedAtIso: '2026-09-13T11:00:00.000Z',
    payloadContent: {
      activeAdminUsersCount: 4,
      mfaEnforcedPct: 100,
      deprovisionedUsersPast30Days: 12,
    },
  };

  it('creates a tamper-evident attestation seal over valid evidence', () => {
    const seal = daemon.createAttestationSeal(sampleEvidence, 1726225200000, 'test-nonce-1234');
    expect(seal.evidenceId).toBe('EV-2026-CC6.1-009');
    expect(seal.controlId).toBe('CC6.1');
    expect(seal.payloadHashSha256).toHaveLength(64);
    expect(seal.attestationSignature).toHaveLength(64);

    const verification = daemon.verifyAttestationSeal(sampleEvidence, seal);
    expect(verification.isValid).toBe(true);
  });

  it('detects tampering when payload content is modified after attestation', () => {
    const seal = daemon.createAttestationSeal(sampleEvidence, 1726225200000, 'test-nonce-1234');

    // Tampered payload
    const tamperedEvidence: EvidencePayload = {
      ...sampleEvidence,
      payloadContent: {
        ...sampleEvidence.payloadContent,
        activeAdminUsersCount: 1, // Tampered from 4 to 1
      },
    };

    const verification = daemon.verifyAttestationSeal(tamperedEvidence, seal);
    expect(verification.isValid).toBe(false);
    expect(verification.reason).toContain('tampered or altered');
  });

  it('detects unauthorized signature when verified against incorrect signing secret', () => {
    const intruderDaemon = new Soc2EvidenceTimestampingAttestationDaemon('intruder-fake-key');
    const seal = daemon.createAttestationSeal(sampleEvidence);

    const verification = intruderDaemon.verifyAttestationSeal(sampleEvidence, seal);
    expect(verification.isValid).toBe(false);
    expect(verification.reason).toContain('signature validation failed');
  });
});
