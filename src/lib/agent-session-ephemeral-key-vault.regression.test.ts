import { describe, it, expect } from 'vitest';
import { AgentSessionEphemeralKeyVault } from './agent-session-ephemeral-key-vault';

describe('QA-157: AgentSessionEphemeralKeyVault Regression Suite', () => {
  it('initializes ephemeral session key with hash chaining and bounds', () => {
    const vault = new AgentSessionEphemeralKeyVault(900, 50);
    const session = vault.createSession('agent-omega', 'tenant-acme');

    expect(session.sessionId).toMatch(/^sess_[a-f0-9]{24}$/);
    expect(session.agentId).toBe('agent-omega');
    expect(session.tenantId).toBe('tenant-acme');
    expect(session.status).toBe('ACTIVE');
    expect(session.rotationHash).toBeDefined();
    expect(session.operationCount).toBe(0);
    expect(session.maxOperations).toBe(50);
  });

  it('attests and cryptographically verifies agent actions', () => {
    const vault = new AgentSessionEphemeralKeyVault(900, 10);
    const session = vault.createSession('agent-alpha', 'tenant-shield');

    const proof = vault.attestAction(session.sessionId, 'READ_DATABASE');
    expect(proof.sessionId).toBe(session.sessionId);
    expect(proof.actionId).toBe('READ_DATABASE');
    expect(proof.operationIndex).toBe(1);
    expect(proof.signature).toBeDefined();

    const isValid = vault.verifyAttestation(proof);
    expect(isValid).toBe(true);

    // Tampered proof detection
    const tamperedProof = { ...proof, actionId: 'DROP_DATABASE' };
    expect(vault.verifyAttestation(tamperedProof)).toBe(false);
  });

  it('automatically rotates session when quota is exhausted and preserves hash chain', () => {
    const vault = new AgentSessionEphemeralKeyVault(900, 2);
    const session = vault.createSession('agent-worker', 'tenant-corp');

    vault.attestAction(session.sessionId, 'ACTION_1');
    vault.attestAction(session.sessionId, 'ACTION_2'); // quota reached (2/2), triggers rotation

    const oldSession = vault.getSession(session.sessionId);
    expect(oldSession).toBeUndefined(); // rotated out of active sessions

    const ledger = vault.getRotationLedger();
    expect(ledger.length).toBe(1);
    expect(ledger[0].status).toBe('ROTATED');
    expect(ledger[0].sessionId).toBe(session.sessionId);
  });

  it('supports explicit kill-switch revocation of ephemeral sessions', () => {
    const vault = new AgentSessionEphemeralKeyVault(900, 100);
    const session = vault.createSession('agent-risky', 'tenant-corp');

    const revoked = vault.revokeSession(session.sessionId);
    expect(revoked).toBe(true);

    expect(() => {
      vault.attestAction(session.sessionId, 'ANY_ACTION');
    }).toThrow(/not found/);
  });
});
